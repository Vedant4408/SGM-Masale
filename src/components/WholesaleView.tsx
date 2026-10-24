'use client';

import React, { useState, useMemo } from 'react';
import { Building2, CheckCircle2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ProductDto } from './ProductDetailModal';
import { calculateWholesaleQuote } from '../lib/commerce-rules';

interface WholesaleViewProps {
  products: ProductDto[];
  preselectedProduct?: ProductDto | null;
  idToken?: string | null;
}

export function WholesaleView({ products, preselectedProduct, idToken }: WholesaleViewProps) {
  const [selectedRows, setSelectedRows] = useState<
    Array<{ productId: number; quantityKg: number }>
  >(() => {
    if (preselectedProduct) {
      return [
        {
          productId: preselectedProduct.id,
          quantityKg: preselectedProduct.wholesaleMinQtyKg || 10,
        },
      ];
    }
    const first = products[0];
    const second = products[1];
    const initial: Array<{ productId: number; quantityKg: number }> = [];
    if (first) initial.push({ productId: first.id, quantityKg: first.wholesaleMinQtyKg || 10 });
    if (second) initial.push({ productId: second.id, quantityKg: second.wholesaleMinQtyKg || 10 });
    return initial;
  });

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail Kirana / Supermarket');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const quote = useMemo(() => {
    const input = selectedRows
      .map((r) => {
        const p = productMap.get(Number(r.productId));
        if (!p) return null;
        return {
          productId: p.id,
          productName: p.name,
          quantityKg: Number(r.quantityKg) || 0,
          minQtyKg: p.wholesaleMinQtyKg || 10,
          baseWholesalePricePerKg: p.wholesalePricePerKg || 420,
        };
      })
      .filter(Boolean) as Array<{
      productId: number;
      productName: string;
      quantityKg: number;
      minQtyKg: number;
      baseWholesalePricePerKg: number;
    }>;

    return calculateWholesaleQuote(input);
  }, [selectedRows, productMap]);

  const handleAddRow = () => {
    const unused = products.find((p) => !selectedRows.some((r) => r.productId === p.id));
    const target = unused || products[0];
    if (!target) return;
    setSelectedRows((prev) => [
      ...prev,
      { productId: target.id, quantityKg: target.wholesaleMinQtyKg || 10 },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setSelectedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!quote.valid) {
      setErrorMsg(quote.errors.join(' '));
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessName,
          businessType,
          contactName,
          phone,
          email,
          city,
          state,
          pinCode,
          gstNumber,
          notes,
          items: selectedRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit wholesale enquiry.');
      } else {
        setSubmittedEnquiry(data.enquiry);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error submitting enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header — Orange & White Primary with Subtle Green Badge */}
      <div className="bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 sm:p-10 border border-[#C2410C] shadow-md">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white font-semibold bg-white/15 px-3 py-1 rounded-md border border-white/25">
          <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
          <span>SGM Masale · B2B & HoReCa Division</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-balance">
          Wholesale & Bulk Supply for Retailers, Restaurants & Supermarkets
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#FFF7ED] max-w-2xl leading-relaxed">
          Direct factory dispatch across India in 5 kg food-grade liners, 25 kg HDPE master bags, or
          retail-ready hanger pouches. Volume slab discounts automatically apply at 50 kg+ (5% off)
          and 100 kg+ (10% off).
        </p>
        <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-white font-mono font-bold">MOQ: 5 kg – 10 kg</span>
            <p className="text-[#FFEDD5] mt-0.5">Configurable per variety across all 48 spices</p>
          </div>
          <div>
            <span className="text-white font-mono font-bold">50 kg+ Tier: 5% Extra Off</span>
            <p className="text-[#FFEDD5] mt-0.5">Ideal for restaurants, caterers & kirana stores</p>
          </div>
          <div>
            <span className="text-white font-mono font-bold">100 kg+ Tier: 10% Extra Off</span>
            <p className="text-[#FFEDD5] mt-0.5">Supermarkets, regional stockists & institutional</p>
          </div>
        </div>
      </div>

      {submittedEnquiry ? (
        <div className="bg-white border border-[#15803D] rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#15803D] mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
            Wholesale Enquiry Registered — {submittedEnquiry.enquiryNumber}
          </h2>
          <p className="text-sm text-[#44403C] max-w-xl mx-auto">
            Thank you, <strong>{submittedEnquiry.contactName}</strong> (
            {submittedEnquiry.businessName}). Your bulk requirement for{' '}
            <strong className="font-mono text-[#EA580C]">₹{submittedEnquiry.estimatedTotalInr}</strong> (indicative
            ex-factory wholesale estimate) has been saved to our database and flagged for our B2B
            sales desk.
          </p>
          <button
            type="button"
            onClick={() => setSubmittedEnquiry(null)}
            className="px-5 py-2.5 rounded-xl bg-[#EA580C] text-white text-xs font-semibold hover:bg-[#C2410C]"
          >
            Submit Another Bulk Enquiry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Bulk Calculator */}
          <div className="lg:col-span-7 bg-white border border-[#FED7AA] rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#FED7AA] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                  1. Configure Bulk Spice Quantities
                </h2>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Select from all 48 SGM Masale varieties. Minimum wholesale quantity is enforced
                  per item.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3.5 py-2 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-[#EA580C] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Variety
              </button>
            </div>

            <div className="space-y-3">
              {selectedRows.map((row, idx) => {
                const prod = productMap.get(Number(row.productId));
                const minKg = prod?.wholesaleMinQtyKg || 10;
                const rateKg = prod?.wholesalePricePerKg || 420;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-[#57534E] mb-1">
                        Spice Variety
                      </label>
                      <select
                        aria-label={`Select wholesale spice variety ${idx + 1}`}
                        value={row.productId}
                        onChange={(e) => {
                          const nextId = Number(e.target.value);
                          const nextProd = productMap.get(nextId);
                          setSelectedRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    productId: nextId,
                                    quantityKg: Math.max(
                                      r.quantityKg,
                                      nextProd?.wholesaleMinQtyKg || 10
                                    ),
                                  }
                                : r
                            )
                          );
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#FED7AA] text-xs font-medium text-[#1C1917]"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.wholesalePricePerKg}/kg · Min {p.wholesaleMinQtyKg}kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-[#57534E] mb-1">
                        Quantity (kg) · Min {minKg}kg
                      </label>
                      <input
                        type="number"
                        min={1}
                        aria-label={`Quantity in kg for row ${idx + 1}`}
                        value={row.quantityKg}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, quantityKg: val } : r))
                          );
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#FED7AA] text-xs font-mono tabular-nums font-semibold text-[#1C1917]"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <div className="text-[11px] text-[#57534E]">Line Est.</div>
                      <div className="font-mono tabular-nums text-xs font-bold text-[#EA580C]">
                        ₹{rateKg * (Number(row.quantityKg) || 0)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        aria-label={`Remove wholesale row ${idx + 1}`}
                        className="p-2 text-stone-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!quote.valid && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                {quote.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Wholesale Quote Summary Box */}
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] space-y-2 text-sm">
              <div className="flex justify-between text-xs text-[#44403C]">
                <span>Total Bulk Weight:</span>
                <span className="font-mono tabular-nums font-bold">{quote.totalWeightKg} kg</span>
              </div>
              <div className="flex justify-between text-xs text-[#44403C]">
                <span>Base Wholesale Value:</span>
                <span className="font-mono tabular-nums">₹{quote.subtotalInr}</span>
              </div>
              {quote.discountPercent > 0 && (
                <div className="flex justify-between text-xs text-[#15803D] font-semibold">
                  <span>Volume Slab Discount ({quote.discountPercent}% Off):</span>
                  <span className="font-mono tabular-nums">−₹{quote.discountAmountInr}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#FED7AA] flex justify-between items-baseline">
                <span className="font-semibold text-[#1C1917]">
                  Estimated Wholesale Quote (INR):
                </span>
                <span className="font-mono tabular-nums text-xl font-bold text-[#EA580C]">
                  ₹{quote.estimatedTotalInr}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Business & Location Details Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-white border border-[#FED7AA] rounded-2xl p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-center gap-2 border-b border-[#FED7AA] pb-3">
              <Building2 className="w-5 h-5 text-[#EA580C]" />
              <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                2. Buyer & Dispatch Details
              </h2>
            </div>

            <div>
              <label
                htmlFor="ws-business-name"
                className="block text-xs font-semibold text-[#292524] mb-1"
              >
                Business / Shop / Restaurant Name *
              </label>
              <input
                id="ws-business-name"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Mahalaxmi Supermart or Spice Route Kitchen"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ws-business-type"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  Buyer Category *
                </label>
                <select
                  id="ws-business-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#FED7AA] text-xs font-medium bg-white"
                >
                  <option value="Retail Kirana / Supermarket">Retail Kirana / Supermarket</option>
                  <option value="Restaurant / Hotel / Caterer">Restaurant / Hotel / Caterer</option>
                  <option value="Distributor / Stockist">Distributor / Stockist</option>
                  <option value="Food Processor / Institutional">
                    Food Processor / Institutional
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="ws-contact-name"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  Contact Person *
                </label>
                <input
                  id="ws-contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ws-phone"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  10-Digit Mobile / WhatsApp *
                </label>
                <input
                  id="ws-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono focus:outline-none focus:border-[#EA580C]"
                />
              </div>
              <div>
                <label
                  htmlFor="ws-email"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  Business Email
                </label>
                <input
                  id="ws-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="buyer@company.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="ws-city"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  City / District *
                </label>
                <input
                  id="ws-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                />
              </div>
              <div>
                <label
                  htmlFor="ws-state"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  State *
                </label>
                <input
                  id="ws-state"
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                />
              </div>
              <div>
                <label
                  htmlFor="ws-pincode"
                  className="block text-xs font-semibold text-[#292524] mb-1"
                >
                  PIN Code *
                </label>
                <input
                  id="ws-pincode"
                  type="text"
                  required
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="411001"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ws-gst" className="block text-xs font-semibold text-[#292524] mb-1">
                GSTIN (Optional — for B2B Tax Invoice input credit)
              </label>
              <input
                id="ws-gst"
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 rounded-xl border border-[#FED7AA] text-sm font-mono uppercase focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            <div>
              <label htmlFor="ws-notes" className="block text-xs font-semibold text-[#292524] mb-1">
                Packaging Preference & Delivery Notes
              </label>
              <textarea
                id="ws-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify 5kg bulk pouches, 25kg sacks, or retail counter strips..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !quote.valid}
              className="w-full py-3.5 px-6 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-stone-400 text-white font-semibold text-sm transition-colors shadow-xs"
            >
              {submitting
                ? 'Submitting Wholesale Enquiry...'
                : `Submit Wholesale Enquiry · ₹${quote.estimatedTotalInr}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
