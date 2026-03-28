"use client";

import { motion } from "framer-motion";
import {
  HiOutlineShieldExclamation,
  HiOutlineCpuChip,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineSignal,
  HiOutlineArrowPathRoundedSquare,
} from "react-icons/hi2";
import { SiDatadog, SiSentry, SiPagerduty } from "react-icons/si";

const fade = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
};

export function HeroIllustration() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-[1000px]">
      <div className="pointer-events-none absolute inset-x-[10%] top-8 -z-10 h-48 rounded-full bg-[radial-gradient(circle,rgba(212,98,43,0.08),transparent_70%)] blur-3xl" />

      <motion.div
        animate="visible"
        className="overflow-hidden rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)]"
        initial="hidden"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      >
        {/* Title bar */}
        <motion.div className="flex items-center justify-between border-b border-[var(--color-rim)] px-5 py-3" variants={fade}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            </div>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ghost)]">INC-2847</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[rgba(232,66,66,0.12)] px-2 py-0.5 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[#ef4444]">P1</span>
            <span className="rounded bg-[rgba(212,98,43,0.12)] px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-signal)]">Active</span>
          </div>
        </motion.div>

        {/* Incident header */}
        <motion.div className="border-b border-[var(--color-rim)] px-5 py-4" variants={fade}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.1)]">
              <HiOutlineShieldExclamation size={18} color="#ef4444" />
            </span>
            <div>
              <p className="font-[var(--font-heading)] text-[15px] font-bold text-[var(--color-title)]">Inference drift across support tier</p>
              <p className="mt-0.5 font-[var(--font-mono)] text-[11px] text-[var(--color-ghost)]">Detected 2m ago · support-ai-v2.1.4 · 12,400 sessions impacted</p>
            </div>
          </div>
        </motion.div>

        {/* Body — two columns */}
        <div className="grid lg:grid-cols-[1fr_280px]">
          {/* Left: timeline feed */}
          <div className="border-r border-[var(--color-rim)] px-5 py-4">
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-ghost)]">Activity</p>
            <div className="mt-4 space-y-0">
              {[
                { icon: <HiOutlineShieldExclamation size={14} color="#ef4444" />, label: "Incident opened", meta: "Auto-detected via Datadog anomaly", time: "2m ago" },
                { icon: <HiOutlineCpuChip size={14} color="#a78bfa" />, label: "AI triage complete", meta: "Root cause: prompt regression in v2.1.4", time: "1m ago" },
                { icon: <HiOutlineArrowPath size={14} color="#f59e0b" />, label: "Routed to Sarah Chen", meta: "On-call · Product Reliability", time: "1m ago" },
                { icon: <HiOutlineCheckCircle size={14} color="#22c55e" />, label: "Customer update approved", meta: "\"Investigating elevated incorrect outputs…\"", time: "45s ago" },
                { icon: <HiOutlineSignal size={14} color="#22d3ee" />, label: "Status page updated", meta: "Published to 3 channels", time: "30s ago" },
              ].map((item, i) => (
                <motion.div className="relative flex gap-3 pb-5 last:pb-0" key={i} variants={fade}>
                  {i < 4 && <span className="absolute left-[11px] top-[26px] h-[calc(100%-14px)] w-px bg-[var(--color-rim)]" />}
                  <span className="relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--color-void)]">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-[var(--color-body)]">{item.label}</p>
                      <span className="shrink-0 font-[var(--font-mono)] text-[10px] text-[var(--color-ghost)]">{item.time}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--color-ghost)]">{item.meta}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: live stats */}
          <motion.div className="px-5 py-4" variants={fade}>
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-ghost)]">Triage</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-subtext)]">Confidence</span>
                  <span className="font-[var(--font-mono)] text-[12px] font-medium text-[var(--color-title)]">74%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-rim)]">
                  <motion.div
                    animate={{ width: "74%" }}
                    className="h-full rounded-full bg-[var(--color-signal)]"
                    initial={{ width: "0%" }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
              </div>
              {[
                ["Cause", "Prompt regression"],
                ["Action", "Rollback v2.1.4"],
                ["Impact", "12,400 sessions"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] text-[var(--color-ghost)]">{label}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--color-title)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--color-rim)] pt-4">
              <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-ghost)]">Signals</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { name: "Datadog", status: "Degraded", icon: <SiDatadog size={13} color="#632CA6" /> },
                  { name: "Sentry", status: "Spike", icon: <SiSentry size={13} color="#FB4226" /> },
                  { name: "PagerDuty", status: "Escalated", icon: <SiPagerduty size={13} color="#06AC38" /> },
                ].map((item) => (
                  <div className="flex items-center justify-between" key={item.name}>
                    <span className="flex items-center gap-2 text-[12px] text-[var(--color-subtext)]">
                      {item.icon}
                      {item.name}
                    </span>
                    <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-body)]">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--color-void)] px-3 py-2"
              variants={fade}
            >
              <HiOutlineArrowPathRoundedSquare className="animate-spin" size={12} color="var(--color-signal)" />
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ghost)]">Next update in 12m</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
