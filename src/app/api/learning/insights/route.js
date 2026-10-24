export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { computeLearningAnalytics } from "@/lib/learning/learningAnalytics.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { generateLearningInsights } from "@/lib/ai/learningInsightsPrompt.js";

/**
 * GET /api/learning/insights
 * Generates an encouraging, evidence-grounded AI learning summary via Ollama
 * with a guaranteed deterministic fallback if Ollama is offline.
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

    const [userPrefs, activitiesResult] = await Promise.all([
      userRepository.getUserPreferences(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 1000 }),
    ]);

    const normalized = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const analytics = computeLearningAnalytics(normalized);
    const weaknesses = detectWeaknesses(normalized);
    const language = userPrefs?.preferredLanguage || "en";

    const insights = await generateLearningInsights({
      analytics,
      weaknesses,
      language,
    });

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (err) {
    console.error("[api/learning/insights] Error generating insights:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to generate learning insights." },
      },
      { status: 500 }
    );
  }
}
