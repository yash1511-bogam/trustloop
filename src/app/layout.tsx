import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "TrustLoop | AI Incident Operations SaaS",
    template: "%s | TrustLoop",
  },
  description:
    "TrustLoop helps AI software companies run incident operations with intake, triage, ownership, customer updates, and executive analytics.",
  keywords: [
    "AI incident management",
    "SaaS incident operations",
    "AI reliability",
    "customer-safe AI updates",
    "incident response software",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "TrustLoop",
    title: "TrustLoop | AI Incident Operations SaaS",
    description:
      "Unify incident intake, AI triage, ownership, and customer communication for production AI products.",
    images: [
      {
        url: "/social-preview.svg",
        width: 1200,
        height: 630,
        alt: "TrustLoop platform preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustLoop | AI Incident Operations SaaS",
    description:
      "AI incident operations platform for software teams shipping customer-facing AI.",
    images: ["/social-preview.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
