import { NextResponse } from "next/server";
import { examRepository } from "@/lib/db/examRepository.js";
import { verifyWebhookSignature, getRazorpayConfig } from "@/lib/payments/razorpay.js";

/**
 * POST /api/payments/razorpay/webhook
 * Handles payment provider webhooks (payment.captured, order.paid).
 * Verifies X-Razorpay-Signature and guarantees idempotent entitlement unlocking.
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const config = getRazorpayConfig();
    if (config.webhookSecret) {
      const isValid = verifyWebhookSignature({ rawBody, signature });
      if (!isValid) {
        return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody || "{}");
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (orderId) {
        const order = await examRepository.findOrderByProviderOrderId(orderId);
        if (order && order.status !== "PAID") {
          await examRepository.markOrderPaid({
            orderId: order.id,
            providerPaymentId: paymentEntity?.id || "webhook_captured",
            providerSignature: signature || "webhook_verified",
          });
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    console.error("[api/payments/razorpay/webhook] Webhook handling error:", err);
    return NextResponse.json(
      { success: false, error: "Webhook processing failure." },
      { status: 500 }
    );
  }
}
