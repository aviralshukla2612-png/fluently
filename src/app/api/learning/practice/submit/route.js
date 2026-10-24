export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { checkRateLimit } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { evaluatePracticeSubmission } from "@/lib/learning/practiceEvaluator.js";
import { determineAdaptiveDifficulty } from "@/lib/learning/adaptiveDifficulty.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";

// Global submission cache to prevent concurrent race conditions
const submissionCache = globalThis.__shadowly_submissionCache || new Map();
if (!globalThis.__shadowly_submissionCache) {
  globalThis.__shadowly_submissionCache = submissionCache;
}

/**
 * POST /api/learning/practice/submit
 * Submits learner answers, evaluates them deterministically using the signed token,
 * records the activity exactly once, and calculates updated difficulty adaptation.
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

    // Rate limiting: 30 submissions per minute per user
    const rateCheck = checkRateLimit(`practice_sub:${session.userId}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be a valid JSON object." } },
        { status: 400 }
      );
    }

    const { exerciseToken, userAnswers = {}, durationSeconds = 60, sessionId } = body;

    if (!exerciseToken) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_TOKEN", message: "exerciseToken is required." } },
        { status: 400 }
      );
    }

    // Evaluate answers deterministically against signed token with bound user check
    const evalResult = evaluatePracticeSubmission({
      exerciseToken,
      userAnswers,
      userId: session.userId,
    });

    if (!evalResult.success) {
      return NextResponse.json(
        { success: false, error: evalResult.error },
        { status: 400 }
      );
    }

    const { evaluation } = evalResult;
    const effectiveSessionId = sessionId || evaluation.tokenId || `sess_${evaluation.exerciseId}`;
    const cacheKey = `${session.userId}:${effectiveSessionId}`;

    // Replay cache check
    if (submissionCache.has(cacheKey)) {
      const cached = submissionCache.get(cacheKey);
      return NextResponse.json({
        success: true,
        evaluation: cached.evaluation,
        difficultyAdaptation: cached.difficultyAdaptation,
        isDuplicateSubmission: true,
        activity: cached.activity,
      });
    }

    // Check existing activities in repository
    const existingActivitiesResult = await userRepository.getLearningActivities(session.userId, { limit: 100 });
    const existingItems = existingActivitiesResult.items || [];

    const isDuplicate = existingItems.some((a) => {
      const meta = typeof a.metadata === "string" ? JSON.parse(a.metadata || "{}") : a.metadata;
      return meta?.sessionId === effectiveSessionId;
    });

    let savedActivity = null;

    if (!isDuplicate) {
      savedActivity = await userRepository.createLearningActivity(session.userId, {
        module: evaluation.skill,
        exerciseId: evaluation.exerciseId,
        score: evaluation.score,
        duration: Math.max(1, Number(durationSeconds) || 60),
        difficulty: evaluation.difficulty,
        status: "completed",
        metadata: {
          sessionId: effectiveSessionId,
          tokenId: evaluation.tokenId,
          title: evaluation.title,
          targetConcept: evaluation.targetConcept,
          isSmartPractice: true,
          totalQuestions: evaluation.totalQuestions,
          correctCount: evaluation.correctCount,
        },
      });
    }

    // Refresh activities to calculate next difficulty recommendation
    const updatedActivities = [
      ...(savedActivity ? [savedActivity] : []),
      ...existingItems,
    ].map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(updatedActivities);
    const skillWeakness = weaknesses.find((w) => w.module === evaluation.skill);

    const difficultyAdaptation = determineAdaptiveDifficulty({
      activities: updatedActivities,
      skill: evaluation.skill,
      currentDifficulty: evaluation.difficulty,
      weakness: skillWeakness,
    });

    const responseData = {
      success: true,
      evaluation,
      difficultyAdaptation,
      isDuplicateSubmission: isDuplicate,
      activity: savedActivity,
    };

    // Cache the completed submission for subsequent replay requests
    submissionCache.set(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("[api/learning/practice/submit] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to evaluate practice attempt." },
      },
      { status: 500 }
    );
  }
}
