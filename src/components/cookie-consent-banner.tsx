"use client";

import { useState } from "react";

const CONSENT_KEY = "tl_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() =>
    typeof window !== "undefined" ? !localStorage.getItem(CONSENT_KEY) : false
  );

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      role="dialog"
      aria-label="Cookie consent"
      style={{
        opacity: 1,
        transform: "translateY(0)",
        transition: `opacity var(--duration-slow) var(--ease-out), transform var(--duration-slow) var(--ease-out)`,
      }}
    >
      <p className="text-sm leading-relaxed text-[var(--color-body)]">
        We use cookies for essential functionality and analytics.{" "}
        <a
          href="/privacy"
          className="text-[var(--color-bright)] underline decoration-[var(--color-muted)] underline-offset-2 hover:decoration-[var(--color-body)]"
        >
          Privacy Policy
        </a>
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={decline} className="btn btn-ghost btn-sm" type="button">
          Decline
        </button>
        <button onClick={accept} className="btn btn-primary btn-sm" type="button">
          Accept
        </button>
      </div>
    </div>
  );
}
