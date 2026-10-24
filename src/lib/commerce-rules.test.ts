import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  validateIndianPinCode,
  validateIndianPhone,
  calculateWholesaleQuote,
  parseProductsCsv,
} from './commerce-rules';
import {
  generateRazorpaySignature,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from './razorpay-crypto';
import {
  hashPassword,
  verifyPassword,
  createSignedSessionToken,
  verifySignedSessionToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  canAccessUserResource,
} from './auth-crypto';

test('calculateCartTotals computes subtotal, free shipping threshold, and savings accurately', () => {
  const belowThreshold = calculateCartTotals([
    { variantId: 1, unitPriceInr: 120, mrpInr: 140, quantity: 2 },
  ]);
  assert.equal(belowThreshold.subtotalInr, 240);
  assert.equal(belowThreshold.mrpTotalInr, 280);
  assert.equal(belowThreshold.savingsInr, 40);
  assert.equal(belowThreshold.shippingInr, 60);
  assert.equal(belowThreshold.totalInr, 300);
  assert.equal(belowThreshold.amountForFreeShippingInr, 259);

  const aboveThreshold = calculateCartTotals([
    { variantId: 1, unitPriceInr: 260, mrpInr: 300, quantity: 2 },
  ]);
  assert.equal(aboveThreshold.subtotalInr, 520);
  assert.equal(aboveThreshold.shippingInr, 0);
  assert.equal(aboveThreshold.totalInr, 520);
  assert.equal(aboveThreshold.amountForFreeShippingInr, 0);
});

test('validateIndianPinCode accepts valid 6-digit PINs and rejects invalid ones', () => {
  const validMaharashtra = validateIndianPinCode('411001');
  assert.equal(validMaharashtra.valid, true);
  assert.ok(validMaharashtra.regionName.includes('Maharashtra'));

  const invalidZeroPrefix = validateIndianPinCode('011001');
  assert.equal(invalidZeroPrefix.valid, false);

  const invalidLength = validateIndianPinCode('4110');
  assert.equal(invalidLength.valid, false);
});

test('validateIndianPhone validates 10-digit Indian mobile numbers', () => {
  assert.equal(validateIndianPhone('+91 98765 43210').valid, true);
  assert.equal(validateIndianPhone('9876543210').cleanPhone, '9876543210');
  assert.equal(validateIndianPhone('1234567890').valid, false);
});

test('verifyRazorpaySignature & verifyRazorpayWebhookSignature perform timing-safe HMAC verification', () => {
  const secret = 'rzp_test_secret_key_999';
  const orderId = 'order_SGMMasale101';
  const paymentId = 'pay_SGMMasale909';

  const validSig = generateRazorpaySignature(orderId, paymentId, secret);
  assert.equal(verifyRazorpaySignature(orderId, paymentId, validSig, secret), true);
  assert.equal(verifyRazorpaySignature(orderId, paymentId, 'bad_signature_hex', secret), false);
  assert.equal(verifyRazorpaySignature(orderId, 'pay_tampered', validSig, secret), false);

  const payload = JSON.stringify({ event: 'payment.captured', order_id: orderId });
  const webhookSig = generateRazorpaySignature(orderId, paymentId, secret);
  assert.equal(verifyRazorpayWebhookSignature(payload, webhookSig, secret), false);
});

test('calculateWholesaleQuote enforces minimum quantity per product and applies volume discounts', () => {
  const belowMoq = calculateWholesaleQuote([
    {
      productId: 1,
      productName: 'Kashmiri Lal Mirch Powder',
      quantityKg: 5,
      minQtyKg: 10,
      baseWholesalePricePerKg: 520,
    },
  ]);
  assert.equal(belowMoq.valid, false);
  assert.equal(belowMoq.errors.length, 1);

  const bulk100kg = calculateWholesaleQuote([
    {
      productId: 1,
      productName: 'Kashmiri Lal Mirch Powder',
      quantityKg: 60,
      minQtyKg: 10,
      baseWholesalePricePerKg: 500,
    },
    {
      productId: 2,
      productName: 'Haldi Powder Salem Grade',
      quantityKg: 40,
      minQtyKg: 10,
      baseWholesalePricePerKg: 300,
    },
  ]);
  assert.equal(bulk100kg.valid, true);
  assert.equal(bulk100kg.totalWeightKg, 100);
  assert.equal(bulk100kg.discountPercent, 10);
  assert.equal(bulk100kg.subtotalInr, 42000);
  assert.equal(bulk100kg.estimatedTotalInr, 37800);
});

test('parseProductsCsv parses valid CSV rows and flags malformed lines', () => {
  const csv = [
    'name,hindiName,category,shortDescription,ingredients,storageInstructions,originRegion,heatLevel,price100g,price250g,price500g,stockQty,wholesaleMinQtyKg,wholesalePricePerKg',
    '"Byadgi Chilli Powder","ब्याडगी मिर्च","Pure Ground Spices","Rich red colour low heat","100% Byadgi Chilli","Store dry","Karnataka","Mild",85,200,380,60,10,640',
  ].join('\n');

  const parsed = parseProductsCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].name, 'Byadgi Chilli Powder');
  assert.equal(parsed.rows[0].packSize250gPrice, 200);
});

test('hashPassword, verifyPassword, createSignedSessionToken, and verifyPasswordResetToken work securely', () => {
  const hashed = hashPassword('SpiceSecret#2026');
  assert.equal(verifyPassword('SpiceSecret#2026', hashed), true);
  assert.equal(verifyPassword('WrongPassword', hashed), false);

  const sessionToken = createSignedSessionToken({
    uid: 'usr_123',
    email: 'customer@sgmmasale.in',
    role: 'customer',
  });
  const verifiedSession = verifySignedSessionToken(sessionToken);
  assert.ok(verifiedSession);
  assert.equal(verifiedSession.uid, 'usr_123');
  assert.equal(verifySignedSessionToken(`${sessionToken}tampered`), null);

  const reset = generatePasswordResetToken();
  assert.equal(verifyPasswordResetToken(reset.rawCode, reset.tokenHash, reset.expiresAt), true);
  assert.equal(verifyPasswordResetToken('000000', reset.tokenHash, reset.expiresAt), false);
  assert.equal(
    verifyPasswordResetToken(reset.rawCode, reset.tokenHash, new Date(Date.now() - 1000)),
    false
  );
});

test('canAccessUserResource enforces strict row-level ownership between customers', () => {
  assert.equal(canAccessUserResource('uid_alice', 'uid_alice', 'customer'), true);
  assert.equal(canAccessUserResource('uid_alice', 'uid_bob', 'customer'), false);
  assert.equal(canAccessUserResource('', 'uid_bob', 'customer'), false);
  assert.equal(canAccessUserResource('uid_admin', 'uid_bob', 'admin'), true);
});
