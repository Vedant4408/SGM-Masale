'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface RazorpayModalConfig {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  keyId: string;
  razorpayOrderId: string;
  amountInr: number;
  testCredentials: {
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
}

interface RazorpayCheckoutModalProps {
  config: RazorpayModalConfig | null;
  onClose: () => void;
  onVerifiedSuccess: (orderData: any) => void;
}

export function RazorpayCheckoutModal({
  config,
  onClose,
  onVerifiedSuccess,
}: RazorpayCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [verifying, setVerifying] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!config) return null;

  const handleServerVerifiedPayment = async (tamperSignature = false) => {
    setVerifying(true);
    setErrorMessage(null);
    setSecurityMessage(null);

    try {
      const res = await fetch('/api/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: config.orderNumber,
          razorpayOrderId: config.razorpayOrderId,
          razorpayPaymentId: config.testCredentials.razorpayPaymentId,
          razorpaySignature: tamperSignature
            ? '000000000000000000000000000000000000000000000000000000000000dead'
            : config.testCredentials.razorpaySignature,
          method: `razorpay_test_${selectedMethod}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Payment verification failed on server.');
        setVerifying(false);
        return;
      }

      setSecurityMessage('HMAC-SHA256 signature verified on server. Order marked Paid.');
      setTimeout(() => {
        setVerifying(false);
        onVerifiedSuccess(data.order);
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error verifying payment.');
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rzp-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#FED7AA]">
        {/* Razorpay Test Mode Header — Orange & White Primary */}
        <div className="bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-[#FFF7ED] font-semibold">
              Razorpay Checkout · Test Mode
            </div>
            <h3 id="rzp-modal-title" className="font-serif text-lg font-bold mt-0.5">
              SGM Masale Official Store
            </h3>
            <div className="text-xs text-[#FFEDD5] font-mono tabular-nums mt-0.5">
              Order: {config.orderNumber} · {config.razorpayOrderId}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono tabular-nums text-2xl font-bold text-white">
              ₹{config.amountInr}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel payment"
              className="mt-1 inline-flex items-center gap-1 text-xs text-[#FFEDD5] hover:text-white"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-stone-800">
          <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs text-[#9A3412] leading-relaxed">
            <strong>Test Mode Active:</strong> No real money is charged. Payment status is verified
            on the server via HMAC-SHA256 (`order_id|payment_id`) before stock is deducted or the
            order is marked paid.
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Select Test Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'upi', label: 'UPI / QR' },
                  { id: 'card', label: 'Card' },
                  { id: 'netbanking', label: 'Netbanking' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    selectedMethod === m.id
                      ? 'border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-[#FED7AA]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {selectedMethod === 'upi' && (
            <div>
              <label
                htmlFor="rzp-upi-input"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Test VPA / UPI ID
              </label>
              <input
                id="rzp-upi-input"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono focus:outline-none focus:border-[#EA580C]"
              />
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs font-mono text-stone-700 space-y-1">
              <div>Test Card: 4111 •••• •••• 1111</div>
              <div>Expiry: 12/29 · CVV: ••• (Razorpay Test Visa)</div>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs text-stone-700">
              Selected Bank: <strong>State Bank of India (Test Sandbox)</strong>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {securityMessage && (
            <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
              <span>{securityMessage}</span>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleServerVerifiedPayment(false)}
              className="w-full py-3.5 px-5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:bg-stone-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Lock className="w-4 h-4 text-white" />
              <span>
                {verifying
                  ? 'Verifying Signature on Server...'
                  : `Authorize Test Payment · ₹${config.amountInr}`}
              </span>
            </button>

            <button
              type="button"
              disabled={verifying}
              onClick={() => handleServerVerifiedPayment(true)}
              className="w-full py-2 px-4 rounded-xl border border-[#FED7AA] hover:bg-[#FFF7ED] text-stone-700 text-xs font-medium transition-colors"
            >
              Simulate Tampered Signature (Verify Server Rejects Spoofed Payment)
            </button>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              Server-Side HMAC-SHA256 Verified
            </span>
            <span className="font-mono">Key: {config.keyId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
