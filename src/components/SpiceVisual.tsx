'use client';

import React, { useState } from 'react';

interface SpiceVisualProps {
  name: string;
  hindiName?: string;
  category: string;
  colorHex?: string;
  accentHex?: string;
  imageUrl?: string;
  packSize?: string;
  className?: string;
}

export function SpiceVisual({
  name,
  category,
  colorHex = '#6B1D1D',
  accentHex = '#E09F1F',
  imageUrl,
  packSize = '250g',
  className = 'w-full h-56',
}: SpiceVisualProps) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-[#FFF7ED] flex items-center justify-center ${className}`}
      >
        <img
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const isWhole = category.includes('Whole');
  const isBlend = category.includes('Blended') || category.includes('Regional');
  const cleanTitle = name.replace('[SAMPLE] ', '');

  return (
    <div
      className={`relative overflow-hidden select-none flex items-center justify-center ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 38%, #FFFFFF 0%, #FFF7ED 70%, #FFEDD5 100%)`,
      }}
    >
      <svg
        viewBox="0 0 360 260"
        className="w-full h-full max-h-full"
        role="img"
        aria-label={`${cleanTitle} packaging preview`}
      >
        <defs>
          <linearGradient id={`pouch-${name.length}-${colorHex}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorHex} />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
          <radialGradient id={`spice-pile-${colorHex}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={accentHex} />
            <stop offset="65%" stopColor={colorHex} />
            <stop offset="100%" stopColor="#7C2D12" />
          </radialGradient>
        </defs>

        {/* Subtle botanical mandala arch in background */}
        <circle
          cx="180"
          cy="130"
          r="102"
          fill="none"
          stroke="#EA580C"
          strokeOpacity="0.18"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <circle
          cx="180"
          cy="130"
          r="84"
          fill="none"
          stroke="#15803D"
          strokeOpacity="0.14"
          strokeWidth="1"
        />

        {/* Soft tabletop shadow */}
        <ellipse cx="180" cy="228" rx="96" ry="12" fill="#9A3412" fillOpacity="0.12" />

        {/* Stand-up Artisanal Spice Pouch */}
        <g transform="translate(106, 26)">
          <path
            d="M14,12 C14,5 20,0 28,0 L120,0 C128,0 134,5 134,12 L142,184 C142,192 135,198 126,198 L22,198 C13,198 6,192 6,184 Z"
            fill={`url(#pouch-${name.length}-${colorHex})`}
            stroke="#FB923C"
            strokeWidth="1.5"
          />
          <rect x="14" y="14" width="120" height="3" fill="#FFF7ED" fillOpacity="0.7" />

          {/* Crisp White label card on pouch */}
          <rect
            x="18"
            y="28"
            width="112"
            height="122"
            rx="6"
            fill="#FFFFFF"
            stroke="#F97316"
            strokeWidth="1.2"
          />

          {/* Top Orange Header Band with subtle green leaf dot */}
          <rect x="24" y="34" width="100" height="18" rx="3" fill="#EA580C" />
          <circle cx="32" cy="43" r="2.5" fill="#22C55E" />
          <text
            x="76"
            y="46"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="1.6"
          >
            SGM MASALE
          </text>

          {/* Category Kicker in subtle green */}
          <text
            x="74"
            y="66"
            textAnchor="middle"
            fill="#15803D"
            fontSize="7.5"
            fontWeight="700"
            letterSpacing="0.8"
          >
            {category.toUpperCase().slice(0, 18)}
          </text>

          <line
            x1="36"
            y1="73"
            x2="112"
            y2="73"
            stroke="#FDBA74"
            strokeWidth="1"
            strokeOpacity="0.9"
          />

          {/* Spice Name */}
          <text
            x="74"
            y="90"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="9"
            fontWeight="700"
          >
            {cleanTitle.slice(0, 17)}
          </text>
          <text
            x="74"
            y="103"
            textAnchor="middle"
            fill="#44403C"
            fontSize="8"
            fontWeight="600"
          >
            {cleanTitle.slice(17, 34)}
          </text>

          {/* Spice Viewing Window */}
          <ellipse
            cx="74"
            cy="128"
            rx="34"
            ry="13"
            fill={`url(#spice-pile-${colorHex})`}
            stroke="#EA580C"
            strokeWidth="1"
          />
          {isWhole && (
            <g fill="#FFFFFF" fillOpacity="0.65">
              <circle cx="62" cy="126" r="2.2" />
              <circle cx="74" cy="130" r="2.5" />
              <circle cx="84" cy="125" r="2" />
              <circle cx="70" cy="123" r="1.8" />
            </g>
          )}
          {isBlend && (
            <g fill="#FEF08A" fillOpacity="0.7">
              <circle cx="65" cy="128" r="1.5" />
              <circle cx="78" cy="126" r="1.8" />
              <circle cx="82" cy="131" r="1.3" />
            </g>
          )}

          {/* Net Weight & Sample Data Footer */}
          <text
            x="74"
            y="170"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="0.8"
          >
            NET WT. {packSize.toUpperCase()}
          </text>
          <text
            x="74"
            y="184"
            textAnchor="middle"
            fill="#FFEDD5"
            fontSize="7"
            fontWeight="600"
            letterSpacing="1"
          >
            SAMPLE CATALOGUE PACK
          </text>
        </g>

        {/* Artisanal Brass Katori Bowl of Fresh Spice in foreground right */}
        <g transform="translate(216, 168)">
          <ellipse cx="42" cy="48" rx="40" ry="9" fill="#9A3412" fillOpacity="0.18" />
          <path d="M8,26 Q42,-8 76,26 Z" fill={`url(#spice-pile-${colorHex})`} />
          <path
            d="M4,24 L80,24 C78,44 62,52 42,52 C22,52 6,44 4,24 Z"
            fill="#EA580C"
            stroke="#9A3412"
            strokeWidth="1.2"
          />
          <ellipse cx="42" cy="24" rx="38" ry="5" fill="none" stroke="#FFEDD5" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}

export function HeroSpiceShowcase({ onExploreClick }: { onExploreClick: () => void }) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#FDBA74] bg-gradient-to-br from-[#EA580C] via-[#D9480F] to-[#C2410C] text-white p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
      {/* Top Copy Block */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[#FFEDD5] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
          <span>SGM Masale · Craft Reserve</span>
        </div>
        <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-white leading-snug">
          48 Pure & Blended Indian Masalas
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#FFEDD5] leading-relaxed">
          From Salem Haldi and Pampore Kashmiri Mirch to Kolhapuri Kanda Lasun and Shahi Garam
          Masala.
        </p>
      </div>

      {/* Dedicated 4-Bowl Spice Showcase Grid on Clean White Cards */}
      <div className="relative z-10 my-auto py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3.5">
          {[
            {
              title: 'Salem Haldi',
              hindi: 'सेलम हल्दी',
              sub: 'High-Curcumin Gold',
              bg: '#F59E0B',
              ring: '#FDE68A',
            },
            {
              title: 'Kashmiri Mirch',
              hindi: 'कश्मीरी मिर्च',
              sub: 'Vibrant Ruby Red',
              bg: '#DC2626',
              ring: '#FCA5A5',
            },
            {
              title: 'Idukki Elaichi',
              hindi: 'हरी इलायची',
              sub: '8mm Bold Green Pods',
              bg: '#15803D',
              ring: '#86EFAC',
            },
            {
              title: 'Shahi Garam',
              hindi: 'शाही गरम मसाला',
              sub: '15-Spice Roast Blend',
              bg: '#C2410C',
              ring: '#FDBA74',
            },
          ].map((bowl) => (
            <div
              key={bowl.title}
              className="p-3.5 rounded-xl bg-white text-[#1C1917] border border-[#FED7AA] flex items-center gap-3 shadow-xs"
            >
              <div
                className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center border-2 shadow-inner"
                style={{ backgroundColor: bowl.bg, borderColor: bowl.ring }}
              >
                <div
                  className="w-6 h-6 rounded-full opacity-60"
                  style={{ backgroundColor: bowl.ring }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-[#EA580C] font-semibold truncate">
                  {bowl.hindi}
                </div>
                <div className="text-xs font-bold text-[#1C1917] truncate">{bowl.title}</div>
                <div className="text-[10px] text-[#57534E] truncate">{bowl.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Strip */}
      <div className="relative z-10 pt-4 border-t border-white/25 flex flex-wrap items-center justify-between gap-4 text-xs text-white">
        <div>
          <span className="font-mono tabular-nums font-bold text-[#FFEDD5]">
            100g · 250g · 500g
          </span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span>Retail & Bulk Packs</span>
        </div>
        <button
          type="button"
          onClick={onExploreClick}
          className="text-xs font-bold text-white underline underline-offset-4 hover:text-[#FFEDD5] transition-colors whitespace-nowrap shrink-0"
        >
          Browse All 48 Varieties →
        </button>
      </div>
    </div>
  );
}
