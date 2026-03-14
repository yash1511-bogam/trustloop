import { MarketingLanding } from "@/components/marketing-landing";
import { redirectToOAuthCallbackIfPresent } from "@/lib/oauth-callback-redirect";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.ai";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TrustLoop",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "TrustLoop is an incident operations SaaS for AI software companies that unifies intake, triage, ownership, and customer-safe updates.",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "49",
    highPrice: "149",
    priceCurrency: "USD",
    offerCount: "3",
  },
  provider: {
    "@type": "Organization",
    name: "TrustLoop",
    url: appUrl,
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do we need to use your AI keys?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. TrustLoop supports BYOK for OpenAI, Gemini, and Anthropic with per-workflow routing.",
      },
    },
    {
      "@type": "Question",
      name: "How are API keys protected?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Keys are encrypted at rest, never logged, never exposed client-side, and only used server-side.",
      },
    },
    {
      "@type": "Question",
      name: "Can we enforce quotas per workspace?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can configure tenant-aware rate limits and daily quotas for each workspace.",
      },
    },
  ],
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await redirectToOAuthCallbackIfPresent(searchParams);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
        type="application/ld+json"
      />
      <MarketingLanding />
    </>
  );
}
