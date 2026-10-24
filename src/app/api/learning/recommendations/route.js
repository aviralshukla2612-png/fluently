export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { computeLearningAnalytics } from "@/lib/learning/learningAnalytics.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { generateRecommendations } from "@/lib/learning/learningRecommendations.js";

/**
 * GET /api/learning/recommendations
 * Returns prioritized actionable learning recommendations mapped to verified application routes.
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

    const { items = [] } = await userRepository.getLearningActivities(session.userId, {
      limit: 1000,
    });

    const normalized = items.map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const analytics = computeLearningAnalytics(normalized);
    const weaknesses = detectWeaknesses(normalized);
    const recommendations = generateRecommendations(weaknesses, analytics);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (err) {
    console.error("[api/learning/recommendations] Error generating recommendations:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to generate recommendations." },
      },
      { status: 500 }
    );
  }
}
