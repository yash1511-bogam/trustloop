import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Syne, Geist } from "next/font/google";
import Script from "next/script";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
});

const heading = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const ui = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.ai";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0B0D",
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "TrustLoop | AI Incident Operations",
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
  icons: {
    icon: [
      { url: "/128.png", type: "image/png", sizes: "128x128" },
      { url: "/256.png", type: "image/png", sizes: "256x256" },
      { url: "/512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/512.png", type: "image/png", sizes: "512x512" },
    ],
  },
  manifest: "/manifest.webmanifest",
  category: "technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={cn("font-sans", geist.variable)}>
      <body className={`${display.variable} ${heading.variable} ${ui.variable} ${mono.variable} antialiased`}>
        <a className="skip-to-content" href="#main-content">Skip to content</a>
        {children}
        <CookieConsentBanner />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => null)); }`}
        </Script>
        <Script id="webmcp" strategy="afterInteractive">
          {`(function(){if(!navigator.modelContext||!navigator.modelContext.registerTool)return;navigator.modelContext.registerTool({name:"check-status",description:"Check the operational status and health of TrustLoop services.",inputSchema:{type:"object",properties:{}},async execute(){const r=await fetch("/api/health");return r.json()}});navigator.modelContext.registerTool({name:"search-docs",description:"Search TrustLoop documentation for a given query.",inputSchema:{type:"object",properties:{query:{type:"string",description:"Search query"}},required:["query"]},async execute(p){const r=await fetch("/docs?q="+encodeURIComponent(p.query));return{url:r.url,status:r.status}}});navigator.modelContext.registerTool({name:"view-api-spec",description:"Retrieve the TrustLoop OpenAPI specification.",inputSchema:{type:"object",properties:{}},async execute(){const r=await fetch("/api/docs");return r.json()}})})();`}
        </Script>
      </body>
    </html>
  );
}
