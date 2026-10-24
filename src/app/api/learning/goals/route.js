export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { validateGoalInput, evaluateAllGoals } from "@/lib/goals/goalManager.js";

/**
 * GET /api/learning/goals
 * Returns user learning goals with evaluated progress against verified activities
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
    const statusParam = searchParams.get("status") || undefined;

    const [rawGoals, activitiesResult] = await Promise.all([
      userRepository.getLearningGoals(session.userId, { status: statusParam }),
      userRepository.getLearningActivities(session.userId, { limit: 1000 }),
    ]);

    const normalizedActivities = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const evaluatedGoals = evaluateAllGoals(rawGoals, normalizedActivities);

    return NextResponse.json({
      success: true,
      goals: evaluatedGoals,
    });
  } catch (err) {
    console.error("[api/learning/goals] Error fetching goals:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch learning goals." },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/goals
 * Creates a new learning goal for the authenticated user
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Invalid request payload." } },
        { status: 400 }
      );
    }

    const validation = validateGoalInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error } },
        { status: 400 }
      );
    }

    const goal = await userRepository.createLearningGoal(session.userId, body);

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (err) {
    console.error("[api/learning/goals] Error creating goal:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "GOAL_CREATION_FAILED", message: err.message || "Failed to create goal." },
      },
      { status: 400 }
    );
  }
}
