export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import {
  generateAdaptiveDailyPlan,
  evaluateAdaptivePlan,
  ALLOWED_TIME_BUDGETS,
  DEFAULT_TIME_BUDGET,
} from "@/lib/learning/dailyLearningPlan.js";
import { toLocalDateString } from "@/lib/learning/progressService.js";

/**
 * GET /api/learning/daily-plan
 * Retrieves or generates the user's adaptive daily plan for today and evaluates current progress.
 */
export async function GET(request) {
  try {
    const session = getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetMinutesParam = searchParams.get("targetMinutes");

    const [preferences, activitiesResult] = await Promise.all([
      userRepository.getUserPreferences(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 1000 }),
    ]);

    const targetMinutes = targetMinutesParam && ALLOWED_TIME_BUDGETS.includes(Number(targetMinutesParam))
      ? Number(targetMinutesParam)
      : preferences?.dailyTargetMinutes || DEFAULT_TIME_BUDGET;

    const normalized = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const todayStr = toLocalDateString(new Date());
    const existingPlanRecord = await userRepository.getDailyPlan(session.userId, todayStr);

    let plan;
    if (existingPlanRecord && existingPlanRecord.tasks) {
      plan = {
        planId: `plan_${todayStr}_${targetMinutes}m`,
        date: todayStr,
        targetMinutes,
        tasks: typeof existingPlanRecord.tasks === "string"
          ? JSON.parse(existingPlanRecord.tasks)
          : existingPlanRecord.tasks,
        estimatedMinutes: Array.isArray(existingPlanRecord.tasks)
          ? existingPlanRecord.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
          : targetMinutes,
      };
    } else {
      const weaknesses = detectWeaknesses(normalized);
      plan = generateAdaptiveDailyPlan({
        activities: normalized,
        weaknesses,
        targetMinutes,
      });

      // Persist generated plan
      await userRepository.upsertDailyPlan(session.userId, {
        planDate: todayStr,
        tasks: plan.tasks,
        completedState: {},
      });
    }

    const evaluation = evaluateAdaptivePlan(plan, normalized);

    return NextResponse.json({
      success: true,
      plan,
      evaluation,
    });
  } catch (err) {
    console.error("[api/learning/daily-plan] Error handling daily plan GET:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to load daily plan." },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/daily-plan
 * Regenerate or customize the daily learning plan
 */
export async function POST(request) {
  try {
    const session = getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const targetMinutes = body.targetMinutes && ALLOWED_TIME_BUDGETS.includes(Number(body.targetMinutes))
      ? Number(body.targetMinutes)
      : DEFAULT_TIME_BUDGET;

    const { items = [] } = await userRepository.getLearningActivities(session.userId, {
      limit: 1000,
    });

    const normalized = items.map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(normalized);
    const plan = generateAdaptiveDailyPlan({
      activities: normalized,
      weaknesses,
      targetMinutes,
    });

    const todayStr = toLocalDateString(new Date());

    // Update preferences if targetMinutes changed
    await userRepository.updateUserPreferences(session.userId, {
      dailyTargetMinutes: targetMinutes,
    });

    // Save regenerated plan
    await userRepository.upsertDailyPlan(session.userId, {
      planDate: todayStr,
      tasks: plan.tasks,
      completedState: {},
    });

    const evaluation = evaluateAdaptivePlan(plan, normalized);

    return NextResponse.json({
      success: true,
      plan,
      evaluation,
    });
  } catch (err) {
    console.error("[api/learning/daily-plan] Error handling daily plan POST:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to regenerate daily plan." },
      },
      { status: 500 }
    );
  }
}
