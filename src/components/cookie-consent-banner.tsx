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
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-neutral-900/95 backdrop-blur p-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-neutral-300">
          We use cookies for essential functionality and analytics.{" "}
          <a href="/privacy" className="underline text-white">Privacy Policy</a>
        </p>
        <div className="flex gap-2">
          <button onClick={decline} className="btn btn-ghost text-sm">Decline</button>
          <button onClick={accept} className="btn btn-primary text-sm">Accept</button>
        </div>
      </div>
    </div>
  );
}
