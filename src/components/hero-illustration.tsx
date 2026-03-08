"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle2, ShieldAlert, Zap } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative mt-16 flex w-full max-w-5xl flex-col items-center justify-center">
      {/* Decorative background glows */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-900/20 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-900/20 blur-[100px]" />

      <motion.div
        className="relative grid w-full grid-cols-1 gap-6 md:grid-cols-12"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
      >
        {/* Main Dashboard Panel */}
        <motion.div
          className="col-span-1 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-1 shadow-2xl backdrop-blur-xl md:col-span-8"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } },
          }}
        >
          <div className="flex h-full flex-col rounded-xl bg-black px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-950/30 text-red-500 ring-1 ring-red-900/50">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">INC-4092: AI Hallucination Spike</h3>
                  <p className="text-xs text-neutral-400">Detected 2 mins ago • Priority 1</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-red-950/30 px-3 py-1 text-xs font-medium text-red-500 ring-1 ring-red-900/50">
                Active
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-950/30 text-cyan-500">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-white">AI Triage Analysis</p>
                    <p className="text-xs text-neutral-400">100% complete</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                    <motion.div
                      className="h-full rounded-full bg-cyan-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4">
                  <p className="text-xs text-neutral-400">Impact Radius</p>
                  <p className="mt-1 text-lg font-semibold text-white">12,400 users</p>
                  <div className="mt-2 h-8 w-full">
                    {/* Fake sparkline */}
                    <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible">
                      <motion.path
                        d="M0,25 C20,25 30,10 50,15 C70,20 80,5 100,5"
                        fill="none"
                        stroke="rgb(239, 68, 68)"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut", delay: 0.8 }}
                      />
                    </svg>
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4">
                  <p className="text-xs text-neutral-400">Suggested Action</p>
                  <p className="mt-1 text-sm font-medium text-white">Rollback model weights to v2.1.4</p>
                  <button className="mt-3 w-full rounded-md bg-white py-1.5 text-xs font-semibold text-black transition-transform hover:scale-105 active:scale-95">
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Side Panels */}
        <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
          <motion.div
            className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl backdrop-blur-xl"
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-white">System Status</h3>
            </div>
            <div className="space-y-4">
              {[
                { name: "API Gateway", status: "Operational" },
                { name: "LLM Inference", status: "Degraded", error: true },
                { name: "Vector DB", status: "Operational" },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <p className="text-xs text-neutral-400">{service.name}</p>
                  <span className={`text-xs font-medium ${service.error ? "text-red-500" : "text-emerald-500"}`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex-1 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 p-6 shadow-2xl backdrop-blur-xl"
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
            }}
          >
            <div className="flex h-full flex-col justify-center text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950/30 text-emerald-500 ring-1 ring-emerald-900/50">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-white">Customer Comms Sent</p>
              <p className="mt-1 text-xs text-neutral-500">Automated status page update published</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
