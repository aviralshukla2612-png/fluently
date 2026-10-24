import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { isAttemptActive } from "@/lib/exams/examTypes.js";
import { countWords } from "@/lib/exams/scoring/objectiveGrader.js";

/**
 * POST /api/exams/attempts/[attemptId]/autosave
 * Autosaves candidate responses in real-time.
 * Strictly verifies ownership and server-calculated deadline.
 */
export async function POST(request, { params }) {
  try {
    const originCheck = verifySameOrigin(request);
    if (!originCheck.allowed) {
      return NextResponse.json({ success: false, error: originCheck.reason || "Forbidden" }, { status: 403 });
    }

    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const attemptId = resolvedParams?.attemptId;

    const attempt = await examRepository.findAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found." }, { status: 404 });
    }

    if (attempt.userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
    }

    // Server-enforced deadline check
    const now = Date.now();
    const expiresAtMs = new Date(attempt.expiresAt).getTime();
    if (now > expiresAtMs) {
      await examRepository.updateAttempt(attemptId, { status: "EXPIRED" });
      return NextResponse.json({ success: false, error: "Examination period has expired.", isExpired: true }, { status: 410 });
    }

    if (!isAttemptActive(attempt.status)) {
      return NextResponse.json(
        { success: false, error: `Attempt is in ${attempt.status} state and cannot accept edits.` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const responses = Array.isArray(body.responses) ? body.responses : [];

    const preparedResponses = responses.map((r) => ({
      sectionType: r.sectionType || "GENERAL",
      questionId: r.questionId,
      responseValue: typeof r.responseValue === "string" ? r.responseValue : JSON.stringify(r.responseValue || ""),
      wordCount: typeof r.responseValue === "string" ? countWords(r.responseValue) : 0,
    }));

    await examRepository.saveResponses(attemptId, preparedResponses);

    return NextResponse.json({
      success: true,
      savedCount: preparedResponses.length,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/exams/attempts/[attemptId]/autosave] Autosave error:", err);
    return NextResponse.json({ success: false, error: "Autosave failed." }, { status: 500 });
  }
}
