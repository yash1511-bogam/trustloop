import {
  Fingerprint,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

const sections = [
  {
    title: "Encryption",
    description: "TrustLoop encrypts sensitive AI provider keys and incident payloads with AES-256-GCM. Key derivation uses HKDF to keep encryption material isolated and rotation-friendly.",
    icon: LockKey,
  },
  {
    title: "Access Control",
    description: "Role-based access control, SAML SSO, scoped API keys, and IP allowlists keep response workflows limited to the operators who actually need them.",
    icon: Fingerprint,
  },
  {
    title: "Infrastructure",
    description: "The platform is designed for AWS ECS deployments with WAFv2, Secrets Manager, and SOC2-aligned operational controls around privileged access and auditability.",
    icon: ShieldCheck,
  },
];

export default function SecurityPage() {
  return (
    <main className="page-shell page-stack">
      <section className="marketing-section !pt-12">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="page-kicker">Security</p>
          <h1 className="font-[var(--font-heading)] text-[40px] font-bold leading-[1.02] text-[var(--color-title)]">
            Built for teams handling sensitive AI data.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-7 text-[var(--color-subtext)]">
            TrustLoop is designed for incident operations teams that need encryption, access control, and infrastructure discipline without losing response speed.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {sections.map((section, i) => (
          <article className="surface stagger-item p-6" key={section.title} style={{ animationDelay: `${i * 80}ms` }}>
            <section.icon color="var(--color-subtext)" size={28} weight="duotone" />
            <h2 className="mt-5 font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
              {section.title}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[var(--color-subtext)]">{section.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
