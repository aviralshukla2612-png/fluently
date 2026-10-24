export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { evaluateAchievements } from "@/lib/achievements/achievementEngine.js";

/**
 * GET /api/learning/achievements
 * Evaluates achievement unlocks, persists newly unlocked achievements,
 * and returns user milestones, points, and badge statuses.
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

    const [unlockedRecords, activitiesResult] = await Promise.all([
      userRepository.getUserAchievements(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 1000 }),
    ]);

    const normalizedActivities = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const evaluation = evaluateAchievements({
      activities: normalizedActivities,
      unlockedAchievements: unlockedRecords,
    });

    // Automatically persist any newly verified unlocks
    if (evaluation.newlyUnlocked.length > 0) {
      for (const item of evaluation.newlyUnlocked) {
        await userRepository.unlockUserAchievement(session.userId, item.achievementId, {
          name: item.name,
          points: item.points,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...evaluation,
    });
  } catch (err) {
    console.error("[api/learning/achievements] Error evaluating achievements:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to evaluate achievements." },
      },
      { status: 500 }
    );
  }
}
