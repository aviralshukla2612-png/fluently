import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../src/lib/payments/razorpay.js";
import { examRepository } from "../src/lib/db/examRepository.js";
import { EXAM_PRICE_PAISE, ORDER_STATUSES } from "../src/lib/exams/examTypes.js";

test("IELTS Mock Exam: Razorpay Payments & Entitlements Suite", async (t) => {
  const testSecret = "test_razorpay_secret_key_123456789";
  const testWebhookSecret = "test_webhook_secret_key_987654321";

  await t.test("4.1: Order creation strictly enforces ₹199 (19,900 paise) server-side", async () => {
    // Attempting to pass custom amount is ignored in favor of EXAM_PRICE_PAISE
    const order = await createRazorpayOrder({
      receipt: "rcpt_test_01",
      amountPaise: 500, // malicious client attempting to pay ₹5
    });

    assert.equal(order.amountPaise, EXAM_PRICE_PAISE);
    assert.equal(order.amountPaise, 19900);
    assert.equal(order.currency, "INR");
    assert.ok(order.orderId);
  });

  await t.test("4.2: Payment signature verification authenticates genuine provider responses", () => {
    const orderId = "order_12345";
    const paymentId = "pay_67890";

    const validSig = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    assert.equal(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSig,
        secret: testSecret,
      }),
      true
    );
  });

  await t.test("4.3: Payment signature rejects tampered order ID or altered signature", () => {
    const orderId = "order_12345";
    const paymentId = "pay_67890";
    const validSig = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Altered order ID
    assert.equal(
      verifyPaymentSignature({
        orderId: "order_different",
        paymentId,
        signature: validSig,
        secret: testSecret,
      }),
      false
    );

    // Altered signature
    const badSig = "0".repeat(64);
    assert.equal(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: badSig,
        secret: testSecret,
      }),
      false
    );

    // Unequal buffer length does not throw RangeError
    assert.equal(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: "short",
        secret: testSecret,
      }),
      false
    );
  });

  await t.test("4.4: Webhook signature verification validates payload authenticity", () => {
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_test_1", order_id: "order_test_1" } },
      },
    });

    const validSig = crypto
      .createHmac("sha256", testWebhookSecret)
      .update(payload)
      .digest("hex");

    assert.equal(
      verifyWebhookSignature({
        rawBody: payload,
        signature: validSig,
        webhookSecret: testWebhookSecret,
      }),
      true
    );

    // Tampered payload
    assert.equal(
      verifyWebhookSignature({
        rawBody: payload + " ",
        signature: validSig,
        webhookSecret: testWebhookSecret,
      }),
      false
    );
  });

  await t.test("4.5: Idempotent payment processing marks order paid once and creates single entitlement", async () => {
    const userId = "usr_payment_test_candidate";
    const examId = "exam_academic_01";

    const dbOrder = await examRepository.createOrder({
      userId,
      examId,
      providerOrderId: "order_rzp_dup_check",
    });

    assert.equal(dbOrder.status, ORDER_STATUSES.PENDING);

    // First payment processing
    const paid1 = await examRepository.markOrderPaid({
      orderId: dbOrder.id,
      providerPaymentId: "pay_rzp_dup_1",
      providerSignature: "sig_dup_1",
    });
    assert.equal(paid1.status, ORDER_STATUSES.PAID);

    // Second duplicated payment event (e.g. concurrent webhook + browser callback)
    const paid2 = await examRepository.markOrderPaid({
      orderId: dbOrder.id,
      providerPaymentId: "pay_rzp_dup_1",
      providerSignature: "sig_dup_1",
    });
    assert.equal(paid2.status, ORDER_STATUSES.PAID);

    // User should have exactly ONE valid entitlement
    const entitlement = await examRepository.findActivePaidEntitlement(userId, examId);
    assert.ok(entitlement);
    assert.equal(entitlement.id, dbOrder.id);
  });
});
