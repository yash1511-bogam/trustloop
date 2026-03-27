"use client";

import { motion } from "framer-motion";

type IllustrationType = "workflow" | "bot" | "mail" | "dashboard" | "gauge" | "shield";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,87,42,0.12),transparent_42%)]" />
      {children}
    </div>
  );
}

export function FeatureIllustration({ type }: { type: IllustrationType }) {
  switch (type) {
    case "workflow":
      return (
        <Frame>
          <motion.div
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--color-rim)] bg-[var(--color-void)]">
              <div className="h-8 w-8 rounded-lg border border-[rgba(232,87,42,0.28)] bg-[var(--color-signal-dim)]" />
            </div>
            <div className="grid gap-2">
              <div className="h-1 w-10 rounded-full bg-[var(--color-rim)]" />
              <div className="h-1 w-14 rounded-full bg-[var(--color-rim)]" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--color-rim)] bg-[var(--color-raised)]">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-title)]" />
            </div>
          </motion.div>
        </Frame>
      );
    case "bot":
      return (
        <Frame>
          <motion.div
            className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-rim)] border-r-[var(--color-signal)] border-t-[var(--color-signal)] bg-[rgba(232,87,42,0.04)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(232,87,42,0.3)] bg-[var(--color-signal-dim)]" />
        </Frame>
      );
    case "mail":
      return (
        <Frame>
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-20 w-32 -translate-x-1/2 -translate-y-1/2 flex-col justify-center gap-2 rounded-xl border border-[var(--color-rim)] bg-[var(--color-void)] px-4"
            initial={{ y: 12, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.08 }}
          >
            <div className="h-1.5 w-1/2 rounded-full bg-[var(--color-signal)]" />
            <div className="h-1.5 w-full rounded-full bg-[var(--color-rim)]" />
            <div className="h-1.5 w-4/5 rounded-full bg-[var(--color-rim)]" />
          </motion.div>
        </Frame>
      );
    case "dashboard":
      return (
        <Frame>
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-20 -translate-x-1/2 -translate-y-1/2 items-end gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
          >
            {[40, 70, 45, 90, 60].map((height, index) => (
              <motion.div
                key={height}
                className={`w-4 rounded-t-sm ${index === 3 ? "bg-[var(--color-signal)]" : "bg-[var(--color-title)]"}`}
                initial={{ height: 0 }}
                whileInView={{ height: `${height}%` }}
                transition={{ duration: 0.45, delay: 0.08 + index * 0.08, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        </Frame>
      );
    case "gauge":
      return (
        <Frame>
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full border-[3px] border-[var(--color-rim)] border-r-[var(--color-signal)] border-t-[var(--color-signal)]" />
          <motion.div
            className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-[var(--color-rim)] border-l-[var(--color-title)]"
            animate={{ rotate: [0, 180, 45] }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
        </Frame>
      );
    case "shield":
      return (
        <Frame>
          <motion.div
            className="absolute left-1/2 top-1/2 h-20 w-16 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0.84, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160 }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-b-[2rem] rounded-t-md border border-[var(--color-rim)] bg-[var(--color-void)] shadow-[0_0_0_1px_rgba(232,87,42,0.08)]">
              <div className="h-6 w-4 rounded-sm bg-[var(--color-signal)]" />
            </div>
          </motion.div>
        </Frame>
      );
    default:
      return null;
  }
}
