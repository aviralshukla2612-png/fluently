import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { examRepository } from "@/lib/db/examRepository.js";

/**
 * GET /api/exams/attempts/[attemptId]
 * Retrieves candidate's active attempt state, remaining seconds, saved responses,
 * and client-safe questions.
 */
export async function GET(request, { params }) {
  try {
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

    // Verify User Ownership (IDOR defense)
    if (attempt.userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized access to this attempt." }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(attempt.expiresAt);
    const isExpired = now.getTime() > expiresAt.getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    // Get client safe exam questions
    const clientSafeExam = await examRepository.findClientSafeExamById(attempt.examId);

    // Map existing saved responses to an easy client dictionary: { [questionId]: responseValue }
    const savedResponses = {};
    for (const r of attempt.responses || []) {
      savedResponses[r.questionId] = r.responseValue;
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        status: isExpired && attempt.status !== "COMPLETED" && attempt.status !== "SUBMITTED" ? "EXPIRED" : attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds,
        isExpired,
        isDiagnostic: attempt.isDiagnostic,
        currentSection: attempt.currentSection,
        overallBandScore: attempt.overallBandScore,
      },
      exam: clientSafeExam,
      savedResponses,
    });
  } catch (err) {
    console.error("[api/exams/attempts/[attemptId]] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to load attempt state." }, { status: 500 });
  }
}
