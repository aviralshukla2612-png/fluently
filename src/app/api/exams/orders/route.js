import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/payments/razorpay.js";
import { EXAM_PRICE_PAISE, EXAM_CURRENCY } from "@/lib/exams/examTypes.js";

/**
 * POST /api/exams/orders
 * Creates a pending order for purchasing the full IELTS Academic Mock Exam.
 * Enforces server price (19,900 paise = ₹199.00). Client amounts are ignored.
 */
export async function POST(request) {
  try {
    const originCheck = verifySameOrigin(request);
    if (!originCheck.allowed) {
      return NextResponse.json({ success: false, error: originCheck.reason || "Forbidden" }, { status: 403 });
    }

    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required to purchase exams." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const examId = body.examId;

    if (!examId) {
      return NextResponse.json({ success: false, error: "Missing examId." }, { status: 400 });
    }

    const exam = await examRepository.findExamById(examId);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam does not exist." }, { status: 404 });
    }

    if (exam.isDiagnostic) {
      return NextResponse.json({ success: false, error: "Diagnostic exams are free and do not require purchase." }, { status: 400 });
    }

    // Check if user already has an active paid entitlement for this exam
    const existingEntitlement = await examRepository.findActivePaidEntitlement(authUser.userId, examId);
    if (existingEntitlement) {
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        message: "You already have an active paid entitlement for this exam.",
        orderId: existingEntitlement.id,
      });
    }

    // Create Razorpay order (or sandbox reference) with enforced ₹199 (19,900 paise)
    const receipt = `rcpt_${authUser.userId.slice(-6)}_${Date.now()}`;
    const rzpOrder = await createRazorpayOrder({
      receipt,
      amountPaise: EXAM_PRICE_PAISE,
      currency: EXAM_CURRENCY,
    });

    const dbOrder = await examRepository.createOrder({
      userId: authUser.userId,
      examId,
      providerOrderId: rzpOrder.orderId,
      amountPaise: EXAM_PRICE_PAISE,
      currency: EXAM_CURRENCY,
    });

    const rzpConfig = getRazorpayConfig();

    return NextResponse.json({
      success: true,
      orderId: dbOrder.id,
      providerOrderId: rzpOrder.orderId,
      amountPaise: EXAM_PRICE_PAISE,
      amountFormatted: "₹199.00",
      currency: EXAM_CURRENCY,
      keyId: rzpConfig.keyId || "rzp_test_mock_key",
      isTestMode: !rzpConfig.isConfigured,
    });
  } catch (err) {
    console.error("[api/exams/orders] Error creating order:", err);
    return NextResponse.json(
      { success: false, error: "Unable to initialize exam checkout." },
      { status: 500 }
    );
  }
}
