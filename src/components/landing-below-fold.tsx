"use client";

import Link from "next/link";
import { useState } from "react";
import { motion as framerMotion } from "framer-motion";
import {
  ArrowRight,
  Broadcast,
  CaretDown,
  ChartBar,
  ChartLineDown,
  ChatCircle,
  Check,
  Clock,
  GithubLogo,
  LinkedinLogo,
  Notepad,
  Robot,
  Sparkle,
  Warning,
  X,
  XLogo,
} from "@phosphor-icons/react";
import { FooterSubscribeForm } from "@/components/footer-subscribe-form";

import { TrustLoopLogo } from "@/components/trustloop-logo";

const integrationWordmarks = [
  "Datadog",
  "PagerDuty",
  "Sentry",
  "Slack",
  "Langfuse",
  "Helicone",
  "Arize Phoenix",
  "Braintrust",
];

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
    icon: Broadcast,
  },
  {
    number: "02",
    label: "Triage",
    title: "Provider intelligence stays under your control.",
    body: "Your AI provider analyzes the incident, suggests severity, root cause, and a customer-safe update using your key and your data.",
    icon: Robot,
  },
  {
    number: "03",
    label: "Respond",
    title: "Approval gates slow mistakes, not responders.",
    body: "Draft, review, and approve customer communications with configurable approval gates. Nothing goes out unreviewed.",
    icon: ChatCircle,
  },
  {
    number: "04",
    label: "Learn",
    title: "Every incident becomes operational leverage.",
    body: "Post-mortem generation, SLA breach reports, and executive analytics close the loop. The next response starts smarter.",
    icon: Notepad,
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
};

const plans: MarketingPlan[] = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    description: "For early-stage AI product teams handling customer incidents weekly.",
    featured: false,
    cta: { href: "/register", label: "Start trial", primary: false },
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
    annual: 119,
    description: "For teams running incident operations daily with tighter approval and reporting needs.",
    featured: true,
    cta: { href: "/register", label: "Start trial", primary: true },
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
    cta: { href: "mailto:hello@trustloop.dev", label: "Talk to sales", primary: false },
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

function WorkflowMockup({ index }: { index: number }) {
  const cards = [
    [
      ["Inbound signal", "PagerDuty: inference quality regression"],
      ["Severity", "P1 suggested"],
      ["Category", "Hallucination drift"],
    ],
    [
      ["Root cause", "Prompt package rollout"],
      ["Owner", "Product reliability"],
      ["Draft", "Customer-safe update ready"],
    ],
    [
      ["Approval", "Comms lead review"],
      ["Channel", "Status page + Slack"],
      ["Next update", "12 minutes"],
    ],
    [
      ["Post-mortem", "In progress"],
      ["SLA risk", "Contained"],
      ["Executive note", "Prepared"],
    ],
  ] as const;

  return (
    <div className="surface p-5">
      <div className="grid gap-3">
        {cards[index].map(([label, value]) => (
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-void)] p-3" key={label}>
            <p className="metric-label">{label}</p>
            <p className="mt-2 text-sm text-[var(--color-title)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingBelowFold() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <section className="marketing-section pt-12">
        <div className="text-center">
          <p className="page-kicker">Works with your monitoring stack</p>
        </div>
        <div className="mt-6 overflow-hidden border-y border-[var(--color-rim)] py-4">
          <div className="logo-marquee-track flex min-w-max gap-8">
            {[...integrationWordmarks, ...integrationWordmarks].map((logo, index) => (
              <span className="font-[var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--color-ghost)]" key={`${logo}-${index}`}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="features">
        <div className="mx-auto max-w-[680px] text-center">
          <h2 className="font-[var(--font-heading)] text-[36px] font-bold leading-[1.05] text-[var(--color-title)]">
            AI failures need a different playbook.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[16px] text-[var(--color-subtext)]">
            Standard incident tooling breaks down when the failure surface includes models, prompts, evaluation drift, and customer trust.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {problemCards.map((card) => (
            <framerMotion.article
              className="marketing-card border border-[var(--color-rim)] bg-[var(--color-surface)] p-[28px_24px]"
              initial={{ opacity: 0, y: 16 }}
              key={card.title}
              transition={{ duration: 0.35 }}
              viewport={{ once: true, amount: 0.3 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <card.icon color={card.color} size={36} weight="duotone" />
              <h3 className="mt-5 font-[var(--font-heading)] text-[20px] font-semibold text-[var(--color-title)]">
                {card.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-[var(--color-subtext)]">{card.body}</p>
            </framerMotion.article>
          ))}
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="workflow">
        <div className="relative grid gap-12">
          <div aria-hidden className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-[var(--color-rim)] via-[var(--color-signal)] to-[var(--color-rim)] opacity-30 lg:block" />
          {workflowSteps.map((step, index) => {
            const reverse = index % 2 === 1;
            return (
              <div className={`grid items-center gap-8 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""}`} key={step.number}>
                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-[-18px] font-[var(--font-heading)] text-[120px] font-extrabold leading-none text-[rgba(92,92,102,0.06)]">
                    {step.number}
                  </div>
                  <div className="relative z-10 max-w-[480px]">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-signal)] bg-[var(--color-signal-dim)]">
                        <step.icon color="var(--color-signal)" size={16} weight="duotone" />
                      </span>
                      <p className="page-kicker text-[var(--color-signal)]">{step.label}</p>
                    </div>
                    <h3 className="mt-4 font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-[15px] leading-7 text-[var(--color-subtext)]">{step.body}</p>
                  </div>
                </div>
                <WorkflowMockup index={index} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="integrations">
        <div className="mx-auto max-w-[620px] text-center">
          <h2 className="font-[var(--font-heading)] text-[36px] font-bold leading-[1.05] text-[var(--color-title)]">
            Connects to where failures happen.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {integrationCards.map(([name, description, Icon]) => (
            <article className="surface surface-clickable p-5" key={name}>
              <Icon color="var(--color-subtext)" size={28} weight="duotone" />
              <h3 className="mt-4 font-[var(--font-heading)] text-[15px] font-semibold text-[var(--color-title)]">{name}</h3>
              <p className="mt-2 text-[13px] text-[var(--color-subtext)]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="pricing">
        <div className="mx-auto max-w-[560px] text-center">
          <h2 className="font-[var(--font-heading)] text-[36px] font-bold leading-[1.05] text-[var(--color-title)]">
            Pricing that makes sense.
          </h2>
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] p-1.5">
            <button className={annual ? "btn btn-ghost" : "btn btn-primary"} onClick={() => setAnnual(false)} type="button">
              Monthly
            </button>
            <button className={annual ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setAnnual(true)} type="button">
              Annual
              <span className="ml-1 rounded-full bg-[var(--color-signal-dim)] px-2 py-0.5 text-[11px] text-[var(--color-signal)]">save 20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              className={`relative rounded-[var(--radius-xl)] border p-6 ${plan.featured ? "bg-[var(--color-raised)] border-[var(--color-signal)] shadow-[0_0_0_1px_var(--color-signal)]" : plan.monthly === null ? "bg-gradient-to-b from-[var(--color-raised)] to-[var(--color-surface)] border-[var(--color-muted)]" : "bg-[var(--color-surface)] border-[var(--color-rim)]"}`}
              key={plan.name}
            >
              {plan.featured ? (
                <span className="absolute left-6 top-[-12px] badge badge-info bg-[var(--color-signal-dim)] text-[var(--color-signal)] border-transparent">
                  Most Popular
                </span>
              ) : null}
              <h3 className="font-[var(--font-heading)] text-[16px] font-extrabold text-[var(--color-title)]">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-[var(--font-heading)] text-[48px] font-extrabold leading-none text-[var(--color-bright)]">
                  {plan.monthly === null ? "Custom" : `$${annual ? plan.annual : plan.monthly}`}
                </span>
                <span className="pb-2 text-[16px] text-[var(--color-subtext)]">
                  {plan.monthly === null ? "" : "/mo"}
                </span>
              </div>
              <p className="mt-4 max-w-[220px] text-[14px] leading-6 text-[var(--color-subtext)]">{plan.description}</p>
              <div className="mt-6 h-px bg-[var(--color-rim)]" />
              <ul className="mt-6 grid gap-3 text-[14px] text-[var(--color-body)]">
                {plan.features.map(([feature, enabled]) => (
                  <li className="flex items-center gap-2" key={feature}>
                    {enabled ? (
                      <Check color="var(--color-signal)" size={16} weight="regular" />
                    ) : (
                      <X color="var(--color-ghost)" size={16} weight="regular" />
                    )}
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                className={`mt-8 inline-flex w-full justify-center ${plan.cta.primary ? "btn btn-primary" : "btn btn-ghost"}`}
                href={plan.cta.href}
              >
                {plan.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section scroll-mt-24" id="faq">
        <div className="mx-auto max-w-[620px] text-center">
          <h2 className="font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">
            Common questions.
          </h2>
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
        <div className="dot-grid-band rounded-[var(--radius-xl)] border border-[var(--color-rim)] px-6 py-16 text-center md:px-12">
          <h2 className="font-[var(--font-heading)] text-[52px] font-extrabold leading-none text-[var(--color-title)]">
            One tool for your entire incident workflow.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-7 text-[var(--color-subtext)]">
            Structured detection, calm response coordination, and the reporting layer leadership actually needs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary btn-lg" href="/register">Start 14-day trial</Link>
            <a className="btn btn-ghost btn-lg" href="mailto:hello@trustloop.dev">Talk to us</a>
          </div>
        </div>
      </section>

      <footer className="marketing-section border-t border-[var(--color-rim)] bg-[var(--color-surface)] px-6 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="grid gap-4">
            <TrustLoopLogo size={16} variant="full" />
            <p className="text-[13px] text-[var(--color-subtext)]">AI incident operations for teams that ship.</p>
            <p className="text-[12px] text-[var(--color-ghost)]">© 2026 TrustLoop. All rights reserved.</p>
          </div>

          <div className="grid gap-3">
            <p className="text-[13px] font-medium text-[var(--color-subtext)]">Product</p>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/changelog">Changelog</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/pricing">Pricing</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/docs">Docs</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/status">Status</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/api-docs">API Reference</Link>
          </div>

          <div className="grid gap-3">
            <p className="text-[13px] font-medium text-[var(--color-subtext)]">Company</p>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/blog">Blog</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/about">About</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/terms">Terms</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/privacy">Privacy</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/security">Security</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/dpa">DPA</Link>
            <Link className="text-[14px] text-[var(--color-body)] hover:text-[var(--color-bright)]" href="/billing-policy">Billing Policy</Link>
          </div>

          <div>
            <p className="text-[13px] font-medium text-[var(--color-subtext)]">Stay in the loop</p>
            <p className="mt-2 text-[12px] text-[var(--color-ghost)]">Product updates, incident best practices.</p>
            <FooterSubscribeForm />
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4 border-t border-[var(--color-rim)] pt-6">
          <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-subtext)]" href="https://x.com" rel="noreferrer" target="_blank">
            <XLogo size={18} weight="regular" />
          </a>
          <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-subtext)]" href="https://github.com" rel="noreferrer" target="_blank">
            <GithubLogo size={18} weight="regular" />
          </a>
          <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-subtext)]" href="https://linkedin.com" rel="noreferrer" target="_blank">
            <LinkedinLogo size={18} weight="regular" />
          </a>
        </div>
      </footer>
    </>
  );
}
