export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { checkRateLimit } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { determineAdaptiveDifficulty } from "@/lib/learning/adaptiveDifficulty.js";
import { generatePracticeExercise } from "@/lib/learning/adaptivePracticeGenerator.js";
import { createSignedExerciseToken, prepareClientExercise } from "@/lib/learning/practiceEvaluator.js";

/**
 * POST /api/learning/practice/generate
 * Generates an adaptive, level-tailored practice exercise with a signed verification token
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

    // Rate limiting: 15 generations per minute per user
    const rateCheck = checkRateLimit(`practice_gen:${session.userId}`, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many exercise generation requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      skill = "grammar",
      targetConcept,
      difficulty,
      exerciseType = "grammar",
      questionCount = 3,
    } = body;

    // Fetch user preferences and learning activity to calibrate difficulty
    const [preferences, activitiesResult] = await Promise.all([
      userRepository.getUserPreferences(session.userId),
      userRepository.getLearningActivities(session.userId, { limit: 100 }),
    ]);

    const activities = (activitiesResult.items || []).map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(activities);
    const skillWeakness = weaknesses.find((w) => w.module === skill);

    // Determine adaptive difficulty
    const difficultyAdaptation = determineAdaptiveDifficulty({
      activities,
      skill,
      currentDifficulty: difficulty || preferences.learningLevel || "intermediate",
      weakness: skillWeakness,
    });

    const activeDifficulty = difficulty || difficultyAdaptation.recommendedDifficulty;

    const result = await generatePracticeExercise({
      skill,
      targetConcept: targetConcept || skillWeakness?.topicName || "Core Competency Practice",
      difficulty: activeDifficulty,
      exerciseType,
      questionCount,
      level: preferences.learningLevel || "intermediate",
      language: preferences.preferredLanguage || "en",
    });

    // Create cryptographically signed token with expected answers bound to user
    const signedToken = createSignedExerciseToken(result.exercise, { userId: session.userId });

    // Prepare client-safe representation (answer keys stripped)
    const clientSafeExercise = prepareClientExercise(result.exercise, signedToken);

    return NextResponse.json({
      success: true,
      exercise: clientSafeExercise,
      difficultyAdaptation,
      source: result.source,
    });
  } catch (err) {
    console.error("[api/learning/practice/generate] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to generate smart practice exercise." },
      },
      { status: 500 }
    );
  }
}
