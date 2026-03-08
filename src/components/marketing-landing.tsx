"use client";

import Link from "next/link";
import { useRef, type ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion as framerMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { motion as motionDev } from "motion/react";
import {
  ArrowRight,
  BellRing,
  Bot,
  Check,
  Gauge,
  Handshake,
  LayoutDashboard,
  MailCheck,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Feature = {
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
};

type Step = {
  title: string;
  detail: string;
};

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  bullets: string[];
  cta: string;
  featured?: boolean;
};

const features: Feature[] = [
  {
    title: "Intake to owner in under 5 minutes",
    copy: "Capture incidents from support tickets, classify severity, and assign accountable owners instantly.",
    icon: Workflow,
  },
  {
    title: "AI triage with provider routing",
    copy: "Route triage and draft generation to OpenAI, Gemini, or Anthropic per workflow in settings.",
    icon: Bot,
  },
  {
    title: "Safe customer communication",
    copy: "Generate customer-ready updates with approval controls and full timeline traceability.",
    icon: MailCheck,
  },
  {
    title: "Executive reliability view",
    copy: "Monitor incident trendlines, coverage, and response timings through workspace read models.",
    icon: LayoutDashboard,
  },
  {
    title: "Tenant-aware limits and quotas",
    copy: "Enforce per-workspace throttles and daily caps to protect reliability as usage scales.",
    icon: Gauge,
  },
  {
    title: "Enterprise-grade key handling",
    copy: "Customer API keys are encrypted at rest, never logged, and used only server-side.",
    icon: ShieldCheck,
  },
];

const steps: Step[] = [
  {
    title: "Ingest",
    detail: "Support lead logs a customer-facing AI failure with ticket context and impact notes.",
  },
  {
    title: "Triage",
    detail: "TrustLoop runs AI triage, proposes severity + owner actions, and appends timeline events.",
  },
  {
    title: "Respond",
    detail: "Ops publishes approved customer updates while leadership monitors exposure and SLA risk.",
  },
  {
    title: "Learn",
    detail: "Read models summarize trends, recurrence patterns, and response quality for weekly review.",
  },
];

const plans: Plan[] = [
  {
    name: "Starter",
    price: "$199",
    period: "/workspace/mo",
    description: "For early-stage AI product teams handling customer incidents weekly.",
    bullets: [
      "1 workspace",
      "Up to 500 incidents / month",
      "Provider BYOK: OpenAI, Gemini, Anthropic",
      "Email reminders and executive trends",
    ],
    cta: "Start Starter",
  },
  {
    name: "Scale",
    price: "$649",
    period: "/workspace/mo",
    description: "For multi-team SaaS organizations with daily AI incident operations.",
    bullets: [
      "3 workspaces",
      "Advanced quotas and rate limits",
      "Priority queue worker throughput",
      "Advanced analytics and export",
    ],
    cta: "Start Scale",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For regulated and high-volume software companies with strict reliability targets.",
    bullets: [
      "Unlimited workspaces",
      "SSO and custom retention",
      "Private networking and VPC options",
      "Dedicated onboarding and support",
    ],
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    question: "Do we need to use your AI keys?",
    answer:
      "No. TrustLoop is built for BYOK. You configure your own OpenAI, Gemini, and Anthropic keys per workspace.",
  },
  {
    question: "How are API keys protected?",
    answer:
      "Keys are encrypted at rest, never returned in full after save, never logged, and only used in server-side workflows.",
  },
  {
    question: "Can we enforce quotas per workspace?",
    answer:
      "Yes. You can configure tenant-aware request-per-minute limits and daily quotas for incident automation workflows.",
  },
  {
    question: "Does it support executive reporting?",
    answer:
      "Yes. TrustLoop builds read models for incident trends, coverage, response timing, and workload summaries.",
  },
];

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingLanding() {
  const scope = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 220]);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(min-width: 768px)", () => {
        gsap.to(".parallax-slow", {
          yPercent: -16,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });

        gsap.to(".parallax-fast", {
          yPercent: -28,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
      });

      gsap.from(".reveal-in", {
        opacity: 0,
        y: 36,
        duration: 0.8,
        stagger: 0.09,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".reveal-grid",
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      return () => {
        media.revert();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative overflow-clip pb-20">
      <framerMotion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(32,154,205,0.35),_rgba(32,154,205,0))] blur-3xl parallax-slow"
        style={{ y: heroY }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-90px] top-[320px] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(250,173,20,0.32),_rgba(250,173,20,0))] blur-3xl parallax-fast"
      />

      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[rgba(2,6,23,0.78)] backdrop-blur-xl">
        <div className="container-shell flex items-center justify-between gap-4 py-4">
          <Link className="flex items-center gap-2 text-sm font-bold tracking-wide text-white" href="#top">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white">
              TL
            </span>
            TrustLoop
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-400 md:flex">
            {navLinks.map((item) => (
              <a className="transition-colors hover:text-slate-950" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link className="btn btn-ghost hidden md:inline-flex" href="/docs">
              Documentation
            </Link>
            <Link className="btn btn-ghost hidden sm:inline-flex" href="/login">
              Sign in
            </Link>
            <Link className="btn btn-primary" href="/register">
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="container-shell relative pt-20 md:pt-24">
        <section className="grid gap-12 pb-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-24">
          <div className="space-y-6">
            <motionDev.div
              animate={{ opacity: [0.85, 1, 0.85] }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-400 shadow-sm"
              transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
            >
              <Sparkles className="h-4 w-4 text-cyan-600" />
              Incident ops SaaS for AI software companies
            </motionDev.div>

            <framerMotion.h1
              animate={{ opacity: 1, y: 0 }}
              className="text-balance text-5xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              Turn AI incidents into fast, customer-safe resolutions.
            </framerMotion.h1>

            <framerMotion.p
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl text-lg leading-relaxed text-neutral-400"
              initial={{ opacity: 0, y: 16 }}
              transition={{ delay: 0.08, duration: 0.52 }}
            >
              TrustLoop unifies intake, triage, ownership, and customer communication so your support and product teams stop managing critical AI failures in scattered tools.
            </framerMotion.p>

            <div className="flex flex-wrap gap-4">
              <motionDev.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link className="btn btn-primary" href="/register">
                  Launch workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motionDev.div>
              <Link className="btn btn-ghost" href="/docs">
                Read docs
              </Link>
              <Link className="btn btn-ghost" href="#pricing">
                See pricing
              </Link>
            </div>

            <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                { label: "Faster time to owner", value: "74%" },
                { label: "AI draft coverage", value: "92%" },
                { label: "Median incident update", value: "11 min" },
              ].map((stat) => (
                <div
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-4 shadow-sm"
                  key={stat.label}
                >
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <framerMotion.aside
            className="relative rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
          >
            <p className="kicker">Live incident flow</p>
            <div className="mt-4 space-y-4">
              {[
                {
                  title: "P1 hallucination spike detected",
                  meta: "Support intake -> Customer: NovaBank",
                  icon: BellRing,
                },
                {
                  title: "Triage run completed",
                  meta: "Suggested owner: Product Reliability",
                  icon: Bot,
                },
                {
                  title: "Customer update approved",
                  meta: "Comms sent via status channel",
                  icon: MailCheck,
                },
              ].map((item) => (
                <article
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                  key={item.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
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

            <div className="mt-6 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
              <video
                aria-label="TrustLoop explainer video"
                className="block h-auto w-full rounded-lg"
                controls
                playsInline
                poster="/videos/trustloop-how-it-works-poster.svg"
                preload="metadata"
              >
                <source src="/videos/trustloop-how-it-works.mp4" type="video/mp4" />
                Your browser does not support embedded video playback.
              </video>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              12-second walkthrough: intake, AI triage, customer updates, and executive visibility.
            </p>

            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <Handshake className="h-4 w-4" />
                SLA-safe update window met
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                Incident owner responded in 6 minutes with customer-safe draft.
              </p>
            </div>
          </framerMotion.aside>
        </section>

        <section className="pb-16 md:pb-20">
          <p className="kicker mb-4">Trusted by AI product and support teams</p>
          <div className="flex flex-wrap gap-2">
            {["VectorCore", "CloudRidge", "DeltaStack", "PairSignal", "PromptLoop", "StackWorks"].map(
              (logo) => (
                <span
                  className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold tracking-wide text-neutral-400"
                  key={logo}
                >
                  {logo}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="pb-16 md:pb-24" id="features">
          <div className="mb-8 max-w-3xl">
            <p className="kicker">Core capabilities</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Built to run incident operations at production scale.
            </h2>
          </div>
          <div className="reveal-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <framerMotion.article
                className="reveal-in rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                key={feature.title}
                transition={{ delay: index * 0.03, duration: 0.4 }}
                viewport={{ once: true, amount: 0.4 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{feature.copy}</p>
              </framerMotion.article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 pb-16 md:grid-cols-[1.02fr_0.98fr] md:items-start md:pb-24" id="workflow">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm">
            <p className="kicker">Workflow</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">From alert to executive signal.</h3>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div className="flex gap-4" key={step.title}>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-slate-100">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <p className="text-sm text-neutral-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motionDev.div
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm"
            transition={{ duration: 0.4 }}
            whileHover={{ y: -4 }}
          >
            <p className="kicker">What teams replace</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">Fragmented incident handling.</h3>
            <ul className="mt-4 space-y-4">
              {[
                "Ticket threads with no single owner",
                "Manual cross-posting to customer channels",
                "No shared severity language across teams",
                "Executive reports built from stale exports",
              ].map((item) => (
                <li className="flex items-start gap-2 text-sm text-neutral-400" key={item}>
                  <Check className="mt-0.5 h-4 w-4 text-cyan-700" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm font-semibold text-white">Production-ready stack</p>
              <p className="mt-1 text-sm text-neutral-400">
                Postgres, Redis, autoscaled workers, tenant-aware limits, and Stytch + Resend integrations.
              </p>
            </div>
          </motionDev.div>
        </section>

        <section className="pb-16 md:pb-24" id="pricing">
          <div className="mb-8 max-w-3xl">
            <p className="kicker">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Clear pricing for incident volume and operational maturity.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const cardClass = plan.featured
                ? "rounded-lg border border-cyan-300 bg-neutral-900 p-8 text-white shadow-sm"
                : "rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm";

              return (
                <motionDev.article
                  className={cardClass}
                  key={plan.name}
                  transition={{ duration: 0.35 }}
                  whileHover={{ y: -5 }}
                >
                  <p className="kicker text-inherit/80">{plan.name}</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="pb-1 text-sm opacity-85">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm opacity-90">{plan.description}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {plan.bullets.map((item) => (
                      <li className="flex items-start gap-2" key={item}>
                        <Check className="mt-0.5 h-4 w-4" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={`btn mt-6 w-full justify-center ${plan.featured ? "bg-white text-cyan-700 hover:bg-neutral-900" : "btn-primary"}`}
                    href="/register"
                  >
                    {plan.cta}
                  </Link>
                </motionDev.article>
              );
            })}
          </div>
        </section>

        <section className="pb-16 md:pb-24" id="faq">
          <div className="mb-8 max-w-3xl">
            <p className="kicker">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Everything needed to evaluate and launch quickly.
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                className="group rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-sm"
                key={faq.question}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                  {faq.question}
                  <span className="text-sm text-neutral-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-neutral-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <framerMotion.div
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-white shadow-sm md:p-10"
            initial={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="kicker text-slate-200">Ready to ship safer AI products?</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl">
              Move incident response from reactive chaos to a measurable operating system.
            </h2>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link className="btn bg-white text-white hover:bg-neutral-900" href="/register">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="btn border-white/50 bg-transparent text-white hover:bg-neutral-900" href="/login">
                Sign in
              </Link>
            </div>
          </framerMotion.div>
        </section>
      </main>

      <footer className="border-t border-neutral-800 bg-[rgba(2,6,23,0.75)] backdrop-blur-md">
        <div className="container-shell grid gap-6 py-8 md:grid-cols-4">
          <div>
            <p className="text-base font-bold text-white">TrustLoop</p>
            <p className="mt-2 text-sm text-neutral-400">
              Incident operations SaaS for software companies shipping AI to production.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-400">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#workflow">Workflow</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <Link href="/docs">Documentation</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Platform</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-400">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> BYOK encryption
              </li>
              <li className="flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Workspace quotas
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI triage automation
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get Started</p>
            <p className="mt-2 text-sm text-neutral-400">
              Launch your workspace and connect provider keys in under 10 minutes.
            </p>
            <Link className="btn btn-primary mt-4" href="/register">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
