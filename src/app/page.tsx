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
    {
      "@type": "Question",
      name: "What AI models do you support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "TrustLoop supports OpenAI, Anthropic, and Gemini provider workflows with bring-your-own-key controls.",
      },
    },
    {
      "@type": "Question",
      name: "Is this GDPR compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "TrustLoop is designed for teams handling regulated data with scoped access, audit trails, and encrypted key storage.",
      },
    },
    {
      "@type": "Question",
      name: "What happens after the trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can upgrade in-product, move to an enterprise conversation, or allow the workspace trial to expire without a forced card-on-file conversion.",
      },
    },
    {
      "@type": "Question",
      name: "Do you have an API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Workspace API keys support automation, status update flows, and internal operational tooling.",
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
