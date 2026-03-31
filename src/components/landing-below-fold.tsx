"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion as framerMotion } from "framer-motion";
import {
  ArrowRight,
  Broadcast,
  CaretDown,
  ChartBar,
  ChartLineDown,
  ChatCircle,
  Check,
  Clock,
  Cpu,
  GithubLogo,
  GraduationCap,
  LinkedinLogo,
  Notepad,
  Robot,
  Sparkle,
  Warning,
  X,
  XLogo,
} from "@phosphor-icons/react";

import { TrustLoopLogo } from "@/components/trustloop-logo";
import { integrationLogos } from "@/components/integration-logos";

const problemCards = [
  {
    title: "Generic incident tools weren't built for AI failures",
    body: "They don't understand hallucinations, bias drift, or model degradation. Your team wastes time translating.",
    icon: Warning,
    color: "var(--color-danger)",
  },
  {
    title: "Status updates are written by hand under pressure",
    body: "Copy-pasting from Slack to email to status pages while customers wait. One mistake reaches hundreds.",
    icon: Clock,
    color: "var(--color-warning)",
  },
  {
    title: "Leadership has no visibility until it's too late",
    body: "By the time the exec dashboard loads, the incident has already escalated beyond control.",
    icon: ChartLineDown,
    color: "var(--color-signal)",
  },
];

const workflowSteps = [
  {
    number: "01",
    label: "Detect",
    title: "Incidents flow in from the systems you already trust.",
    body: "Incidents flow in from Datadog, PagerDuty, Sentry, or your team and are automatically routed by severity and AI category.",
    icon: <Broadcast size={20} color="#22d3ee" weight="regular" />,
  },
  {
    number: "02",
    label: "Triage",
    title: "Provider intelligence stays under your control.",
    body: "Your AI provider analyzes the incident, suggests severity, root cause, and a customer-safe update using your key and your data.",
    icon: <Cpu size={20} color="#a78bfa" weight="regular" />,
  },
  {
    number: "03",
    label: "Respond",
    title: "Approval gates slow mistakes, not responders.",
    body: "Draft, review, and approve customer communications with configurable approval gates. Nothing goes out unreviewed.",
    icon: <ChatCircle size={20} color="#34d399" weight="regular" />,
  },
  {
    number: "04",
    label: "Learn",
    title: "Every incident becomes operational leverage.",
    body: "Post-mortem generation, SLA breach reports, and executive analytics close the loop. The next response starts smarter.",
    icon: <GraduationCap size={20} color="#fbbf24" weight="regular" />,
  },
];

const integrationCards = [
  ["Datadog", "Infrastructure alerts and service health signals.", Broadcast],
  ["PagerDuty", "Escalation entry points for urgent operational failures.", Warning],
  ["Sentry", "Application errors and AI path regressions.", ChartBar],
  ["Slack", "Outbound responder coordination and approved updates.", ChatCircle],
  ["Langfuse", "LLM traces and observation context.", Robot],
  ["Helicone", "Inference visibility and request-level latency.", Sparkle],
  ["Arize Phoenix", "Evaluation drift and experiment monitoring.", ChartLineDown],
  ["Braintrust", "Model quality instrumentation for production changes.", Notepad],
  ["Custom Webhooks", "Bring your own internal signal sources.", ArrowRight],
] as const;

type MarketingPlan = {
  name: string;
  monthly: number | null;
  annual: number | null;
  description: string;
  featured: boolean;
  cta: {
    href: string;
    label: string;
    primary: boolean;
  };
  features: Array<[string, boolean]>;
  hoverGradient: string;
};

const plans: MarketingPlan[] = [
  {
    name: "Starter",
    monthly: 49,
    annual: 44,
    description: "For early-stage AI product teams handling customer incidents weekly.",
    featured: false,
    cta: { href: "/register?plan=starter", label: "Start trial", primary: false },
    hoverGradient: "linear-gradient(to bottom, #283048, #859398)",
    features: [
      ["50 incidents/day", true],
      ["100 triage runs/day", true],
      ["Webhook integrations", true],
      ["API keys", false],
      ["SAML SSO", false],
    ],
  },
  {
    name: "Pro",
    monthly: 149,
    annual: 134,
    description: "For teams running incident operations daily with tighter approval and reporting needs.",
    featured: true,
    cta: { href: "/register?plan=pro", label: "Get started", primary: true },
    hoverGradient: "linear-gradient(to bottom, #0c0c6d, #de512b)",
    features: [
      ["200 incidents/day", true],
      ["300 triage runs/day", true],
      ["API keys", true],
      ["On-call rotation", true],
      ["SAML SSO", false],
    ],
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    description: "For regulated or high-throughput organizations with stricter access and governance requirements.",
    featured: false,
    cta: { href: "/contact-sales", label: "Talk to sales", primary: false },
    hoverGradient: "linear-gradient(to bottom, #1a1a2e, #16213e)",
    features: [
      ["Unlimited incidents", true],
      ["Unlimited triage", true],
      ["API keys", true],
      ["On-call rotation", true],
      ["SAML SSO", true],
    ],
  },
];

const faqItems = [
  ["Do we need to use your AI keys?", "No. TrustLoop is built for bring-your-own-key workflows across OpenAI, Gemini, and Anthropic."],
  ["How are API keys protected?", "Keys are encrypted at rest, never logged, and only used server-side inside workspace-scoped operations."],
  ["Can we enforce quotas per workspace?", "Yes. Quotas, throughput caps, and automation limits are configurable per workspace."],
  ["What AI models do you support?", "OpenAI, Anthropic, and Gemini are first-class. Custom provider routing fits enterprise workflows."],
  ["Is this GDPR compliant?", "TrustLoop is designed for teams handling regulated data with BYOK, scoped access, and exportable audit trails."],
  ["What happens after the trial?", "You can upgrade in-product, talk to sales for enterprise terms, or let the workspace expire without a forced card-on-file conversion."],
  ["Do you have an API?", "Yes. Workspace API keys support automation, status update flows, and internal operational tooling."],
];

export function LandingBelowFold() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <section className="marketing-section scroll-mt-24" id="why">
        <div className="mx-auto max-w-[960px]">
          <framerMotion.h2
            className="text-center font-[var(--font-heading)] text-[clamp(28px,4vw,44px)] font-bold leading-[1.08] text-[var(--color-title)]"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, filter: "blur(0px)" }}
          >
            AI failures need a different playbook.
          </framerMotion.h2>
          <framerMotion.p
            className="mx-auto mt-5 max-w-[520px] text-center text-[16px] leading-relaxed text-[var(--color-subtext)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Standard incident tooling breaks down when the failure surface includes models, prompts, evaluation drift, and customer trust.
          </framerMotion.p>

          <div className="mt-20 space-y-20">
            {problemCards.map((card, i) => (
              <framerMotion.div
                className={`flex flex-col gap-6 md:flex-row md:items-start md:gap-16 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                key={card.title}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, amount: 0.2 }}
                whileInView={{ opacity: 1, x: 0 }}
              >
                <div className="relative flex shrink-0 items-center justify-center md:w-[200px]">
                  <span className="pointer-events-none select-none font-[var(--font-heading)] text-[120px] font-extrabold leading-none" style={{ color: card.color, opacity: 0.07 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <card.icon className="absolute" color={card.color} size={36} weight="duotone" />
                </div>
                <div className="max-w-[480px]">
                  <h3 className="font-[var(--font-heading)] text-[22px] font-bold leading-snug text-[var(--color-title)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.8] text-[var(--color-subtext)]">{card.body}</p>
                </div>
              </framerMotion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="how-it-works">
        <div className="mx-auto max-w-[960px]">
          <framerMotion.h2
            className="text-center font-[var(--font-heading)] text-[clamp(28px,4vw,44px)] font-bold leading-[1.08] text-[var(--color-title)]"
            initial={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            From signal to resolution,<br className="hidden sm:block" /> in one loop.
          </framerMotion.h2>

          <div className="mt-20 grid gap-px overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-rim)] sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, i) => (
              <framerMotion.div
                className="relative flex flex-col bg-[var(--color-surface)] p-7"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                key={step.number}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, amount: 0.1 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
              >
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-signal)] to-transparent" style={{ opacity: 0.6 }} />
                <span className="font-[var(--font-mono)] text-[11px] tracking-[0.16em] text-[var(--color-ghost)]">{step.number}</span>
                <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
                  {step.icon}
                </span>
                <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-signal)]">{step.label}</p>
                <h3 className="mt-2 font-[var(--font-heading)] text-[17px] font-bold leading-snug text-[var(--color-title)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-[var(--color-subtext)]">{step.body}</p>
              </framerMotion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section scroll-mt-24 overflow-hidden" id="integrations">
        <div className="mx-auto max-w-[960px]">
          <framerMotion.p
            className="text-center text-[15px] leading-relaxed text-[var(--color-subtext)]"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1 }}
          >
            Connects to where failures happen.
          </framerMotion.p>
          <framerMotion.h2
            className="mt-3 text-center font-[var(--font-heading)] text-[clamp(32px,5vw,56px)] font-bold leading-[1.05] text-[var(--color-title)]"
            initial={{ opacity: 0, letterSpacing: "0.15em" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, letterSpacing: "0em" }}
          >
            Your stack. Already supported.
          </framerMotion.h2>
        </div>

        <div className="relative mt-14">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-void)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-void)] to-transparent" />
          <div className="flex gap-[clamp(32px,5vw,64px)] overflow-hidden py-6">
            <div className="logo-marquee-track flex shrink-0 items-center gap-[clamp(32px,5vw,64px)]">
              {[...integrationCards, ...integrationCards].map(([name], i) => (
                <span className="flex shrink-0 items-center gap-3 text-[var(--color-muted)]" key={`${name}-${i}`}>
                  {integrationLogos[name]}
                  <span className="whitespace-nowrap font-[var(--font-heading)] text-[clamp(18px,2.5vw,28px)] font-bold text-[var(--color-muted)]">{name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="pricing">
        <div className="mx-auto max-w-[960px]">
          <framerMotion.h2
            className="text-center font-[var(--font-heading)] text-[clamp(32px,5vw,56px)] font-bold leading-[1.05] text-[var(--color-title)]"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Pricing that makes sense.
          </framerMotion.h2>
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-[var(--color-rim)] bg-[var(--color-void)] p-1">
              <button
                className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all ${!annual ? "bg-[var(--color-bright)] text-[var(--color-void)]" : "bg-transparent text-[var(--color-subtext)] hover:text-[var(--color-body)]"}`}
                onClick={() => setAnnual(false)}
                type="button"
              >
                Monthly
              </button>
              <button
                className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold transition-all ${annual ? "bg-[var(--color-bright)] text-[var(--color-void)]" : "bg-transparent text-[var(--color-subtext)] hover:text-[var(--color-body)]"}`}
                onClick={() => setAnnual(true)}
                type="button"
              >
                Annual
                <span className="rounded-full bg-[var(--color-signal)] px-1.5 py-0.5 text-[10px] font-bold text-white">−10%</span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <framerMotion.article
                className={`relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border ${plan.featured ? "border-[var(--color-signal)] bg-[var(--color-raised)] shadow-[0_0_40px_-12px_rgba(212,98,43,0.15)]" : plan.monthly === null ? "border-[var(--color-muted)] bg-gradient-to-b from-[var(--color-raised)] to-[var(--color-surface)]" : "border-[var(--color-rim)] bg-[var(--color-surface)]"} group`}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
                key={plan.name}
                transition={{ duration: 0.5, delay: plan.featured ? 0 : 0.1 }}
                viewport={{ once: true, amount: 0.3 }}
                whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              >
                <div className="auth-grain-heavy pointer-events-none absolute inset-0 z-0 rounded-[var(--radius-xl)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundImage: plan.hoverGradient }} />
                {plan.featured && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-signal)] to-transparent" />
                )}
                <div className="relative z-10 flex flex-1 flex-col gap-6 p-7 transition-colors group-hover:text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-[var(--font-heading)] text-[15px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-title)] group-hover:text-white">{plan.name}</h3>
                    {plan.featured && (
                      <span className="rounded-full bg-[var(--color-signal-dim)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-signal)]">Popular</span>
                    )}
                  </div>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-[var(--font-heading)] text-[clamp(36px,4vw,52px)] font-extrabold leading-none text-[var(--color-bright)] group-hover:text-white">
                      {plan.monthly === null ? "Custom" : (
                        <AnimatePresence mode="wait" initial={false}>
                          <framerMotion.span
                            key={annual ? "a" : "m"}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                          >
                            ${annual ? plan.annual : plan.monthly}<span className="text-[15px] font-normal text-[var(--color-ghost)] group-hover:text-white/70">/mo +tax</span>
                          </framerMotion.span>
                        </AnimatePresence>
                      )}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-subtext)] group-hover:text-white/80">{plan.description}</p>
                  <Link
                    className={`mt-auto inline-flex w-full justify-center ${plan.cta.primary ? "btn btn-primary" : "btn btn-ghost"}`}
                    href={plan.cta.href.includes("plan=") ? `${plan.cta.href}&interval=${annual ? "annual" : "monthly"}` : plan.cta.href}
                  >
                    {plan.cta.label}
                  </Link>
                </div>
                <div className="relative z-10 mt-auto border-t border-[var(--color-rim)] px-7 py-5 transition-colors group-hover:text-white group-hover:border-white/20">
                  <ul className="grid gap-2.5">
                    {plan.features.map(([feature, enabled]) => (
                      <li className="flex items-center gap-2.5 text-[13px]" key={feature}>
                        {enabled ? (
                          <Check className="shrink-0" color="var(--color-signal)" size={14} weight="bold" />
                        ) : (
                          <X className="shrink-0" color="var(--color-ghost)" size={14} weight="regular" />
                        )}
                        <span className={enabled ? "text-[var(--color-body)] group-hover:text-white" : "text-[var(--color-ghost)] group-hover:text-white/50"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </framerMotion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="faq">
        <div className="mx-auto max-w-[620px] text-center">
          <framerMotion.h2
            className="font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]"
            initial={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.5 }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            Common questions.
          </framerMotion.h2>
        </div>
        <div className="mx-auto mt-10 max-w-[760px] divide-y divide-[var(--color-rim)] border-y border-[var(--color-rim)]">
          {faqItems.map(([question, answer]) => (
            <details className="group py-5" key={question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-body)]">
                {question}
                <CaretDown className="flex-shrink-0 transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-180" size={16} weight="regular" />
              </summary>
              <p className="pt-3 pr-10 text-[14px] leading-7 text-[var(--color-subtext)]">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="mx-auto max-w-[720px] text-center">
          <framerMotion.h2
            className="font-[var(--font-heading)] text-[clamp(36px,6vw,64px)] font-extrabold leading-[1.02] text-[var(--color-title)]"
            initial={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            Start running incidents<br className="hidden sm:block" /> the right way.
          </framerMotion.h2>
          <framerMotion.p
            className="mx-auto mt-5 max-w-[440px] text-[16px] leading-relaxed text-[var(--color-subtext)]"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1 }}
          >
            14 days free. No credit card. Set up in under two minutes.
          </framerMotion.p>
          <framerMotion.div
            className="mt-8"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <Link className="btn btn-primary btn-lg" href="/register?plan=starter&interval=monthly">Start free trial</Link>
          </framerMotion.div>
        </div>
      </section>

      <footer className="px-6 pb-10 pt-12 md:px-8">
        <div className="mx-auto max-w-[960px] border-t border-[var(--color-rim)] pt-10">
          <div className="grid gap-y-8 gap-x-16 justify-items-center text-center sm:justify-items-start sm:text-left sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <TrustLoopLogo size={16} variant="full" />
              <p className="mt-3 max-w-[200px] text-[13px] leading-relaxed text-[var(--color-ghost)]">AI incident operations for teams that ship.</p>
              <div className="mt-5 flex items-center justify-center sm:justify-start gap-4">
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://x.com" rel="noreferrer" target="_blank"><XLogo size={16} weight="regular" /></a>
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://github.com" rel="noreferrer" target="_blank"><GithubLogo size={16} weight="regular" /></a>
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://linkedin.com" rel="noreferrer" target="_blank"><LinkedinLogo size={16} weight="regular" /></a>
              </div>
              <p className="mt-4 text-[12px] text-[var(--color-ghost)]">© {new Date().getFullYear()} TrustLoop, Inc.</p>
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Product</p>
              {[["Changelog", "/changelog"], ["Pricing", "#pricing"], ["Docs", "/docs"], ["Status", "/status"]].map(([label, href]) => (
                label === "Docs" ? (
                  <a className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label} target="_blank" rel="noreferrer">{label}</a>
                ) : label === "Pricing" ? (
                  <button className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)] text-left" key={label} onClick={() => { document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }} type="button">{label}</button>
                ) : (
                  <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
                )
              ))}
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Company</p>
              {[["Blog", "/blog"], ["About", "/about"], ["Security", "/security"]].map(([label, href]) => (
                <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
              ))}
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Legal</p>
              {[["Terms", "/terms"], ["Privacy", "/privacy"], ["DPA", "/dpa"], ["Billing", "/billing-policy"]].map(([label, href]) => (
                <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
              ))}
            </div>
          </div>

        </div>
      </footer>
      <div className="relative mx-auto" style={{ maxWidth: "960px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo/%E2%88%9E.svg" alt="" loading="lazy" className="block w-full opacity-10" style={{ clipPath: "inset(0 0 25% 0)", marginBottom: "-25%", maxWidth: "960px" }} draggable={false} onContextMenu={(e) => e.preventDefault()} />
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='6' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "200px",
            WebkitMaskImage: "url(/Logo/%E2%88%9E.svg)",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url(/Logo/%E2%88%9E.svg)",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        />
      </div>
    </>
  );
}
