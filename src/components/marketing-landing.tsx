"use client";

import Link from "next/link";
import { useRef, type ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion as framerMotion,
  useScroll,
  useSpring,
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

import { HeroIllustration } from "./hero-illustration";
import { FeatureIllustration } from "./feature-illustrations";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Feature = {
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
  illType: "workflow" | "bot" | "mail" | "dashboard" | "gauge" | "shield";
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
    illType: "workflow",
  },
  {
    title: "AI triage with provider routing",
    copy: "Route triage and draft generation to OpenAI, Gemini, or Anthropic per workflow in settings.",
    icon: Bot,
    illType: "bot",
  },
  {
    title: "Safe customer communication",
    copy: "Generate customer-ready updates with approval controls and full timeline traceability.",
    icon: MailCheck,
    illType: "mail",
  },
  {
    title: "Executive reliability view",
    copy: "Monitor incident trendlines, coverage, and response timings through workspace read models.",
    icon: LayoutDashboard,
    illType: "dashboard",
  },
  {
    title: "Tenant-aware limits and quotas",
    copy: "Enforce per-workspace throttles and daily caps to protect reliability as usage scales.",
    icon: Gauge,
    illType: "gauge",
  },
  {
    title: "Enterprise-grade key handling",
    copy: "Customer API keys are encrypted at rest, never logged, and used only server-side.",
    icon: ShieldCheck,
    illType: "shield",
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
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 220]);

  const shrinkProgress = useSpring(useTransform(scrollY, [0, 150], [0, 1]), { 
    stiffness: 120, 
    damping: 24, 
    mass: 0.8 
  });
  
  // Outer wrapper padding creates the smooth shrink effect
  const paddingTop = useTransform(shrinkProgress, [0, 1], [0, 16]);
  const paddingX = useTransform(shrinkProgress, [0, 1], [0, 24]);
  
  // Inner pill styles
  const headerRadius = useTransform(shrinkProgress, [0, 1], [0, 24]);
  const headerBg = useTransform(shrinkProgress, [0, 1], ["rgba(10, 10, 10, 0)", "rgba(10, 10, 10, 0.85)"]);
  const headerBorder = useTransform(shrinkProgress, [0, 1], ["rgba(64, 64, 64, 0)", "rgba(64, 64, 64, 1)"]);
  const headerShadow = useTransform(shrinkProgress, [0, 1], ["0px 0px 0px rgba(0,0,0,0)", "0px 8px 32px rgba(0,0,0,0.4)"]);

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

      <header className="sticky top-0 z-50 w-full">
        {/* Outer container animates padding to shrink the header inward on scroll */}
        <framerMotion.div
          style={{
            paddingTop,
            paddingLeft: paddingX,
            paddingRight: paddingX,
          }}
          className="flex w-full justify-center"
        >
          {/* Inner pill animates appearance (bg, radius, border, shadow) and limits content to hero's 1200px width */}
          <framerMotion.div
            style={{
              borderRadius: headerRadius,
              backgroundColor: headerBg,
              borderColor: headerBorder,
              borderWidth: 1,
              boxShadow: headerShadow,
            }}
            className="flex w-full max-w-[1200px] items-center justify-between px-6 py-4 backdrop-blur-xl transition-colors"
          >
            <Link className="flex items-center gap-3 text-sm font-bold tracking-wide text-white" href="#top">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm">
                TL
              </span>
              TrustLoop
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-400 md:flex">
              {navLinks.map((item) => (
                <a className="transition-colors hover:text-white" href={item.href} key={item.label}>
                  {item.label}
                </a>
              ))}
            </nav>
          </framerMotion.div>
        </framerMotion.div>
      </header>

      <main id="top" className="relative w-full pt-12 md:pt-16 px-6">
        {/* Centered Modern Hero Section */}
        <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center text-center pb-16 md:pb-24 pt-4 md:pt-8">
          <div className="space-y-8 flex flex-col items-center">
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
              className="text-balance text-6xl font-black leading-[1.02] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-neutral-500 sm:text-[84px]"
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <motionDev.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link className="btn btn-primary btn-lg" href="/register">
                  Launch workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motionDev.div>
              <Link className="btn btn-ghost btn-lg" href="/docs">
                Read docs
              </Link>
              <Link className="btn btn-ghost btn-lg" href="#pricing">
                See pricing
              </Link>
            </div>

            <HeroIllustration />

            <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3 pt-12">
              {[
                { label: "Faster time to owner", value: "74%" },
                { label: "AI draft coverage", value: "92%" },
                { label: "Median incident update", value: "11 min" },
              ].map((stat) => (
                <div
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-4 shadow-sm"
                  key={stat.label}
                >
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Incident Flow - Now Full Width Below Hero */}
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
                    className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:bg-neutral-800"
                    key={item.title}
                  >
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
                <video
                  aria-label="TrustLoop explainer video"
                  className="block h-auto w-full"
                  controls
                  playsInline
                  poster="/videos/trustloop-how-it-works-poster.svg"
                  preload="metadata"
                >
                  <source src="/videos/trustloop-how-it-works.mp4" type="video/mp4" />
                  Your browser does not support embedded video playback.
                </video>
              </div>

              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-400 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Handshake className="h-4 w-4" />
                  SLA-safe update window met
                </div>
                <p className="mt-1 text-xs text-emerald-500/80">
                  Incident owner responded in 6 minutes with customer-safe draft.
                </p>
              </div>
            </div>
          </framerMotion.aside>
        </section>

        <section className="mx-auto max-w-4xl pb-16 md:pb-24 text-center">
          <p className="kicker mb-6">Trusted by AI product and support teams</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["VectorCore", "CloudRidge", "DeltaStack", "PairSignal", "PromptLoop", "StackWorks"].map(
              (logo) => (
                <span
                  className="rounded-full border border-neutral-800 bg-neutral-900 px-6 py-2.5 text-xs font-semibold tracking-wide text-neutral-400 shadow-sm"
                  key={logo}
                >
                  {logo}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl pb-16 md:pb-32" id="features">
          <div className="mb-12 flex flex-col items-center text-center">
            <p className="kicker">Core capabilities</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Built to run incident operations at production scale.
            </h2>
          </div>
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <framerMotion.article
                className="flex flex-col items-start"
                initial={{ opacity: 0, y: 16 }}
                key={feature.title}
                transition={{ delay: index * 0.03, duration: 0.4 }}
                viewport={{ once: true, amount: 0.4 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <FeatureIllustration type={feature.illType} />
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-neutral-400">{feature.copy}</p>
              </framerMotion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] grid gap-16 pb-16 md:grid-cols-2 md:items-start md:pb-32" id="workflow">
          <div className="flex flex-col">
            <p className="kicker">Workflow</p>
            <h3 className="mt-4 text-4xl font-bold text-white leading-tight">From alert to executive signal.</h3>
            <div className="mt-12 space-y-10">
              {steps.map((step, index) => (
                <div className="flex gap-6" key={step.title}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-sm font-bold text-white shadow-sm">
                    {index + 1}
                  </span>
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
              {[
                "Ticket threads with no single owner",
                "Manual cross-posting to customer channels",
                "No shared severity language across teams",
                "Executive reports built from stale exports",
              ].map((item) => (
                <li className="flex items-start gap-4 text-lg text-neutral-400" key={item}>
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-900/30 text-cyan-500">
                    <Check className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 backdrop-blur-sm">
              <p className="text-base font-semibold text-white">Production-ready stack</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Postgres, Redis, autoscaled workers, tenant-aware limits, and Stytch + Resend integrations.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32" id="pricing">
          <div className="mb-12 flex flex-col items-center text-center">
            <p className="kicker">Pricing</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Clear pricing for incident volume and operational maturity.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const cardClass = plan.featured
                ? "grainy-card rounded-lg border border-cyan-300 bg-neutral-900 p-8 text-white shadow-sm"
                : "grainy-card rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-sm";

              const gradients = [
                "linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 165, 233, 0) 100%)",   // Sky
                "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(124, 58, 237, 0) 100%)", // Purple
                "linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(16, 185, 129, 0) 100%)"     // Emerald
              ];

              return (
                <motionDev.article
                  className={`${cardClass} flex flex-col`}
                  key={plan.name}
                  style={{ "--grain-gradient": gradients[index] } as React.CSSProperties}
                  transition={{ duration: 0.35 }}
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
                  <div className="mt-auto pt-8">
                    <Link
                      className={`btn w-full justify-center ${plan.featured ? "bg-white text-cyan-700 hover:bg-neutral-900" : "btn-primary"}`}
                      href="/register"
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </motionDev.article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32" id="faq">
          <div className="mb-12 flex flex-col items-center text-center">
            <p className="kicker">FAQ</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Everything needed to evaluate and launch quickly.
            </h2>
          </div>
          <div className="space-y-4 max-w-4xl mx-auto">
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

        <section className="mx-auto w-full max-w-[1200px] pb-16 md:pb-32">
          <framerMotion.div
            className="flex flex-col items-center text-center rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-white shadow-2xl md:p-16"
            initial={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="kicker text-neutral-400">Ready to ship safer AI products?</p>
            <h2 className="mt-6 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
              Move incident response from reactive chaos to a measurable operating system.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link className="btn btn-primary btn-lg" href="/register">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/login">
                Sign in
              </Link>
            </div>
          </framerMotion.div>
        </section>
      </main>

      <footer className="border-t border-neutral-800/50 bg-black/20 backdrop-blur-2xl px-6">
        <div className="mx-auto w-full max-w-[1200px] grid gap-10 py-16 md:grid-cols-4 md:py-24">
          <div className="flex flex-col items-start">
            <Link className="flex items-center gap-3 text-sm font-bold tracking-wide text-white" href="#top">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm">
                TL
              </span>
              TrustLoop
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 max-w-[240px]">
              Incident operations SaaS for software companies shipping AI to production.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li>
                <a className="transition-colors hover:text-white" href="#features">Features</a>
              </li>
              <li>
                <a className="transition-colors hover:text-white" href="#workflow">Workflow</a>
              </li>
              <li>
                <a className="transition-colors hover:text-white" href="#pricing">Pricing</a>
              </li>
              <li>
                <Link className="transition-colors hover:text-white" href="/docs">Documentation</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Platform</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li className="flex items-center gap-3 transition-colors hover:text-white">
                <ShieldCheck className="h-4 w-4" /> BYOK encryption
              </li>
              <li className="flex items-center gap-3 transition-colors hover:text-white">
                <Gauge className="h-4 w-4" /> Workspace quotas
              </li>
              <li className="flex items-center gap-3 transition-colors hover:text-white">
                <Sparkles className="h-4 w-4" /> AI triage automation
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get Started</p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Launch your workspace and connect provider keys in under 10 minutes.
            </p>
            <Link className="btn btn-primary mt-6 w-full justify-center" href="/register">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
