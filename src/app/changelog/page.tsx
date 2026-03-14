import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog" };

interface Entry {
  date: string;
  version: string;
  changes: string[];
}

const entries: Entry[] = [
  {
    date: "2026-03-13",
    version: "1.4.0",
    changes: [
      "Added Arize Phoenix and Braintrust webhook integrations",
      "Status page subscribe-to-updates and component-level health indicators",
      "Workspace rename, scheduled deletion with 24h grace period, Slack disconnect",
      "Cookie consent banner (GDPR/CCPA)",
      "X-Request-ID header on all API responses",
      "Structured AI provider error responses across all AI routes",
      "Worker graceful shutdown and crash recovery",
    ],
  },
  {
    date: "2026-03-10",
    version: "1.3.0",
    changes: [
      "Post-mortem generation with AI (OpenAI, Gemini, Anthropic)",
      "Free tier with quota-based gating",
      "Security headers (CSP, HSTS, X-Frame-Options)",
      "SSRF protection for outbound webhooks",
      "Audit log system with UI at /settings/audit",
      "OpenAPI documentation at /api-docs",
      "Pricing page and legal pages (terms, privacy, DPA)",
      "Onboarding checklist component",
    ],
  },
  {
    date: "2026-03-01",
    version: "1.2.0",
    changes: [
      "Langfuse and Helicone webhook integrations",
      "Incident templates and tagging system",
      "Customer update approval workflow",
      "Executive analytics dashboard with trend charts",
      "Compliance export (CSV, PDF)",
      "PWA support with push notifications",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="container-shell fade-in py-8">
      <section className="surface p-6">
        <p className="kicker">Product updates</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Changelog</h1>
        <p className="mt-2 text-sm text-neutral-400">What&apos;s new and improved in TrustLoop.</p>
      </section>

      <div className="mt-6 space-y-6">
        {entries.map((entry) => (
          <article key={entry.version} className="surface p-6">
            <div className="flex items-center gap-3">
              <span className="badge">{entry.version}</span>
              <time className="text-xs text-neutral-500">{entry.date}</time>
            </div>
            <ul className="mt-4 space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="text-sm text-neutral-300">• {change}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
