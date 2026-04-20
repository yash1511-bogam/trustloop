import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { articleSchema, breadcrumbSchema, SeoSchemas } from "@/lib/seo-schemas";

export const metadata: Metadata = {
  title: "Changelog — TrustLoop",
  description: "What's new and improved in TrustLoop. Product updates, features, security patches, and infrastructure changes.",
  alternates: { canonical: "/changelog" },
};

interface Entry {
  version: string;
  changes: Array<{ text: string; tag: "Feature" | "Security" | "Improvement" | "Infrastructure" }>;
}

const entries: Entry[] = [
  {
    version: "1.5.0",
    changes: [
      { text: "Early access waitlist with confirmation emails", tag: "Feature" },
      { text: "Post-registration checkout flow for Starter trial and Pro plan", tag: "Feature" },
      { text: "Professional legal pages — Terms, Privacy, DPA, Billing Policy", tag: "Feature" },
      { text: "Branded email templates with logo, dark theme, and physical address footer", tag: "Improvement" },
      { text: "Reply-to address on all outbound emails", tag: "Improvement" },
      { text: "Billing status API now reads plan tier from workspace correctly", tag: "Improvement" },
      { text: "Plan downgrade uses correct payment provider API", tag: "Improvement" },
      { text: "Checkout preserves trial status instead of overwriting to pending", tag: "Improvement" },
    ],
  },
  {
    version: "1.4.0",
    changes: [
      { text: "Restructured settings into account, integrations, security, and workspace sections", tag: "Feature" },
      { text: "Billing cancellation and contact sales flow", tag: "Feature" },
      { text: "Redesigned status page with custom domain support and vertical uptime bars", tag: "Feature" },
      { text: "Dedicated pages for webhooks, on-call rotation, and SAML SSO settings", tag: "Feature" },
      { text: "Executive view renamed to Analytics", tag: "Improvement" },
      { text: "Cookie consent banner for GDPR/CCPA compliance", tag: "Security" },
      { text: "Structured AI provider error responses across all AI routes", tag: "Improvement" },
      { text: "Worker graceful shutdown and crash recovery", tag: "Infrastructure" },
    ],
  },
  {
    version: "1.3.0",
    changes: [
      { text: "Server-side onboarding checklist with DB-backed dismiss and auto-hide", tag: "Feature" },
      { text: "Dashboard-style layout across all pages with incidents list view", tag: "Feature" },
      { text: "Pinned sidebar with always-visible sign out", tag: "Improvement" },
      { text: "Dark mode locked as default theme", tag: "Improvement" },
      { text: "Unified Turnstile security verification across auth flows", tag: "Security" },
      { text: "Error boundaries, N+1 query fix, connection pooling, and fire-and-forget logging", tag: "Infrastructure" },
      { text: "Skeleton loading states in incident queue", tag: "Improvement" },
    ],
  },
  {
    version: "1.2.0",
    changes: [
      { text: "Post-mortem generation with AI (OpenAI, Gemini, Anthropic)", tag: "Feature" },
      { text: "14-day trial with quota-based gating", tag: "Feature" },
      { text: "Audit log system with dedicated UI", tag: "Feature" },
      { text: "Langfuse and Helicone webhook integrations", tag: "Feature" },
      { text: "Incident templates and tagging system", tag: "Feature" },
      { text: "Customer update approval workflow", tag: "Feature" },
      { text: "Executive analytics dashboard with trend charts", tag: "Feature" },
      { text: "Compliance export (CSV, PDF)", tag: "Feature" },
      { text: "Security headers — CSP, HSTS, X-Frame-Options", tag: "Security" },
      { text: "SSRF protection for outbound webhooks", tag: "Security" },
      { text: "PWA support with push notifications", tag: "Infrastructure" },
    ],
  },
  {
    version: "1.1.0",
    changes: [
      { text: "ECS zero-downtime deployments with task draining", tag: "Infrastructure" },
      { text: "Ambient urgency glow on P1 incident cards", tag: "Improvement" },
      { text: "Tabular numbers on dashboard metric grids", tag: "Improvement" },
      { text: "Content-visibility optimization for below-fold dashboard sections", tag: "Infrastructure" },
      { text: "Active nav link accent indicator", tag: "Improvement" },
    ],
  },
  {
    version: "1.0.0",
    changes: [
      { text: "Incident intake from dashboards, Slack, and signed webhooks", tag: "Feature" },
      { text: "AI-powered triage with workspace-scoped BYOK keys (OpenAI, Gemini, Anthropic)", tag: "Feature" },
      { text: "Customer-facing update drafting with approval controls and audit history", tag: "Feature" },
      { text: "Multi-channel notifications — email, Slack, SMS, push, public status pages", tag: "Feature" },
      { text: "Role-based access control with Owner, Manager, Responder, Viewer roles", tag: "Feature" },
      { text: "Workspace billing with Dodo Payments integration", tag: "Feature" },
      { text: "SAML SSO and scoped API keys with IP allowlists", tag: "Security" },
      { text: "AES-256-GCM encryption for AI provider keys at rest", tag: "Security" },
      { text: "SQS-backed async reminder and follow-up worker", tag: "Infrastructure" },
    ],
  },
];

const tagClass: Record<string, string> = {
  Feature: "bg-[rgba(14,165,233,0.1)] text-[var(--color-info)]",
  Security: "bg-[rgba(22,163,74,0.1)] text-[var(--color-resolve)]",
  Infrastructure: "bg-[rgba(217,119,6,0.1)] text-[var(--color-warning)]",
  Improvement: "bg-[var(--color-signal-dim)] text-[var(--color-signal)]",
};

export default function ChangelogPage() {
  return (
    <>
    <SeoSchemas schemas={[
      articleSchema({ headline: "Changelog — TrustLoop", description: "What's new and improved in TrustLoop.", path: "/changelog", datePublished: "2026-01-15", dateModified: "2026-04-20" }),
      breadcrumbSchema([{ name: "Changelog", path: "/changelog" }]),
    ]} />
    <PageShell kicker="Product updates" title="Changelog" subtitle="What's new and improved in TrustLoop.">
      <div className="space-y-6">
        {entries.map((entry) => (
          <article key={entry.version} className="rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-6" id={`v${entry.version}`}>
            <a className="badge transition-colors hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]" href={`#v${entry.version}`}>{entry.version}</a>
            <ul className="mt-4 space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-body)]">
                  <span className={`mt-0.5 inline-block shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tagClass[change.tag]}`}>{change.tag}</span>
                  {change.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </PageShell>
    </>
  );
}
