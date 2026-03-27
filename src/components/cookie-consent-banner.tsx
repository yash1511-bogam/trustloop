"use client";

import { useState } from "react";

const CONSENT_KEY = "tl_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return !window.localStorage.getItem(CONSENT_KEY);
  });

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
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--color-rim)] bg-[var(--color-surface)] backdrop-blur p-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--color-body)]">
          We use cookies for essential functionality and analytics.{" "}
          <a href="/privacy" className="underline text-[var(--color-bright)]">Privacy Policy</a>
        </p>
        <div className="flex gap-2">
          <button onClick={decline} className="btn btn-ghost text-sm">Decline</button>
          <button onClick={accept} className="btn btn-primary text-sm">Accept</button>
        </div>
      </div>
    </div>
  );
}
