import type { Metadata } from 'next';
import {
  Fraunces,
  Plus_Jakarta_Sans,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
} from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SGM Masale — Heritage Indian Spices & Wholesale Store',
  description:
    'Complete mobile-first e-commerce platform and wholesale B2B portal for SGM Masale featuring 48 Indian spice varieties, variant pack sizes, server-verified Razorpay checkout, and a full inventory & order admin dashboard.',
  openGraph: {
    title: 'SGM Masale — Heritage Indian Spices & Wholesale Store',
    description:
      'Complete mobile-first e-commerce platform and wholesale B2B portal for SGM Masale featuring 48 Indian spice varieties, variant pack sizes, server-verified Razorpay checkout, and a full inventory & order admin dashboard.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SGM Masale — Heritage Indian Spices & Wholesale Store',
    description:
      'Complete mobile-first e-commerce platform and wholesale B2B portal for SGM Masale featuring 48 Indian spice varieties, variant pack sizes, server-verified Razorpay checkout, and a full inventory & order admin dashboard.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakarta.variable} ${notoDevanagari.variable} ${ibmPlexMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#1C1917]"
      >
        {children}
      </body>
    </html>
  );
}
