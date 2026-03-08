"use client";

import { motion } from "framer-motion";

export function FeatureIllustration({ type }: { type: "workflow" | "bot" | "mail" | "dashboard" | "gauge" | "shield" }) {
  switch (type) {
    case "workflow":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(56,189,248,0.15),_transparent_50%)]" />
          <motion.div
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="h-16 w-16 rounded-xl bg-cyan-500/20 border border-cyan-500/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="h-8 w-8 rounded-lg bg-cyan-400" />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="h-1 w-8 bg-neutral-700 rounded-full" />
              <div className="h-1 w-12 bg-neutral-700 rounded-full" />
            </div>
            <div className="h-16 w-16 rounded-xl bg-blue-500/20 border border-blue-500/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <div className="h-8 w-8 rounded-lg bg-blue-400" />
            </div>
          </motion.div>
        </div>
      );
    case "bot":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(167,139,250,0.15),_transparent_60%)]" />
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="h-24 w-24 rounded-full border border-purple-500/30 border-t-purple-400 border-r-purple-400 bg-purple-900/10 shadow-[0_0_40px_rgba(168,85,247,0.2)]" />
          </motion.div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
        </div>
      );
    case "mail":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.1),_transparent_70%)]" />
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-20 rounded-xl border border-emerald-500/40 bg-emerald-950/40 backdrop-blur-sm flex flex-col justify-center px-4 gap-2"
            initial={{ y: 10, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          >
            <div className="h-1.5 w-1/2 bg-emerald-400/80 rounded-full" />
            <div className="h-1.5 w-full bg-emerald-500/40 rounded-full" />
            <div className="h-1.5 w-4/5 bg-emerald-500/40 rounded-full" />
          </motion.div>
        </div>
      );
    case "dashboard":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.1),_transparent_60%)]" />
          <motion.div 
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-end gap-2 h-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
          >
            {[40, 70, 45, 90, 60].map((h, i) => (
              <motion.div
                key={i}
                className="w-4 rounded-t-sm bg-orange-400"
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        </div>
      );
    case "gauge":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(236,72,153,0.15),_transparent_50%)]" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-neutral-800 border-t-pink-500 border-r-pink-500 rotate-45" />
          <motion.div 
            className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-neutral-800 border-l-pink-400"
            animate={{ rotate: [0, 180, 45] }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
        </div>
      );
    case "shield":
      return (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.1),_transparent_60%)]" />
          <motion.div 
            className="absolute left-1/2 top-1/2 h-20 w-16 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
          >
            <div className="h-full w-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/40 rounded-b-[2rem] rounded-t-md shadow-[0_0_40px_rgba(250,204,21,0.15)] flex justify-center items-center">
               <div className="h-6 w-4 bg-yellow-400 rounded-sm" />
            </div>
          </motion.div>
        </div>
      );
    default:
      return null;
  }
}