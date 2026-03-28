"use client";

import { motion } from "framer-motion";
import {
  ArrowArcRight,
  Broadcast,
  CheckCircle,
  Robot,
  Warning,
} from "@phosphor-icons/react";

export function HeroIllustration() {
  return (
    <div className="relative mt-16 w-full max-w-5xl">
      <div className="absolute inset-x-[12%] top-10 -z-10 h-56 rounded-full bg-[radial-gradient(circle,rgba(212,98,43,0.10),transparent_70%)] blur-3xl" />
      <motion.div
        animate="visible"
        className="grid gap-5 lg:grid-cols-[1.6fr_0.9fr]"
        initial="hidden"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        <motion.div
          className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-rim)] bg-[var(--color-surface)]"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.98 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
        >
          <div className="border-b border-[var(--color-rim)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)]">
                  <Warning color="var(--color-danger)" size={18} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-title)]">Inference drift across support tier</p>
                  <p className="text-xs text-[var(--color-subtext)]">Detected 2 minutes ago • Priority 1 • Active</p>
                </div>
              </div>
              <span className="badge badge-p1">P1</span>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                  <Robot color="var(--color-signal)" size={16} weight="duotone" />
                  Triage analysis
                </div>
                <span className="text-xs text-[var(--color-ghost)]">customer-safe draft ready</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-rim)]">
                <motion.div
                  animate={{ width: "74%" }}
                  className="h-full rounded-full bg-[var(--color-signal)]"
                  initial={{ width: "0%" }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-3">
                  <p className="metric-label">Impact</p>
                  <p className="mt-2 text-base font-medium text-[var(--color-title)]">12,400 sessions</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-3">
                  <p className="metric-label">Likely cause</p>
                  <p className="mt-2 text-base font-medium text-[var(--color-title)]">Prompt regression</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-3">
                  <p className="metric-label">Suggested action</p>
                  <p className="mt-2 text-base font-medium text-[var(--color-title)]">Rollback v2.1.4</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-body)]">
                  <Broadcast color="var(--color-subtext)" size={16} weight="duotone" />
                  Customer communications
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-subtext)]">
                  We are investigating elevated incorrect outputs in a subset of customer support replies. Responses are being reviewed manually while mitigation is underway.
                </div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4">
                <p className="metric-label">Response loop</p>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                    <ArrowArcRight color="var(--color-signal)" size={16} weight="duotone" />
                    Alert routed to owner
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                    <CheckCircle color="var(--color-resolve)" size={16} weight="duotone" />
                    Draft approved
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                    <Broadcast color="var(--color-subtext)" size={16} weight="duotone" />
                    Status page updated
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5">
          <motion.div
            className="rounded-[var(--radius-xl)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-5"
            variants={{
              hidden: { opacity: 0, x: 12 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
            }}
          >
            <p className="metric-label">Monitoring stack</p>
            <div className="mt-4 grid gap-3">
              {[
                ["Datadog", "Degraded"],
                ["Sentry", "Spike detected"],
                ["PagerDuty", "Escalated"],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between text-sm" key={label}>
                  <span className="text-[var(--color-subtext)]">{label}</span>
                  <span className="text-[var(--color-title)]">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="rounded-[var(--radius-xl)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-5"
            variants={{
              hidden: { opacity: 0, x: 12 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
            }}
          >
            <p className="metric-label">Commander note</p>
            <p className="mt-4 text-sm leading-6 text-[var(--color-subtext)]">
              Keep the incident cadence calm. Confirm rollback, approve the status draft, and publish the next update on schedule.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
