export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { determineAdaptiveDifficulty } from "@/lib/learning/adaptiveDifficulty.js";
import { generateRecommendations } from "@/lib/learning/learningRecommendations.js";

/**
 * GET /api/learning/practice/recommendation
 * Returns tailored recommendation for the next smart practice session
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

    const [preferences, activitiesResult, goals] = await Promise.all([
      userRepository.getUserPreferences(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 100 }),
      userRepository.getLearningGoals(session.userId, { status: "active" }),
    ]);

    const activities = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(activities);
    const standardRecs = generateRecommendations(weaknesses);

    // Prioritize top weakness or active goal
    const topWeakness = weaknesses.length > 0 ? weaknesses[0] : null;
    const targetSkill = topWeakness ? topWeakness.module : (goals[0]?.skill || "grammar");

    const difficultyAdaptation = determineAdaptiveDifficulty({
      activities,
      skill: targetSkill,
      currentDifficulty: preferences.learningLevel || "intermediate",
      weakness: topWeakness,
    });

    return NextResponse.json({
      success: true,
      recommendation: {
        skill: targetSkill,
        targetConcept: topWeakness ? topWeakness.topicName : "Fundamental Sentence Patterns",
        recommendedDifficulty: difficultyAdaptation.recommendedDifficulty,
        reason: topWeakness
          ? `Addressing identified challenge in ${topWeakness.category} (${topWeakness.evidence})`
          : "Maintaining balanced daily language practice",
        difficultyReason: difficultyAdaptation.reason,
        priority: topWeakness?.severity || "normal",
        standardRecommendations: standardRecs.slice(0, 3),
      },
    });
  } catch (err) {
    console.error("[api/learning/practice/recommendation] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch practice recommendation." },
      },
      { status: 500 }
    );
  }
}
