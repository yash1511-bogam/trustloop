"use client";

import { useRef } from "react";
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
import { ArrowRight, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

import { HoverLink } from "./hover-link";
import { HeroIllustration } from "./hero-illustration";

const LandingBelowFold = dynamic(() => import("./landing-below-fold").then((m) => ({ default: m.LandingBelowFold })), {
  loading: () => <div className="min-h-screen" />,
});

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
  
  const paddingTop = useTransform(shrinkProgress, [0, 1], [0, 16]);
  const paddingX = useTransform(shrinkProgress, [0, 1], [0, 24]);
  const headerRadius = useTransform(shrinkProgress, [0, 1], [0, 24]);
  const headerBg = useTransform(shrinkProgress, [0, 1], ["rgba(10, 10, 10, 0)", "rgba(10, 10, 10, 0.85)"]);
  const headerBorder = useTransform(shrinkProgress, [0, 1], ["rgba(64, 64, 64, 0)", "rgba(64, 64, 64, 1)"]);
  const headerShadow = useTransform(shrinkProgress, [0, 1], ["0px 0px 0px rgba(0,0,0,0)", "0px 8px 32px rgba(0,0,0,0.4)"]);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(min-width: 768px)", () => {
        gsap.to(".parallax-slow", {
          yPercent: -16, ease: "none",
          scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom bottom", scrub: true },
        });
        gsap.to(".parallax-fast", {
          yPercent: -28, ease: "none",
          scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom bottom", scrub: true },
        });
      });
      return () => { media.revert(); };
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
        <framerMotion.div style={{ paddingTop, paddingLeft: paddingX, paddingRight: paddingX }} className="flex w-full justify-center">
          <framerMotion.div
            style={{ borderRadius: headerRadius, backgroundColor: headerBg, borderColor: headerBorder, borderWidth: 1, boxShadow: headerShadow }}
            className="flex w-full max-w-[1200px] items-center justify-between px-6 py-4 backdrop-blur-xl transition-colors"
          >
            <a className="flex items-center gap-3 text-sm font-bold tracking-wide text-white" href="#top">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm">TL</span>
              TrustLoop
            </a>
            <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-400 md:flex">
              {navLinks.map((item) => (
                <a className="transition-colors hover:text-white" href={item.href} key={item.label}>{item.label}</a>
              ))}
            </nav>
          </framerMotion.div>
        </framerMotion.div>
      </header>

      <main id="top" className="relative w-full pt-12 md:pt-16 px-6">
        {/* Hero */}
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
                <HoverLink className="btn btn-primary btn-lg" href="/register">
                  Launch workspace
                  <ArrowRight className="h-4 w-4" />
                </HoverLink>
              </motionDev.div>
              <HoverLink className="btn btn-ghost btn-lg" href="/docs">Read docs</HoverLink>
              <a className="btn btn-ghost btn-lg" href="#pricing">See pricing</a>
            </div>

            <HeroIllustration />

            <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3 pt-12">
              {[
                { label: "Faster time to owner", value: "74%" },
                { label: "AI draft coverage", value: "92%" },
                { label: "Median incident update", value: "11 min" },
              ].map((stat) => (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-4 shadow-sm" key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingBelowFold />
      </main>
    </div>
  );
}
