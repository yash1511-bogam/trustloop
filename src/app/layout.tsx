import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { THEME_COOKIE_NAME, normalizeTheme } from "@/lib/theme";
import "./globals.css";

const display = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020203",
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
  manifest: "/manifest.webmanifest",
  category: "technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeStore = await cookies();
  const theme = normalizeTheme(themeStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="en" data-theme={theme}>
      <body className={`${display.variable} ${mono.variable} antialiased selection:bg-cyan-500/30`}>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => null)); }`}
        </Script>
      </body>
    </html>
  );
}
