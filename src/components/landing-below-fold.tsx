"use client";

import { useRef, useState, type ComponentType } from "react";
import { motion as framerMotion } from "framer-motion";
import { motion as motionDev } from "motion/react";
import {
  BellRing,
  Bot,
  Check,
  ChevronDown,
  Gauge,
  Handshake,
  LayoutDashboard,
  MailCheck,
  Minus,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { HoverLink } from "./hover-link";
import { FeatureIllustration } from "./feature-illustrations";
import { EarlyAccessForm } from "./early-access-form";

type Feature = {
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
  illType: "workflow" | "bot" | "mail" | "dashboard" | "gauge" | "shield";
};

const features: Feature[] = [
  { title: "Intake to owner in under 5 minutes", copy: "Capture incidents from support tickets, classify severity, and assign accountable owners instantly.", icon: Workflow, illType: "workflow" },
  { title: "AI triage with provider routing", copy: "Route triage and draft generation to OpenAI, Gemini, or Anthropic per workflow in settings.", icon: Bot, illType: "bot" },
  { title: "Safe customer communication", copy: "Generate customer-ready updates with approval controls and full timeline traceability.", icon: MailCheck, illType: "mail" },
  { title: "Executive reliability view", copy: "Monitor incident trendlines, coverage, and response timings through workspace read models.", icon: LayoutDashboard, illType: "dashboard" },
  { title: "Tenant-aware limits and quotas", copy: "Enforce per-workspace throttles and daily caps to protect reliability as usage scales.", icon: Gauge, illType: "gauge" },
  { title: "Enterprise-grade key handling", copy: "Customer API keys are encrypted at rest, never logged, and used only server-side.", icon: ShieldCheck, illType: "shield" },
];

const steps = [
  { title: "Ingest", detail: "Support lead logs a customer-facing AI failure with ticket context and impact notes." },
  { title: "Triage", detail: "TrustLoop runs AI triage, proposes severity + owner actions, and appends timeline events." },
  { title: "Respond", detail: "Ops publishes approved customer updates while leadership monitors exposure and SLA risk." },
  { title: "Learn", detail: "Read models summarize trends, recurrence patterns, and response quality for weekly review." },
];

const plans = [
  { name: "Starter", monthly: "$49", annual: "$39", period: "/workspace/mo", description: "For early-stage AI product teams handling customer incidents weekly.", bullets: ["Up to 50 incidents / day", "100 AI triage runs / day", "Provider BYOK: OpenAI, Gemini, Anthropic", "Email reminders and executive trends"], cta: "Start Starter" },
  { name: "Pro", monthly: "$149", annual: "$119", period: "/workspace/mo", description: "For multi-team SaaS organizations with daily AI incident operations.", bullets: ["Up to 200 incidents / day", "300 AI triage runs / day", "On-call rotation and compliance mode", "Advanced analytics, PDF export, and API keys"], cta: "Start Pro", featured: true },
  { name: "Enterprise", monthly: "Custom", annual: "Custom", period: "", description: "For regulated and high-volume software companies with strict reliability targets.", bullets: ["Unlimited incidents and triage runs", "SAML SSO and custom retention", "Private networking and VPC options", "Dedicated onboarding and support"], cta: "Contact Sales" },
];

const faqs = [
  { question: "Do we need to use your AI keys?", answer: "No. TrustLoop is built for BYOK. You configure your own OpenAI, Gemini, and Anthropic keys per workspace." },
  { question: "How are API keys protected?", answer: "Keys are encrypted at rest, never returned in full after save, never logged, and only used in server-side workflows." },
  { question: "Can we enforce quotas per workspace?", answer: "Yes. You can configure tenant-aware request-per-minute limits and daily quotas for incident automation workflows." },
  { question: "Does it support executive reporting?", answer: "Yes. TrustLoop builds read models for incident trends, coverage, response timing, and workload summaries." },
];

const comparisonRows = [
  { feature: "Price", starter: "$49/mo", pro: "$149/mo", enterprise: "Custom", starterAnnual: "$39/mo", proAnnual: "$119/mo", enterpriseAnnual: "Custom" },
  { feature: "Incidents per day", starter: "50", pro: "200", enterprise: "Unlimited" },
  { feature: "AI triage runs per day", starter: "100", pro: "300", enterprise: "Unlimited" },
  { feature: "Customer updates per day", starter: "100", pro: "300", enterprise: "Unlimited" },
  { feature: "Reminder emails per day", starter: "120", pro: "500", enterprise: "Unlimited" },
  { feature: "BYOK (OpenAI, Gemini, Anthropic)", starter: "✓", pro: "✓", enterprise: "✓" },
  { feature: "Webhook integrations", starter: "✓", pro: "✓", enterprise: "✓" },
  { feature: "Slack integration", starter: "✓", pro: "✓", enterprise: "✓" },
  { feature: "Public status page", starter: "✓", pro: "✓", enterprise: "✓" },
  { feature: "Executive analytics", starter: "✓", pro: "✓", enterprise: "✓" },
  { feature: "On-call rotation", starter: "—", pro: "✓", enterprise: "✓" },
  { feature: "Compliance mode", starter: "—", pro: "✓", enterprise: "✓" },
  { feature: "Incident PDF export", starter: "—", pro: "✓", enterprise: "✓" },
  { feature: "Workspace API keys", starter: "—", pro: "✓", enterprise: "✓" },
  { feature: "On-call phone escalation", starter: "—", pro: "✓", enterprise: "✓" },
  { feature: "SAML SSO", starter: "—", pro: "—", enterprise: "✓" },
  { feature: "Custom data retention", starter: "—", pro: "—", enterprise: "✓" },
  { feature: "Dedicated onboarding", starter: "—", pro: "—", enterprise: "✓" },
  { feature: "14-day free trial", starter: "✓", pro: "✓", enterprise: "✓" },
];

export function LandingBelowFold() {
  const comparisonRef = useRef<HTMLDivElement>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Live Incident Flow */}
      <section className="mx-auto max-w-5xl pb-16 md:pb-24">
        <framerMotion.aside
          className="relative grid gap-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl md:grid-cols-2 lg:p-12"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className="flex flex-col justify-center">
            <p className="kicker">Live incident flow</p>
            <h2 className="mt-4 text-3xl font-bold text-white">From detection to resolution in minutes.</h2>
            <p className="mt-4 text-neutral-400">
              12-second walkthrough: See how TrustLoop automates intake, AI triage, customer updates, and provides executive visibility.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { title: "P1 hallucination spike detected", meta: "Support intake -> Customer: NovaBank", icon: BellRing },
                { title: "Triage run completed", meta: "Suggested owner: Product Reliability", icon: Bot },
                { title: "Customer update approved", meta: "Comms sent via status channel", icon: MailCheck },
              ].map((item) => (
                <article className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:bg-neutral-800" key={item.title}>
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-white">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-neutral-400">{item.meta}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-6">
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-lg">
              <video aria-label="TrustLoop explainer video" className="block h-auto w-full" controls playsInline poster="/videos/trustloop-how-it-works-poster.svg" preload="metadata">
                <source src="/videos/trustloop-how-it-works.mp4" type="video/mp4" />
                Your browser does not support embedded video playback.
              </video>
            </div>
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-400 backdrop-blur-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Handshake className="h-4 w-4" />
                SLA-safe update window met
              </div>
              <p className="mt-1 text-xs text-emerald-500/80">Incident owner responded in 6 minutes with customer-safe draft.</p>
            </div>
          </div>
        </framerMotion.aside>
      </section>

      {/* Trusted by */}
      <section className="mx-auto max-w-4xl pb-16 md:pb-24 text-center">
        <p className="kicker mb-6">Trusted by AI product and support teams</p>
        <div className="flex flex-wrap justify-center gap-3">
          {["VectorCore", "CloudRidge", "DeltaStack", "PairSignal", "PromptLoop", "StackWorks"].map((logo) => (
            <span className="rounded-full border border-neutral-800 bg-neutral-900 px-6 py-2.5 text-xs font-semibold tracking-wide text-neutral-400 shadow-sm" key={logo}>{logo}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl pb-16 md:pb-32" id="features">
        <div className="mb-12 flex flex-col items-center text-center">
          <p className="kicker">Core capabilities</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">Built to run incident operations at production scale.</h2>
        </div>
        <div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <framerMotion.article className="flex flex-col items-start" initial={{ opacity: 0, y: 16 }} key={feature.title} transition={{ delay: index * 0.03, duration: 0.4 }} viewport={{ once: true, amount: 0.4 }} whileInView={{ opacity: 1, y: 0 }}>
              <FeatureIllustration type={feature.illType} />
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-400">{feature.copy}</p>
            </framerMotion.article>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto w-full max-w-[1200px] grid gap-16 pb-16 md:grid-cols-2 md:items-start md:pb-32" id="workflow">
        <div className="flex flex-col">
          <p className="kicker">Workflow</p>
          <h3 className="mt-4 text-4xl font-bold text-white leading-tight">From alert to executive signal.</h3>
          <div className="mt-12 space-y-10">
            {steps.map((step, index) => (
              <div className="flex gap-6" key={step.title}>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-sm font-bold text-white shadow-sm">{index + 1}</span>
                <div>
                  <p className="text-lg font-semibold text-white">{step.title}</p>
                  <p className="mt-2 text-base leading-relaxed text-neutral-400">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center mt-12 md:mt-0 lg:pl-10">
          <p className="kicker">What teams replace</p>
          <h3 className="mt-4 text-4xl font-bold text-white leading-tight">Fragmented incident handling.</h3>
          <ul className="mt-12 space-y-8">
            {["Ticket threads with no single owner", "Manual cross-posting to customer channels", "No shared severity language across teams", "Executive reports built from stale exports"].map((item) => (
              <li className="flex items-start gap-4 text-lg text-neutral-400" key={item}>
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-900/30 text-cyan-500"><Check className="h-4 w-4" /></span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 backdrop-blur-sm">
            <p className="text-base font-semibold text-white">Built for production</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">Autoscaled workers, tenant-aware rate limits, encrypted key storage, and enterprise-grade access controls.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32" id="pricing">
        <div className="mb-12 flex flex-col items-center text-center">
          <p className="kicker">Pricing</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">Clear pricing for incident volume and operational maturity.</h2>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900 p-1">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!annual ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`} type="button">Monthly</button>
            <button onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${annual ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`} type="button">Annual <span className="text-xs text-emerald-400">Save 20%</span></button>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const cardClass = plan.featured
              ? "grainy-card rounded-lg border border-cyan-300 bg-neutral-900 p-8 text-white shadow-sm"
              : "grainy-card rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm";
            const gradients = [
              "linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 165, 233, 0) 100%)",
              "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(124, 58, 237, 0) 100%)",
              "linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(16, 185, 129, 0) 100%)",
            ];
            return (
              <motionDev.article className={`${cardClass} flex flex-col`} key={plan.name} style={{ "--grain-gradient": gradients[index] } as React.CSSProperties} transition={{ duration: 0.35 }}>
                <p className="kicker text-inherit/80">{plan.name}</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black">{annual ? plan.annual : plan.monthly}</span>
                  <span className="pb-1 text-sm opacity-85">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm opacity-90">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.bullets.map((item) => (
                    <li className="flex items-start gap-2" key={item}><Check className="mt-0.5 h-4 w-4" />{item}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <HoverLink className={`btn w-full justify-center ${plan.featured ? "bg-white text-cyan-700 hover:bg-neutral-900" : "btn-primary"}`} href={plan.name === "Enterprise" ? "mailto:sales@trustloop.dev" : "/#early-access"}>{plan.cta}</HoverLink>
                </div>
              </motionDev.article>
            );
          })}
        </div>
        <div className="mt-10 flex justify-center">
          <button className="btn btn-ghost btn-lg gap-2" onClick={() => setShowComparison((v) => { if (!v) setTimeout(() => comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); return !v; })} type="button">
            {showComparison ? "Hide" : "Check"} Full Comparison
            <ChevronDown className={`h-4 w-4 transition-transform ${showComparison ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showComparison && (
          <div ref={comparisonRef} className="mt-10 overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900">
                  <th className="px-6 py-4 text-left font-semibold text-white">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Starter</th>
                  <th className="px-6 py-4 text-center font-semibold text-cyan-400">Pro</th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => {
                  const vals = row.feature === "Price" && annual
                    ? [(row as Record<string, string>).starterAnnual ?? row.starter, (row as Record<string, string>).proAnnual ?? row.pro, (row as Record<string, string>).enterpriseAnnual ?? row.enterprise]
                    : [row.starter, row.pro, row.enterprise];
                  return (
                  <tr key={row.feature} className="border-b border-neutral-800/50 last:border-0">
                    <td className="px-6 py-3 text-neutral-300">{row.feature}</td>
                    {vals.map((val, i) => (
                      <td key={i} className="px-6 py-3 text-center">
                        {val === "✓" ? <Check className="mx-auto h-4 w-4 text-emerald-400" /> : val === "—" ? <Minus className="mx-auto h-4 w-4 text-neutral-600" /> : <span className="text-neutral-300">{val}</span>}
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32" id="faq">
        <div className="mb-12 flex flex-col items-center text-center">
          <p className="kicker">FAQ</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">Everything needed to evaluate and launch quickly.</h2>
        </div>
        <div className="space-y-4 max-w-4xl mx-auto">
          {faqs.map((faq) => (
            <details className="group rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-sm" key={faq.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                {faq.question}
                <span className="text-sm text-neutral-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA + Early Access */}
      <section id="early-access" className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32">
        <framerMotion.div className="grid gap-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-white shadow-2xl md:grid-cols-2 md:p-16" initial={{ opacity: 0, y: 14 }} transition={{ duration: 0.45 }} viewport={{ once: true, amount: 0.4 }} whileInView={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col justify-center">
            <p className="kicker text-neutral-400">Ready to ship safer AI products?</p>
            <h2 className="mt-6 text-3xl font-bold leading-tight text-white md:text-5xl">Move incident response from reactive chaos to a measurable operating system.</h2>
            <div className="mt-10 flex flex-wrap gap-4">
              <HoverLink className="btn btn-primary btn-lg" href="/#early-access">Start free trial <span aria-hidden>→</span></HoverLink>
              <HoverLink className="btn btn-ghost btn-lg" href="/login">Sign in</HoverLink>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-500">
                <Sparkles className="h-4 w-4" />
                Early Access
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">Request early access</h3>
              <p className="mb-6 text-sm text-neutral-400">
                Join the waitlist and we&apos;ll send you an invite code when your spot is ready.
              </p>
              <EarlyAccessForm />
            </div>
          </div>
        </framerMotion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 bg-black/20 backdrop-blur-2xl px-6">
        <div className="mx-auto w-full max-w-[1200px] grid gap-10 py-16 md:grid-cols-4 md:py-24">
          <div className="flex flex-col items-start">
            <a className="flex items-center gap-3 text-sm font-bold tracking-wide text-white" href="#top">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm">TL</span>
              TrustLoop
            </a>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 max-w-[240px]">Incident operations SaaS for software companies shipping AI to production.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li><a className="transition-colors hover:text-white" href="#features">Features</a></li>
              <li><a className="transition-colors hover:text-white" href="#workflow">Workflow</a></li>
              <li><a className="transition-colors hover:text-white" href="#pricing">Pricing</a></li>
              <li><HoverLink className="transition-colors hover:text-white" href="/docs">Documentation</HoverLink></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Platform</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li className="flex items-center gap-3 transition-colors hover:text-white"><ShieldCheck className="h-4 w-4" /> BYOK encryption</li>
              <li className="flex items-center gap-3 transition-colors hover:text-white"><Gauge className="h-4 w-4" /> Workspace quotas</li>
              <li className="flex items-center gap-3 transition-colors hover:text-white"><Sparkles className="h-4 w-4" /> AI triage automation</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get Started</p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">Launch your workspace and connect provider keys in under 10 minutes.</p>
            <HoverLink className="btn btn-primary mt-6 w-full justify-center" href="/#early-access">Create workspace</HoverLink>
          </div>
        </div>
      </footer>
    </>
  );
}
