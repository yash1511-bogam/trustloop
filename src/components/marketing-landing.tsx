"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AnimatePresence,
  motion as framerMotion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  List,
  X,
  ShieldWarning,
  Clock,
  ChartBar,
  Broadcast,
  Cpu,
  ChatCircle,
  GraduationCap,
} from "@phosphor-icons/react";
import { integrationLogos } from "@/components/integration-logos";
import { HoverLink } from "@/components/hover-link";
import { HeroIllustration } from "@/components/hero-illustration";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { MarketingFooter } from "@/components/marketing-footer";

const LandingBelowFold = dynamic(() => import("./landing-below-fold").then((m) => ({ default: m.LandingBelowFold })), {
  loading: () => <div className="min-h-screen" />,
});

gsap.registerPlugin(useGSAP, ScrollTrigger);

const navLinks = [
  { href: "#why", label: "Why TrustLoop" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const dropdownData: Record<string, Array<{ icon: React.ReactNode; title: string; desc: string }>> = {
  "#why": [
    { icon: <ShieldWarning size={20} color="#ef4444" weight="regular" />, title: "Built for AI failures", desc: "Understands hallucinations, bias drift, and model degradation." },
    { icon: <Clock size={20} color="#f59e0b" weight="regular" />, title: "Automated updates", desc: "No more copy-pasting under pressure across channels." },
    { icon: <ChartBar size={20} color="#8b5cf6" weight="regular" />, title: "Executive visibility", desc: "Leadership sees incidents before they escalate." },
  ],
  "#how-it-works": [
    { icon: <Broadcast size={20} color="#22d3ee" weight="regular" />, title: "Detect", desc: "Signals flow in from Datadog, PagerDuty, Sentry, or your team." },
    { icon: <Cpu size={20} color="#a78bfa" weight="regular" />, title: "Triage", desc: "AI suggests severity, root cause, and a customer-safe update." },
    { icon: <ChatCircle size={20} color="#34d399" weight="regular" />, title: "Respond", desc: "Approval gates ensure nothing goes out unreviewed." },
    { icon: <GraduationCap size={20} color="#fbbf24" weight="regular" />, title: "Learn", desc: "Post-mortems and analytics close the loop." },
  ],
  "#integrations": [
    { icon: <span className="[&_svg]:w-[18px] [&_svg]:h-[18px] text-[#632CA6]">{integrationLogos["Datadog"]}</span>, title: "Datadog", desc: "Infrastructure alerts and service health signals." },
    { icon: <span className="[&_svg]:w-[18px] [&_svg]:h-[18px] text-[#06AC38]">{integrationLogos["PagerDuty"]}</span>, title: "PagerDuty", desc: "Escalation entry points for urgent failures." },
    { icon: <span className="[&_svg]:w-[18px] [&_svg]:h-[18px] text-[#FB4226]">{integrationLogos["Sentry"]}</span>, title: "Sentry", desc: "Application errors and AI path regressions." },
    { icon: <span className="[&_svg]:w-[18px] [&_svg]:h-[18px] text-[#E01E5A]">{integrationLogos["Slack"]}</span>, title: "Slack", desc: "Responder coordination and approved updates." },
  ],
};

export function MarketingLanding() {
  const scope = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDropdown = hoveredNav && hoveredNav in dropdownData ? hoveredNav : null;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerBarRef = useRef<HTMLDivElement>(null);
  const [dropdownLeft, setDropdownLeft] = useState(0);

  const { scrollY } = useScroll();
  const shrinkProgress = useSpring(useTransform(scrollY, [0, 120], [0, 1]), {
    stiffness: 120,
    damping: 26,
    mass: 0.8,
  });

  const headerPadding = useTransform(shrinkProgress, [0, 1], [0, 0]);
  const headerRadius = useTransform(shrinkProgress, [0, 1], [0, 14]);
  const headerBg = useTransform(shrinkProgress, [0, 1], ["rgba(11,12,14,0)", "rgba(11,12,14,0.96)"]);
  const headerBorder = useTransform(shrinkProgress, [0, 1], ["rgba(37,37,41,0)", "rgba(37,37,41,1)"]);
  const headerBlur = useTransform(shrinkProgress, [0, 1], ["blur(0px)", "blur(12px)"]);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 60));

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(min-width: 768px)", () => {
      });
      return () => media.revert();
    },
    { scope },
  );

  const showBackToTop = useTransform(scrollY, [600, 601], [0, 1]);

  return (
    <div ref={scope} className="relative overflow-x-clip bg-[var(--color-void)]">
      <div className="fixed top-0 left-0 right-0 z-50 h-[15px] backdrop-blur-md bg-[var(--color-void)]/80" />
      <header
        className="sticky top-[15px] z-50 px-6"
        onMouseLeave={() => {
          hoverTimeout.current = setTimeout(() => setHoveredNav(null), 150);
        }}
      >
        <framerMotion.div style={{ paddingTop: headerPadding }} className="flex justify-center">
          <framerMotion.div
            ref={headerBarRef}
            className="relative flex w-full max-w-[1160px] items-center justify-between px-4 py-3 md:px-6"
            style={{
              backgroundColor: headerBg,
              borderColor: headerBorder,
              borderRadius: headerRadius,
              borderWidth: 1,
              backdropFilter: headerBlur,
              WebkitBackdropFilter: headerBlur,
            }}
          >
            <Link href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <TrustLoopLogo size={18} variant="full" color={scrolled ? "orange" : "white"} />
            </Link>

            <nav
              ref={navRef}
              className="relative hidden items-center gap-0 overflow-hidden rounded-[22px] bg-[#000000] px-1 py-[3px] text-[13px] text-[var(--color-subtext)] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.4)] md:flex"
            >
              {navLinks.map((item) => {
                return (
                  <div
                    key={item.label}
                    ref={(el) => { navItemRefs.current[item.href] = el; }}
                    onMouseEnter={() => {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoveredNav(item.href);
                      const el = navItemRefs.current[item.href];
                      const bar = headerBarRef.current;
                      if (el && bar) {
                        const elRect = el.getBoundingClientRect();
                        const barRect = bar.getBoundingClientRect();
                        setDropdownLeft(elRect.left - barRect.left + elRect.width / 2);
                      }
                    }}
                  >
                    <a
                      className={`relative z-10 block cursor-pointer rounded-md px-3 py-1.5 transition-colors ${hoveredNav === item.href ? "text-[var(--color-bright)]" : "hover:text-[var(--color-bright)]"}`}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {hoveredNav === item.href && (
                        <framerMotion.span
                          className="absolute inset-0 rounded-md bg-[var(--color-raised)]"
                          layoutId="nav-highlight"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </a>
                  </div>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <HoverLink className="btn btn-ghost btn-sm" href="/login">Sign in</HoverLink>
              <HoverLink className="btn btn-ghost btn-sm border border-[var(--color-rim)] transition-colors hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]" href="/early-access">Request access</HoverLink>
            </div>

            <button
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              className="btn btn-ghost btn-sm md:hidden"
              onClick={() => setMobileNavOpen((value) => !value)}
              type="button"
            >
              {mobileNavOpen ? <X size={18} weight="regular" /> : <List size={18} weight="regular" />}
            </button>

            {/* Dropdown — positioned at bottom of header bar */}
            <AnimatePresence>
              {activeDropdown && (
                <framerMotion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 hidden pt-1 md:block"
                  exit={{ opacity: 0, y: 4 }}
                  initial={{ opacity: 0, y: 4 }}
                  style={{ top: "100%", left: dropdownLeft, transform: "translateX(-50%)" }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                >
                  <framerMotion.div
                    className="overflow-hidden rounded-xl border border-[var(--color-rim)] bg-[var(--color-surface)] p-2 shadow-xl shadow-black/20 backdrop-blur-xl"
                    layout
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  >
                    <AnimatePresence mode="wait">
                      <framerMotion.div
                        animate={{ opacity: 1, x: 0 }}
                        className="w-[320px]"
                        exit={{ opacity: 0, x: -8 }}
                        initial={{ opacity: 0, x: 8 }}
                        key={activeDropdown}
                        transition={{ duration: 0.12 }}
                      >
                        {dropdownData[activeDropdown].map((entry) => (
                          <a
                            className="relative flex items-start gap-3 rounded-lg px-3 py-2.5"
                            href={activeDropdown}
                            key={entry.title}
                            onClick={(e) => { e.preventDefault(); setHoveredNav(null); const id = activeDropdown.slice(1); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", `/${id}`); }}
                            onMouseEnter={() => setHoveredItem(entry.title)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            {hoveredItem === entry.title && (
                              <framerMotion.span
                                className="absolute inset-0 rounded-lg bg-[var(--color-raised)]"
                                layoutId="dropdown-highlight"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 mt-0.5 shrink-0">{entry.icon}</span>
                            <div className="relative z-10">
                              <p className="text-[13px] font-semibold text-[var(--color-title)]">{entry.title}</p>
                              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ghost)]">{entry.desc}</p>
                            </div>
                          </a>
                        ))}
                      </framerMotion.div>
                    </AnimatePresence>
                  </framerMotion.div>
                </framerMotion.div>
              )}
            </AnimatePresence>
          </framerMotion.div>
        </framerMotion.div>
      </header>

      <AnimatePresence>
        {mobileNavOpen ? (
          <framerMotion.div
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 z-[70] bg-[var(--color-void)]/95 px-6 py-8 backdrop-blur-md md:hidden"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center justify-between">
              <TrustLoopLogo size={18} variant="full" color="black" />
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

      <main id="top" className="marketing-shell">
        <section className="auth-grain-heavy relative -mt-[60px] flex h-[calc(100vh-35px)] flex-col items-center justify-center overflow-hidden rounded-2xl text-center pt-20" style={{ backgroundImage: "linear-gradient(to left, #030608, #080e11, #0c1a20)", width: "calc(100vw - 40px)", marginLeft: "calc(50% - 50vw + 20px)", marginTop: "-45px" }}>
          <div className="mx-auto flex max-w-[860px] flex-col items-center">
            <framerMotion.p
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="page-kicker mb-5 text-white/80"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.6 }}
            >
              AI Incident Operations
            </framerMotion.p>
            <framerMotion.h1
              className="font-[var(--font-heading)] text-[length:var(--text-hero-size)] font-extrabold leading-[var(--text-hero-line)] text-white"
              style={{ textWrap: "balance" }}
            >
              {"When your AI fails,".split(" ").map((word, i) => (
                <framerMotion.span
                  key={`a-${i}`}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  className="mr-[0.25em] inline-block"
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </framerMotion.span>
              ))}
              <br />
              {"your team".split(" ").map((word, i) => (
                <framerMotion.span
                  key={`b-${i}`}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  className="mr-[0.25em] inline-block"
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </framerMotion.span>
              ))}
              <framerMotion.span
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="relative z-[2] inline-block text-[var(--color-signal)]"
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                transition={{ duration: 0.5, delay: 0.56, ease: [0.16, 1, 0.3, 1] }}
              >
                shouldn&apos;t.
              </framerMotion.span>
            </framerMotion.h1>
            <framerMotion.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 max-w-[520px] text-[18px] leading-[1.6] text-white/70"
              initial={{ opacity: 0, y: 16 }}
              transition={{ delay: 0.08, duration: 0.48 }}
            >
              TrustLoop turns AI failures into structured, customer-safe responses&mdash;from detection to post-mortem, in one workspace.
            </framerMotion.p>

            <framerMotion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-wrap justify-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.65, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <HoverLink className="btn btn-primary btn-lg relative z-[2]" href="/register?plan=starter&interval=monthly">
                Start free trial
              </HoverLink>
              <a className="btn btn-lg group relative z-[2] border border-black text-black hover:bg-black/10" href="/docs" target="_blank" rel="noreferrer">
                Documentation
                <ArrowRight className="text-black transition-transform group-hover:translate-x-1" size={16} weight="regular" />
              </a>
            </framerMotion.div>
          </div>

        </section>
        <div className="mt-24">
          <HeroIllustration />
        </div>

        <LandingBelowFold />
        <MarketingFooter />
      </main>

      <framerMotion.a
        aria-label="Back to top"
        className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] text-[var(--color-subtext)] shadow-lg transition-colors hover:bg-[var(--color-raised)] hover:text-[var(--color-bright)]"
        href="/"
        onClick={(e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); history.replaceState(null, "", "/"); }}
        style={{ opacity: showBackToTop }}
      >
        <ArrowUp size={16} weight="regular" />
      </framerMotion.a>
    </div>
  );
}
