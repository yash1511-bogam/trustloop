import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog" };

interface Entry {
  date: string;
  version: string;
  changes: Array<{ text: string; tag: "Feature" | "Security" | "Improvement" | "Infrastructure" }>;
}

const entries: Entry[] = [
  {
    date: "2026-03-13",
    version: "1.4.0",
    changes: [
      { text: "Added Arize Phoenix and Braintrust webhook integrations", tag: "Feature" },
      { text: "Status page subscribe-to-updates and component-level health indicators", tag: "Feature" },
      { text: "Workspace rename, scheduled deletion with 24h grace period, Slack disconnect", tag: "Feature" },
      { text: "Cookie consent banner (GDPR/CCPA)", tag: "Security" },
      { text: "X-Request-ID header on all API responses", tag: "Improvement" },
      { text: "Structured AI provider error responses across all AI routes", tag: "Improvement" },
      { text: "Worker graceful shutdown and crash recovery", tag: "Infrastructure" },
    ],
  },
  {
    date: "2026-03-10",
    version: "1.3.0",
    changes: [
      { text: "Post-mortem generation with AI (OpenAI, Gemini, Anthropic)", tag: "Feature" },
      { text: "14-day trial with quota-based gating", tag: "Feature" },
      { text: "Security headers (CSP, HSTS, X-Frame-Options)", tag: "Security" },
      { text: "SSRF protection for outbound webhooks", tag: "Security" },
      { text: "Audit log system with UI at /security/audit", tag: "Feature" },
      { text: "OpenAPI documentation at /api-docs", tag: "Feature" },
      { text: "Pricing page and legal pages (terms, privacy, DPA)", tag: "Feature" },
      { text: "Onboarding checklist component", tag: "Improvement" },
    ],
  },
  {
    date: "2026-03-01",
    version: "1.2.0",
    changes: [
      { text: "Langfuse and Helicone webhook integrations", tag: "Feature" },
      { text: "Incident templates and tagging system", tag: "Feature" },
      { text: "Customer update approval workflow", tag: "Feature" },
      { text: "Executive analytics dashboard with trend charts", tag: "Feature" },
      { text: "Compliance export (CSV, PDF)", tag: "Feature" },
      { text: "PWA support with push notifications", tag: "Infrastructure" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="legal-page">
      <section className="surface p-6">
        <p className="page-kicker">Product updates</p>
        <h1 className="mt-2 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">Changelog</h1>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">What&apos;s new and improved in TrustLoop.</p>
      </section>

      <div className="mt-6 space-y-6">
        {entries.map((entry) => (
          <article key={entry.version} className="surface p-6" id={`v${entry.version}`}>
            <div className="flex items-center gap-3">
              <a className="badge transition-colors hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]" href={`#v${entry.version}`}>{entry.version}</a>
              <time className="text-xs text-[var(--color-ghost)]">{entry.date}</time>
            </div>
            <ul className="mt-4 space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-body)]">
                  <span className={`mt-0.5 inline-block shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${change.tag === "Feature" ? "bg-[rgba(14,165,233,0.1)] text-[var(--color-info)]" : change.tag === "Security" ? "bg-[rgba(22,163,74,0.1)] text-[var(--color-resolve)]" : change.tag === "Infrastructure" ? "bg-[rgba(217,119,6,0.1)] text-[var(--color-warning)]" : "bg-[var(--color-signal-dim)] text-[var(--color-signal)]"}`}>{change.tag}</span>
                  {change.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
