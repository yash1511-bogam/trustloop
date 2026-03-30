import type { Metadata } from "next";
import {
  Fingerprint,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Security — TrustLoop",
  description: "How TrustLoop protects your data with encryption, access control, and infrastructure discipline.",
  alternates: { canonical: "/security" },
};

const sections = [
  {
    title: "Encryption",
    description: "TrustLoop encrypts sensitive AI provider keys and incident payloads with AES-256-GCM. Key derivation uses HKDF to keep encryption material isolated and rotation-friendly. All data in transit is protected with TLS 1.2+.",
    icon: LockKey,
  },
  {
    title: "Access Control",
    description: "Role-based access control with four permission levels (Owner, Manager, Responder, Viewer). SAML SSO for Enterprise customers. Scoped API keys with IP allowlists and expiration controls. Webhook signature verification (HMAC-SHA256) for all inbound integrations.",
    icon: Fingerprint,
  },
  {
    title: "Infrastructure",
    description: "Designed for AWS ECS deployments with WAFv2, Secrets Manager, and SOC2-aligned operational controls. Comprehensive audit logging of all privileged actions. Regular dependency scanning and vulnerability assessments.",
    icon: ShieldCheck,
  },
];

export default function SecurityPage() {
  return (
    <PageShell kicker="Security" title="Built for teams handling sensitive AI data." subtitle="Encryption, access control, and infrastructure discipline without losing response speed.">
      <div className="grid gap-5 md:grid-cols-3">
        {sections.map((section) => (
          <article className="rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-6" key={section.title}>
            <section.icon color="var(--color-subtext)" size={28} weight="duotone" />
            <h2 className="mt-5 font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">{section.title}</h2>
            <p className="mt-3 text-[14px] leading-7 text-[var(--color-subtext)]">{section.description}</p>
          </article>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">Reporting a vulnerability</h2>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-subtext)]">
          If you discover a security vulnerability, please report it responsibly by emailing <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a>. We will acknowledge receipt within 24 hours and provide a timeline for resolution.
        </p>
      </section>
    </PageShell>
  );
}
