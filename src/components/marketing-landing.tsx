"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AnimatePresence,
  motion as framerMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  List,
  X,
} from "@phosphor-icons/react";
import { HoverLink } from "@/components/hover-link";
import { HeroIllustration } from "@/components/hero-illustration";
import { TrustLoopLogo } from "@/components/trustloop-logo";

const LandingBelowFold = dynamic(() => import("./landing-below-fold").then((m) => ({ default: m.LandingBelowFold })), {
  loading: () => <div className="min-h-screen" />,
});

gsap.registerPlugin(useGSAP, ScrollTrigger);

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "How It Works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
] as const;

export function MarketingLanding() {
  const scope = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 180]);
  const shrinkProgress = useSpring(useTransform(scrollY, [0, 120], [0, 1]), {
    stiffness: 120,
    damping: 26,
    mass: 0.8,
  });

  const headerPadding = useTransform(shrinkProgress, [0, 1], [0, 10]);
  const headerRadius = useTransform(shrinkProgress, [0, 1], [0, 14]);
  const headerBg = useTransform(shrinkProgress, [0, 1], ["rgba(11,12,14,0)", "rgba(11,12,14,0.96)"]);
  const headerBorder = useTransform(shrinkProgress, [0, 1], ["rgba(37,37,41,0)", "rgba(37,37,41,1)"]);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(min-width: 768px)", () => {
        gsap.to(".landing-parallax-slow", {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
        gsap.to(".landing-parallax-fast", {
          yPercent: -20,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
      });
      return () => media.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative overflow-clip bg-[var(--color-void)]">
      <framerMotion.div
        aria-hidden
        className="landing-parallax-slow pointer-events-none absolute left-[-120px] top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(232,87,42,0.14),transparent_70%)] blur-3xl"
        style={{ y: heroY }}
      />
      <div
        aria-hidden
        className="landing-parallax-fast pointer-events-none absolute right-[-140px] top-[280px] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)] blur-3xl"
      />

      <header className="sticky top-0 z-50 px-6">
        <framerMotion.div style={{ paddingTop: headerPadding }} className="flex justify-center">
          <framerMotion.div
            className="flex w-full max-w-[1160px] items-center justify-between px-4 py-3 md:px-6"
            style={{
              backgroundColor: headerBg,
              borderColor: headerBorder,
              borderRadius: headerRadius,
              borderWidth: 1,
            }}
          >
            <a href="#top">
              <TrustLoopLogo size={18} variant="full" />
            </a>

            <nav className="hidden items-center gap-8 text-[14px] text-[var(--color-subtext)] md:flex">
              {navLinks.map((item) => (
                item.href.startsWith("/") ? (
                  <HoverLink className="transition-colors hover:text-[var(--color-bright)]" href={item.href} key={item.label}>
                    {item.label}
                  </HoverLink>
                ) : (
                  <a className="transition-colors hover:text-[var(--color-bright)]" href={item.href} key={item.label}>
                    {item.label}
                  </a>
                )
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <HoverLink className="btn btn-ghost btn-sm" href="/login">Sign in</HoverLink>
              <HoverLink className="btn btn-primary btn-sm" href="/register">Request access</HoverLink>
            </div>

            <button
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              className="btn btn-ghost btn-sm md:hidden"
              onClick={() => setMobileNavOpen((value) => !value)}
              type="button"
            >
              {mobileNavOpen ? <X size={18} weight="regular" /> : <List size={18} weight="regular" />}
            </button>
          </framerMotion.div>
        </framerMotion.div>
      </header>

      <AnimatePresence>
        {mobileNavOpen ? (
          <framerMotion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[70] bg-[var(--color-void)] px-6 py-8 md:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between">
              <TrustLoopLogo size={18} variant="full" />
              <button className="btn btn-ghost btn-sm" onClick={() => setMobileNavOpen(false)} type="button">
                <X size={18} weight="regular" />
              </button>
            </div>
            <div className="mt-16 grid gap-6">
              {navLinks.map((item) => (
                item.href.startsWith("/") ? (
                  <HoverLink
                    className="font-[var(--font-heading)] text-[28px] leading-none text-[var(--color-title)]"
                    href={item.href}
                    key={item.label}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </HoverLink>
                ) : (
                  <a
                    className="font-[var(--font-heading)] text-[28px] leading-none text-[var(--color-title)]"
                    href={item.href}
                    key={item.label}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              ))}
            </div>
          </framerMotion.div>
        ) : null}
      </AnimatePresence>

      <main id="top" className="marketing-shell pb-20 pt-10 md:pt-14">
        <section className="marketing-section !pt-8 text-center">
          <div className="mx-auto max-w-[760px]">
            <p className="page-kicker">AI Incident Operations</p>
            <framerMotion.h1
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 font-[var(--font-display)] text-[length:var(--text-hero-size)] italic leading-[var(--text-hero-line)] text-[var(--color-title)]"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              When your AI fails, your team{" "}
              <span className="text-[var(--color-signal)]">shouldn&apos;t.</span>
            </framerMotion.h1>
            <framerMotion.p
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-6 max-w-[520px] text-[18px] leading-[1.6] text-[var(--color-subtext)]"
              initial={{ opacity: 0, y: 16 }}
              transition={{ delay: 0.08, duration: 0.48 }}
            >
              TrustLoop turns AI failures into structured, customer-safe responses from detection to post-mortem, in one workspace.
            </framerMotion.p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <HoverLink className="btn btn-primary btn-lg" href="/register">
                Start free trial
              </HoverLink>
              <a className="btn btn-ghost btn-lg" href="#workflow">
                See how it works
                <ArrowRight size={16} weight="regular" />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[12px] text-[var(--color-ghost)]">
              <span>Trusted by teams shipping production AI</span>
              {["ACME AI", "CORE ML", "VANTAGE", "NEXUS"].map((logo) => (
                <span className="font-[var(--font-mono)] tracking-[0.14em]" key={logo}>{logo}</span>
              ))}
            </div>
          </div>

          <HeroIllustration />
        </section>

        <LandingBelowFold />
      </main>
    </div>
  );
}
