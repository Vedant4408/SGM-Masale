'use client';

import React, { useState } from 'react';
import { CheckCircle2, MapPin, Phone, Mail, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export type InfoPageType =
  | 'about'
  | 'contact'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms';

interface PolicyAndInfoViewsProps {
  page: InfoPageType;
  onNavigate: (page: any) => void;
}

export function PolicyAndInfoViews({ page, onNavigate }: PolicyAndInfoViewsProps) {
  const [contactSubmitted, setContactSubmitted] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Sub-navigation across information & gateway-compliance pages */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
        {(
          [
            { id: 'about', label: 'About SGM Masale' },
            { id: 'contact', label: 'Contact Us' },
            { id: 'shipping', label: 'Shipping Policy' },
            { id: 'returns', label: 'Returns & Refunds' },
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'terms', label: 'Terms & Conditions' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              page === tab.id
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-[#44403C] hover:text-[#EA580C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {page === 'about' && (
        <article className="bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-10 space-y-6">
          <p className="text-xs uppercase tracking-widest text-[#EA580C] font-semibold">
            Our Heritage & Craftsmanship
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917]">
            SGM Masale — Pure Indian Spices, Ground with Integrity
          </h1>
          <p className="text-sm sm:text-base text-[#44403C] leading-relaxed">
            SGM Masale brings 48 varieties of pure ground spices, whole aromatics, signature
            everyday blends, and authentic regional masalas directly from India’s premier spice
            growing belts to home kitchens, kirana retailers, and restaurant kitchens across the
            country.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
              <h3 className="font-serif font-bold text-[#EA580C]">Direct Crop Sourcing</h3>
              <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
                Sourced from benchmark agricultural mandis including Unjha (Cumin), Salem
                (Turmeric), Guntur & Byadgi (Chillies), Kota (Coriander), and Idukki (Cardamom).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
              <h3 className="font-serif font-bold text-[#15803D]">Zero Artificial Colours</h3>
              <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
                Every spice variety is cleaned, slow-roasted where required, and milled without
                synthetic dyes, fillers, or artificial preservatives.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
              <h3 className="font-serif font-bold text-[#C2410C]">Retail & Wholesale</h3>
              <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
                Available in 100g, 250g, and 500g aroma-locked pouches for households, as well as
                bulk 5kg–100kg+ wholesale packs for retailers and caterers.
              </p>
            </div>
          </div>
        </article>
      )}

      {page === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 bg-gradient-to-br from-[#EA580C] to-[#C2410C] text-white rounded-2xl p-6 sm:p-8 space-y-5 shadow-md">
            <h1 className="font-serif text-2xl font-bold">Contact SGM Masale</h1>
            <p className="text-xs text-[#FFF7ED] leading-relaxed">
              Reach out to our customer care or wholesale dispatch desk for retail order support,
              bulk dealership enquiries, or institutional supply.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span>SGM Masale Processing & Dispatch Unit, Maharashtra, India</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-white shrink-0" />
                <span className="font-mono">+91 98000 00000 (Mon–Sat, 9:30 AM – 7:00 PM IST)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-white shrink-0" />
                <span className="font-mono">care@sgmmasale.in</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-8">
            {contactSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto" />
                <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                  Message Received
                </h2>
                <p className="text-xs text-[#57534E]">
                  Our team will respond within 1 business day.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSubmitted(true);
                }}
                className="space-y-4"
              >
                <h2 className="font-serif text-xl font-bold text-[#1C1917]">
                  Send Us a Message
                </h2>
                <div>
                  <label className="block text-xs font-semibold mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm font-mono focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Message *</label>
                  <textarea
                    rows={3}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#FED7AA] text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {page === 'shipping' && (
        <article className="bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-10 space-y-4 text-sm text-[#44403C] leading-relaxed">
          <div className="flex items-center gap-2 text-[#15803D]">
            <Truck className="w-5 h-5" />
            <h1 className="font-serif text-2xl font-bold text-[#1C1917]">
              Shipping & Delivery Policy
            </h1>
          </div>
          <p>
            <strong>All-India Coverage:</strong> SGM Masale ships retail and bulk spice orders across
            all serviceable 6-digit Indian PIN codes via reputed courier and surface cargo partners.
          </p>
          <p>
            <strong>Shipping Charges:</strong> Retail orders of{' '}
            <strong className="font-mono text-[#EA580C]">₹499 or above</strong> qualify for{' '}
            <strong className="text-[#15803D]">FREE Standard Shipping</strong> across India. Orders
            below ₹499 carry a flat shipping charge of <strong className="font-mono">₹60</strong>.
          </p>
          <p>
            <strong>Dispatch & Transit Timelines:</strong> Orders are hygienically packed and
            dispatched within 24–48 business hours. Estimated delivery is 2–3 business days in
            Maharashtra & West India, and 3–6 business days across the rest of India.
          </p>
        </article>
      )}

      {page === 'returns' && (
        <article className="bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-10 space-y-4 text-sm text-[#44403C] leading-relaxed">
          <div className="flex items-center gap-2 text-[#EA580C]">
            <RotateCcw className="w-5 h-5" />
            <h1 className="font-serif text-2xl font-bold text-[#1C1917]">
              Returns, Cancellations & Refunds Policy
            </h1>
          </div>
          <p>
            <strong>Food Safety & Hygiene Standard:</strong> Because spices are consumable food
            products, opened or used pouches cannot be returned once the aroma seal is broken.
          </p>
          <p>
            <strong>Damaged, Wrong, or Defective Packs:</strong> If you receive a damaged pack,
            leaking seal, or incorrect item, please contact us within 48 hours of delivery with your
            Order Number and a photograph. We will arrange an immediate free replacement or a 100%
            full refund.
          </p>
          <p>
            <strong>Refund Processing Timeline:</strong> Approved refunds are initiated via Razorpay
            to your original payment method (UPI, Card, or Netbanking) and reflect within 5–7
            business days.
          </p>
        </article>
      )}

      {page === 'privacy' && (
        <article className="bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-10 space-y-4 text-sm text-[#44403C] leading-relaxed">
          <div className="flex items-center gap-2 text-[#15803D]">
            <ShieldCheck className="w-5 h-5" />
            <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Privacy Policy</h1>
          </div>
          <p>
            SGM Masale respects your privacy. We collect only the customer details required to
            fulfil your spice orders (Name, Phone Number, Email, Delivery Address, and PIN Code).
          </p>
          <p>
            <strong>Payment Security:</strong> All online payments are processed through Razorpay’s
            PCI-DSS compliant gateway. SGM Masale never stores your card numbers, CVV, or UPI PINs
            on our servers.
          </p>
        </article>
      )}

      {page === 'terms' && (
        <article className="bg-white rounded-2xl border border-[#FED7AA] p-6 sm:p-10 space-y-4 text-sm text-[#44403C] leading-relaxed">
          <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Terms & Conditions</h1>
          <p>
            Welcome to SGM Masale. By placing a retail order or wholesale enquiry on this website,
            you agree to provide accurate contact and delivery PIN code details.
          </p>
          <p>
            <strong>Pricing & Taxes:</strong> All retail prices are listed in Indian Rupees (INR /
            ₹) inclusive of GST. Authoritative prices and stock availability are verified on our
            server prior to payment authorization.
          </p>
        </article>
      )}
    </div>
  );
}
