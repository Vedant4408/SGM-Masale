import crypto from 'crypto';

/**
 * Generates an HMAC-SHA256 signature for Razorpay order + payment verification.
 */
export function generateRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

/**
 * Timing-safe server-side verification of Razorpay payment signature.
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !secret) {
    return false;
  }
  const expected = generateRazorpaySignature(razorpayOrderId, razorpayPaymentId, secret);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || a.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Timing-safe verification of Razorpay webhook payload signature (`X-Razorpay-Signature`).
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || a.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
