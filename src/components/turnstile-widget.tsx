"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script="true"]',
    );
    if (existing && window.turnstile) {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Failed to load Turnstile script."));
    };
    if (!existing) {
      document.head.appendChild(script);
      return;
    }

    if (existing.dataset.loaded === "true") {
      resolve();
    }
  });

  return turnstileScriptPromise;
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  siteKey?: string | null;
  onTokenChange: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onTokenChange, theme = "dark" },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        onTokenChange(null);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }), [onTokenChange]);

    useEffect(() => {
      if (!siteKey || !containerRef.current) {
        onTokenChange(null);
        return;
      }

      let cancelled = false;

      void loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) {
            return;
          }

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            callback(token) {
              onTokenChange(token);
            },
            "expired-callback"() {
              onTokenChange(null);
            },
            "error-callback"() {
              onTokenChange(null);
            },
          });
        })
        .catch(() => {
          onTokenChange(null);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [onTokenChange, siteKey, theme]);

    if (!siteKey) {
      return null;
    }

    return <div ref={containerRef} className="min-h-[65px]" />;
  },
);
