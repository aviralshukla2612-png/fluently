export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { checkRateLimit } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { buildLearnerContext, explainErrorOrConcept } from "@/lib/ai/learningCoach.js";

/**
 * POST /api/learning/coach/explain
 * Request personalized AI coach explanation for a specific mistake or grammar concept
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

    // Rate limiting: 15 explanation requests per minute per user
    const rateCheck = checkRateLimit(`coach_exp:${session.userId}`, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many coach requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be a JSON object." } },
        { status: 400 }
      );
    }

    const { question, userAnswer, correctAnswer, skill = "grammar", concept, contextNote } = body;

    // Fetch user preferences and learning history
    const [preferences, activitiesResult, goals] = await Promise.all([
      userRepository.getUserPreferences(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 50 }),
      userRepository.getLearningGoals(session.userId, { status: "active" }),
    ]);

    const activities = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(activities);

    const learnerContext = buildLearnerContext({
      activities,
      preferences,
      weaknesses,
      goals,
      currentMistake: userAnswer,
    });

    const result = await explainErrorOrConcept(
      {
        question,
        userAnswer,
        correctAnswer,
        skill,
        concept,
        contextNote,
      },
      learnerContext
    );

    return NextResponse.json({
      success: true,
      coachResponse: result.coachResponse,
      source: result.source,
    });
  } catch (err) {
    console.error("[api/learning/coach/explain] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to generate coaching explanation." },
      },
      { status: 500 }
    );
  }
}
