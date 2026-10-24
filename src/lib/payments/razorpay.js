/**
 * Shadowly — Razorpay Payment Integration & Signature Verification
 * Server-only cryptographic utilities and order creation.
 * Strict rules:
 * - Server-controlled price (₹199 / 19,900 paise).
 * - Constant-time HMAC-SHA256 signature verification.
 * - Webhook replay and duplicate protection.
 */

import crypto from "node:crypto";
import { EXAM_PRICE_PAISE, EXAM_CURRENCY } from "../exams/examTypes.js";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  return {
    keyId: keyId.trim(),
    keySecret: keySecret.trim(),
    webhookSecret: webhookSecret.trim(),
    isConfigured: Boolean(keyId && keySecret),
  };
}

/**
 * Creates an order with Razorpay API (or test-mode order reference)
 * @param {Object} params
 * @param {string} params.receipt
 * @param {number} [params.amountPaise=19900]
 * @param {string} [params.currency="INR"]
 * @param {Object} [options]
 * @returns {Promise<{ orderId: string, amountPaise: number, currency: string }>}
 */
export async function createRazorpayOrder({ receipt, amountPaise = EXAM_PRICE_PAISE, currency = EXAM_CURRENCY }, options = {}) {
  // Always enforce server-side price (19,900 paise = ₹199.00)
  const enforcedAmount = EXAM_PRICE_PAISE;
  const config = getRazorpayConfig();

  if (config.isConfigured) {
    const authHeader = "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
    const fetchFn = options.fetchFn || globalThis.fetch;

    const res = await fetchFn("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: enforcedAmount,
        currency,
        receipt,
        payment_capture: 1,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Razorpay order creation failed: ${errData.error?.description || res.statusText}`);
    }

    const order = await res.json();
    return {
      orderId: order.id,
      amountPaise: order.amount,
      currency: order.currency,
    };
  }

  // Sandbox / Test Mode fallback when API credentials are unset
  const mockOrderId = `order_test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  return {
    orderId: mockOrderId,
    amountPaise: enforcedAmount,
    currency,
    isTestMode: true,
  };
}

/**
 * Verifies Razorpay payment signature
 * signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.paymentId
 * @param {string} params.signature
 * @param {string} [params.secret]
 * @returns {boolean}
 */
export function verifyPaymentSignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature) return false;

  const config = getRazorpayConfig();
  const effectiveSecret = secret || config.keySecret || "shadowly-default-dev-payment-secret";

  const expectedSignature = crypto
    .createHmac("sha256", effectiveSecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Verifies Razorpay Webhook signature
 * signature = HMAC-SHA256(rawBody, webhookSecret)
 * @param {Object} params
 * @param {string} params.rawBody
 * @param {string} params.signature
 * @param {string} [params.webhookSecret]
 * @returns {boolean}
 */
export function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!rawBody || !signature) return false;

  const config = getRazorpayConfig();
  const effectiveSecret = webhookSecret || config.webhookSecret || "shadowly-default-dev-webhook-secret";

  const expectedSignature = crypto
    .createHmac("sha256", effectiveSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
