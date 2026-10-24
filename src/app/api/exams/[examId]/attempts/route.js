import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { ensureBaselineExamsSeeded } from "@/lib/exams/seedData/index.js";

/**
 * POST /api/exams/[examId]/attempts
 * Starts a new exam attempt for the authenticated user.
 * - Free diagnostic: Starts immediately without purchase.
 * - Full Mock (₹199): Checks that user possesses a verified PAID entitlement.
 */
export async function POST(request, { params }) {
  try {
    const originCheck = verifySameOrigin(request);
    if (!originCheck.allowed) {
      return NextResponse.json({ success: false, error: originCheck.reason || "Forbidden" }, { status: 403 });
    }

    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required to start an examination." }, { status: 401 });
    }

    await ensureBaselineExamsSeeded();
    const resolvedParams = await params;
    const examId = resolvedParams?.examId;

    const exam = await examRepository.findExamById(examId);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Examination not found." }, { status: 404 });
    }

    let orderId = null;

    if (!exam.isDiagnostic) {
      // Must have a verified paid entitlement
      const entitlement = await examRepository.findActivePaidEntitlement(authUser.userId, exam.id);
      if (!entitlement) {
        return NextResponse.json(
          {
            success: false,
            paymentRequired: true,
            error: "Payment required. Please purchase this mock test (₹199) to begin.",
          },
          { status: 402 }
        );
      }
      orderId = entitlement.id;
    }

    const attempt = await examRepository.createAttempt({
      userId: authUser.userId,
      examId: exam.id,
      orderId,
      isDiagnostic: exam.isDiagnostic,
      durationMinutes: exam.durationMinutes,
    });

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      durationMinutes: exam.durationMinutes,
    });
  } catch (err) {
    console.error("[api/exams/[examId]/attempts] Start attempt error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to initialize examination attempt." },
      { status: 500 }
    );
  }
}
