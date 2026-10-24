import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { verifyPaymentSignature, getRazorpayConfig } from "@/lib/payments/razorpay.js";

/**
 * POST /api/payments/razorpay/verify
 * Cryptographically verifies Razorpay payment signature
 * signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 * Idempotently unlocks the exam entitlement.
 */
export async function POST(request) {
  try {
    const originCheck = verifySameOrigin(request);
    if (!originCheck.allowed) {
      return NextResponse.json({ success: false, error: originCheck.reason || "Forbidden" }, { status: 403 });
    }

    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification identifiers." },
        { status: 400 }
      );
    }

    const order = await examRepository.findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Verify user ownership of this order
    if (order.userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized access to order." }, { status: 403 });
    }

    // Idempotent check: if already paid, return success immediately
    if (order.status === "PAID") {
      return NextResponse.json({
        success: true,
        entitlementActive: true,
        message: "Payment already verified.",
      });
    }

    // Verify HMAC-SHA256 signature
    const config = getRazorpayConfig();
    if (config.isConfigured) {
      if (!razorpay_signature) {
        return NextResponse.json({ success: false, error: "Missing payment signature." }, { status: 400 });
      }

      const isValid = verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid payment signature. Verification failed." },
          { status: 400 }
        );
      }
    } else {
      // In sandbox/test mode without API keys, verify test signature or test prefix
      const isTestValid =
        razorpay_signature === "test_signature" ||
        razorpay_order_id.startsWith("order_test_") ||
        razorpay_payment_id.startsWith("pay_test_");

      if (!isTestValid) {
        return NextResponse.json(
          { success: false, error: "Sandbox payment parameters invalid." },
          { status: 400 }
        );
      }
    }

    // Idempotently mark order as PAID and record transaction
    await examRepository.markOrderPaid({
      orderId: order.id,
      providerPaymentId: razorpay_payment_id,
      providerSignature: razorpay_signature || "test_sandbox_verified",
    });

    return NextResponse.json({
      success: true,
      entitlementActive: true,
      examId: order.examId,
      message: "Payment successfully verified and examination entitlement unlocked.",
    });
  } catch (err) {
    console.error("[api/payments/razorpay/verify] Verification error:", err);
    return NextResponse.json(
      { success: false, error: "Payment verification failed." },
      { status: 500 }
    );
  }
}
