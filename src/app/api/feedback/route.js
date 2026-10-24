import { NextResponse } from "next/server";
import { generateLearningFeedback } from "@/lib/ai/ollamaClient.js";
import { scoreAttempt } from "@/lib/scoring/scoreAttempt.js";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimiter.js";

// Payload limits
const MAX_TEXT_LENGTH = 500;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`feedback:${ip}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many feedback requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON request body.",
          },
        },
        { status: 400 }
      );
    }

    const {
      referenceText,
      transcriptText,
      difficulty,
      contextNote,
    } = body || {};

    // 1. Validate inputs
    if (typeof referenceText !== "string" || !referenceText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REFERENCE",
            message: "A non-empty reference sentence is required.",
          },
        },
        { status: 400 }
      );
    }

    if (referenceText.length > MAX_TEXT_LENGTH || (transcriptText && transcriptText.length > MAX_TEXT_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters.`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Recompute and verify scoring deterministically on the trusted server
    const trustedScore = scoreAttempt(referenceText, transcriptText || "");

    // 3. Do not generate feedback if unscorable
    if (trustedScore.status === "unscorable" || trustedScore.status === "empty_reference") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNSCORABLE_EXERCISE",
            message: "This exercise cannot be scored or evaluated by AI.",
          },
        },
        { status: 422 }
      );
    }

    // 4. Request AI Learning Feedback from Ollama
    const result = await generateLearningFeedback({
      referenceText,
      transcriptText: transcriptText || "",
      scoringResult: trustedScore,
      difficulty: typeof difficulty === "string" ? difficulty.slice(0, 50) : "Intermediate",
      contextNote: typeof contextNote === "string" ? contextNote.slice(0, 200) : "",
    });

    if (!result.success) {
      const statusCode =
        result.error?.code === "TIMEOUT"
          ? 504
          : result.error?.code === "OLLAMA_UNREACHABLE"
          ? 502
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err.message || "An unexpected server error occurred.",
        },
      },
      { status: 500 }
    );
  }
}
