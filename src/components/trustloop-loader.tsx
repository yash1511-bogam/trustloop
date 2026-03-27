"use client";

import { useEffect, useState } from "react";
import { TrustLoopLogo } from "@/components/trustloop-logo";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TrustLoopLoader() {
  const [state, setState] = useState<"enter" | "exit" | "hidden">("enter");

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const exitDelay = reduced ? 400 : 850;
    const hideDelay = reduced ? 600 : 1050;

    const exitTimer = window.setTimeout(() => setState("exit"), exitDelay);
    const hideTimer = window.setTimeout(() => setState("hidden"), hideDelay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (state === "hidden") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="trustloop-loader-overlay"
      data-state={state}
    >
      <div className="trustloop-loader">
        <TrustLoopLogo size={32} variant="mark" />
        <div className="trustloop-loader-line" />
        <div className="trustloop-loader-wordmark">TrustLoop</div>
      </div>
    </div>
  );
}
