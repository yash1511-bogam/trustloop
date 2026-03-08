"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { PlanTier, planDefinitionFor } from "@/lib/billing-plan";

type Usage = {
  incidentsCreated: number;
  triageRuns: number;
  customerUpdates: number;
  reminderEmailsSent: number;
};

type Quota = {
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

type BillingState = {
  status: string;
  discountCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  failureReminderCount: number;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  lastInvoiceUrl: string | null;
  paymentFailedAt: string | null;
};

type PreviewAddon = {
  addonId: string;
  name: string;
  description: string | null;
  quantity: number;
  currency: string;
  originalCurrency: string;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number | null;
  tax: number | null;
};

type PreviewCreditEntitlement = {
  creditEntitlementId: string;
  name: string;
  unit: string;
  amount: string;
};

type PreviewMeter = {
  description: string | null;
  freeThreshold: number | null;
  measurementUnit: string;
  name: string;
  pricePerUnit: string;
};

type PreviewItem = {
  productId: string;
  name: string | null;
  description: string | null;
  quantity: number;
  currency: string;
  originalCurrency: string;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number | null;
  discountCycle: number | null;
  isSubscription: boolean;
  isUsageBased: boolean;
  tax: number | null;
  taxRate: number;
  addons: PreviewAddon[];
  creditEntitlements: PreviewCreditEntitlement[];
  meters: PreviewMeter[];
};

type BillingPreview = {
  billingCountry: string;
  currency: string;
  totalPrice: number;
  totalTax: number | null;
  taxIdError: string | null;
  currentBreakdown: {
    discount: number;
    subtotal: number;
    tax: number | null;
    totalAmount: number;
  };
  recurringBreakdown: {
    discount: number;
    subtotal: number;
    tax: number | null;
    totalAmount: number;
  } | null;
  productCart: PreviewItem[];
};

type LiveBreakdown = {
  currency: string | null;
  discount: number | null;
  finalTotal: number | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
};

type CheckoutSession = {
  checkoutUrl: string;
  couponCode: string | null;
  plan: PlanTier;
  sessionId: string;
};

type OtpPopupState = {
  status: "idle" | "open" | "blocked" | "closed";
  url: string | null;
};

type CheckoutStatusPayload = {
  customerEmail: string | null;
  customerName: string | null;
  id: string;
  paymentId: string | null;
  paymentStatus: string | null;
  providerStatus: string;
  sessionCreatedAt: string;
  workspaceBillingUpdatedAt: string;
};

type DodoEvent = {
  event_type: string;
  data?: Record<string, unknown>;
};

type DodoSdk = {
  Initialize: (config: {
    displayType?: "inline" | "overlay";
    linkType?: "session";
    mode: "live" | "test";
    onEvent?: (event: DodoEvent) => void;
  }) => void;
  Checkout: {
    close: () => void;
    isOpen: () => boolean;
    open: (options: {
      checkoutUrl: string;
      elementId: string;
      options?: {
        fontSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
        fontWeight?: "normal" | "medium" | "bold" | "extraBold";
        manualRedirect?: boolean;
        payButtonText?: string;
        showSecurityBadge?: boolean;
        showTimer?: boolean;
        themeConfig?: {
          radius?: string;
          dark?: Record<string, string>;
          light?: Record<string, string>;
        };
      };
    }) => void;
  };
};

type Props = {
  billing: BillingState | null;
  billingNotice: string | null;
  canManageBilling: boolean;
  checkoutMode: "live" | "test";
  planTier: PlanTier;
  quota: Quota;
  usage: Usage;
};

const CHECKOUT_ELEMENT_ID = "billing-inline-checkout";
const OTP_POPUP_NAME = "trustloop-billing-verification";
const FINAL_PAYMENT_STATUSES = new Set(["failed", "succeeded", "cancelled", "canceled"]);

const inlineTheme = {
  radius: "18px",
  light: {
    bgPrimary: "#ffffff",
    bgSecondary: "#f8fafc",
    borderPrimary: "#cbd5e1",
    borderSecondary: "#e2e8f0",
    buttonPrimary: "#0f172a",
    buttonPrimaryHover: "#020617",
    buttonSecondary: "#ffffff",
    buttonSecondaryHover: "#f8fafc",
    buttonTextPrimary: "#f8fafc",
    buttonTextSecondary: "#0f172a",
    inputFocusBorder: "#0284c7",
    textError: "#b91c1c",
    textPlaceholder: "#64748b",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textSuccess: "#166534",
  },
  dark: {
    bgPrimary: "#060816",
    bgSecondary: "#0f172a",
    borderPrimary: "rgba(148, 163, 184, 0.28)",
    borderSecondary: "rgba(148, 163, 184, 0.16)",
    buttonPrimary: "#e2e8f0",
    buttonPrimaryHover: "#f8fafc",
    buttonSecondary: "#0f172a",
    buttonSecondaryHover: "#111827",
    buttonTextPrimary: "#020617",
    buttonTextSecondary: "#e2e8f0",
    inputFocusBorder: "#38bdf8",
    textError: "#fca5a5",
    textPlaceholder: "#94a3b8",
    textPrimary: "#e5eefb",
    textSecondary: "#94a3b8",
    textSuccess: "#86efac",
  },
};

function normalizeCoupon(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

function percent(used: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amountCents !== "number") {
    return "N/A";
  }

  const amount = amountCents / 100;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString();
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return "Pending";
  }

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusToneClass(value: string | null | undefined): string {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("active") || normalized.includes("succeeded") || normalized.includes("paid")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (normalized.includes("past") || normalized.includes("failed") || normalized.includes("cancel")) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseBreakdown(data: Record<string, unknown> | undefined): LiveBreakdown | null {
  if (!data) {
    return null;
  }

  const readNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

  return {
    currency: firstString(data.finalTotalCurrency, data.currency),
    discount: readNumber(data.discount),
    finalTotal: readNumber(data.finalTotal),
    subtotal: readNumber(data.subTotal),
    tax: readNumber(data.tax),
    total: readNumber(data.total),
  };
}

function extractRedirectUrl(data: Record<string, unknown> | undefined): string | null {
  if (!data) {
    return null;
  }

  const message = asRecord(data.message);
  return firstString(data.redirect_to, message.redirect_to, data.url, message.url);
}

export function BillingPanel({
  billing,
  billingNotice,
  canManageBilling,
  checkoutMode,
  planTier,
  quota,
  usage,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(planTier);
  const [couponCode, setCouponCode] = useState(billing?.discountCode ?? "");
  const [previewCouponCode, setPreviewCouponCode] = useState<string | null>(
    normalizeCoupon(billing?.discountCode),
  );
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null);
  const [checkoutFrameReady, setCheckoutFrameReady] = useState(false);
  const [liveBreakdown, setLiveBreakdown] = useState<LiveBreakdown | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckoutStatusPayload | null>(null);
  const [sessionStatusLoading, setSessionStatusLoading] = useState(false);
  const [otpPopupState, setOtpPopupState] = useState<OtpPopupState>({ status: "idle", url: null });
  const previewRequestId = useRef(0);
  const previewCouponCodeRef = useRef<string | null>(previewCouponCode);
  const dodoRef = useRef<DodoSdk | null>(null);
  const checkoutSectionRef = useRef<HTMLElement | null>(null);
  const otpPopupRef = useRef<Window | null>(null);
  const otpPopupPollRef = useRef<number | null>(null);

  const normalizedCouponInput = normalizeCoupon(couponCode);
  const previewDirty = normalizedCouponInput !== previewCouponCode;
  const selectedPlanDefinition = useMemo(() => planDefinitionFor(selectedPlan), [selectedPlan]);
  const availablePlans = useMemo(
    () => (["starter", "pro", "enterprise"] as PlanTier[]).map((plan) => planDefinitionFor(plan)),
    [],
  );

  const clearOtpPopupMonitor = useCallback(() => {
    if (otpPopupPollRef.current) {
      window.clearInterval(otpPopupPollRef.current);
      otpPopupPollRef.current = null;
    }
  }, []);

  const openOtpPopup = useCallback(
    (redirectUrl: string) => {
      clearOtpPopupMonitor();

      const width = 520;
      const height = 760;
      const left = Math.max(40, Math.round((window.screen.width - width) / 2));
      const top = Math.max(40, Math.round((window.screen.height - height) / 2));
      const features = [
        "popup=yes",
        "toolbar=no",
        "location=yes",
        "status=no",
        "menubar=no",
        "scrollbars=yes",
        "resizable=yes",
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
      ].join(",");

      const popup = window.open(redirectUrl, OTP_POPUP_NAME, features);
      if (!popup) {
        setOtpPopupState({ status: "blocked", url: redirectUrl });
        setCheckoutHint("Your browser blocked the verification popup. Open it manually to finish the OTP step.");
        return false;
      }

      popup.focus();
      otpPopupRef.current = popup;
      setOtpPopupState({ status: "open", url: redirectUrl });
      setCheckoutHint("Additional verification opened in a secure popup. Complete the OTP challenge there, then return here.");

      otpPopupPollRef.current = window.setInterval(() => {
        if (!otpPopupRef.current || otpPopupRef.current.closed) {
          clearOtpPopupMonitor();
          otpPopupRef.current = null;
          setOtpPopupState((current) =>
            current.status === "idle" ? current : { status: "closed", url: current.url },
          );
          setCheckoutHint("Verification window closed. Billing status will keep refreshing here.");
        }
      }, 1000);

      return true;
    },
    [clearOtpPopupMonitor],
  );

  const effectiveCurrentBreakdown = useMemo(() => {
    if (!preview) {
      return null;
    }

    return {
      currency: liveBreakdown?.currency ?? preview.currency,
      discount: liveBreakdown?.discount ?? preview.currentBreakdown.discount,
      subtotal: liveBreakdown?.subtotal ?? preview.currentBreakdown.subtotal,
      tax: liveBreakdown?.tax ?? preview.currentBreakdown.tax,
      totalAmount:
        liveBreakdown?.finalTotal ?? liveBreakdown?.total ?? preview.currentBreakdown.totalAmount,
    };
  }, [liveBreakdown, preview]);

  const loadPreview = useCallback(async (plan: PlanTier, appliedCouponCode: string | null) => {
    const requestId = ++previewRequestId.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/billing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          couponCode: appliedCouponCode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ({ error?: string } & BillingPreview)
        | null;

      if (requestId !== previewRequestId.current) {
        return false;
      }

      setPreviewLoading(false);

      if (!response.ok || !payload) {
        setPreviewError(payload?.error ?? "Could not load billing preview.");
        return false;
      }

      setPreview(payload as BillingPreview);
      setPreviewCouponCode(appliedCouponCode);
      setLiveBreakdown(null);
      return true;
    } catch (error) {
      if (requestId !== previewRequestId.current) {
        return false;
      }

      setPreviewLoading(false);
      setPreviewError(
        error instanceof Error ? error.message : "Could not load billing preview.",
      );
      return false;
    }
  }, []);

  useEffect(() => {
    previewCouponCodeRef.current = previewCouponCode;
  }, [previewCouponCode]);

  useEffect(() => {
    void loadPreview(selectedPlan, previewCouponCodeRef.current);
  }, [loadPreview, selectedPlan]);

  useEffect(() => {
    if (!checkoutSession) {
      return;
    }

    if (
      checkoutSession.plan !== selectedPlan ||
      checkoutSession.couponCode !== previewCouponCode
    ) {
      try {
        dodoRef.current?.Checkout.close();
      } catch {
        // Best effort cleanup when checkout configuration changes.
      }

      setCheckoutSession(null);
      setCheckoutFrameReady(false);
      setCheckoutHint("Plan or coupon changed. Start a new secure checkout to apply the updated summary.");
      setSessionStatus(null);
      setLiveBreakdown(null);
      clearOtpPopupMonitor();
      try {
        otpPopupRef.current?.close();
      } catch {
        // Best effort cleanup if a verification popup is still open.
      }
      otpPopupRef.current = null;
      setOtpPopupState({ status: "idle", url: null });
    }
  }, [checkoutSession, clearOtpPopupMonitor, previewCouponCode, selectedPlan]);

  useEffect(() => {
    if (!checkoutSession?.checkoutUrl) {
      return;
    }

    const checkoutUrl = checkoutSession.checkoutUrl;
    let cancelled = false;

    async function mountCheckout() {
      setCheckoutError(null);
      setCheckoutFrameReady(false);
      setCheckoutHint("Loading secure checkout…");

      try {
        const sdkModule = await import("dodopayments-checkout");
        if (cancelled) {
          return;
        }

        const sdk = sdkModule.DodoPayments as DodoSdk;
        dodoRef.current = sdk;

        sdk.Initialize({
          mode: checkoutMode,
          displayType: "inline",
          linkType: "session",
          onEvent: (event) => {
            if (cancelled) {
              return;
            }

            const data = asRecord(event.data);

            if (event.event_type === "checkout.opened") {
              setCheckoutHint("Secure checkout loaded.");
              return;
            }

            if (event.event_type === "checkout.form_ready") {
              setCheckoutFrameReady(true);
              setCheckoutHint("Payment form is ready.");
              return;
            }

            if (event.event_type === "checkout.breakdown") {
              setLiveBreakdown(parseBreakdown(data));
              return;
            }

            if (event.event_type === "checkout.status") {
              const message = asRecord(data.message);
              const paymentStatus = firstString(data.status, message.status, data.payment_status);
              if (paymentStatus) {
                setSessionStatus((current) =>
                  current
                    ? {
                        ...current,
                        paymentStatus,
                      }
                    : current,
                );
              }
              return;
            }

            if (event.event_type === "checkout.redirect_requested") {
              const redirectUrl = extractRedirectUrl(data);
              if (redirectUrl) {
                openOtpPopup(redirectUrl);
              }
              return;
            }

            if (event.event_type === "checkout.redirect") {
              setCheckoutHint("Continue the payment confirmation in the verification popup if your bank requests it.");
              return;
            }

            if (event.event_type === "checkout.link_expired") {
              setCheckoutError("This checkout session expired. Start a new secure checkout.");
              return;
            }

            if (event.event_type === "checkout.error") {
              const message = asRecord(data.message);
              setCheckoutError(
                firstString(data.message, message.message, message.error, data.error) ??
                  "Checkout encountered an unexpected error.",
              );
              return;
            }

            if (event.event_type === "checkout.closed") {
              setCheckoutFrameReady(false);
            }
          },
        });

        try {
          sdk.Checkout.close();
        } catch {
          // No-op when no checkout is mounted yet.
        }

        const target = document.getElementById(CHECKOUT_ELEMENT_ID);
        if (!target) {
          setCheckoutError("Checkout container could not be mounted.");
          return;
        }

        target.innerHTML = "";
        sdk.Checkout.open({
          checkoutUrl,
          elementId: CHECKOUT_ELEMENT_ID,
          options: {
            fontSize: "sm",
            fontWeight: "medium",
            manualRedirect: true,
            payButtonText: "Proceed to payment",
            showSecurityBadge: true,
            showTimer: true,
            themeConfig: inlineTheme,
          },
        });
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : "Secure checkout could not be loaded.",
        );
      }
    }

    void mountCheckout();

    return () => {
      cancelled = true;
      try {
        dodoRef.current?.Checkout.close();
      } catch {
        // No-op cleanup for checkout teardown.
      }
    };
  }, [checkoutMode, checkoutSession?.checkoutUrl, openOtpPopup]);

  useEffect(() => {
    if (!checkoutSession?.sessionId) {
      return;
    }

    const sessionId = checkoutSession.sessionId;
    let cancelled = false;
    let timeoutId: number | undefined;

    async function pollStatus() {
      setSessionStatusLoading(true);

      try {
        const response = await fetch(`/api/billing/session/${sessionId}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | ({ error?: string } & CheckoutStatusPayload)
          | null;

        if (cancelled) {
          return;
        }

        setSessionStatusLoading(false);

        if (!response.ok || !payload) {
          if (payload?.error) {
            setCheckoutHint(payload.error);
          }
          return;
        }

        setSessionStatus(payload as CheckoutStatusPayload);

        if (
          !payload.paymentStatus ||
          !FINAL_PAYMENT_STATUSES.has(payload.paymentStatus.toLowerCase())
        ) {
          timeoutId = window.setTimeout(pollStatus, 4000);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionStatusLoading(false);
        setCheckoutHint(
          error instanceof Error ? error.message : "Could not refresh checkout status.",
        );
      }
    }

    void pollStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [checkoutSession?.sessionId]);

  useEffect(() => {
    if (!checkoutSession?.sessionId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      checkoutSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [checkoutSession?.sessionId]);

  useEffect(() => {
    const paymentStatus = sessionStatus?.paymentStatus?.toLowerCase();
    if (!paymentStatus || !FINAL_PAYMENT_STATUSES.has(paymentStatus)) {
      return;
    }

    clearOtpPopupMonitor();
    try {
      otpPopupRef.current?.close();
    } catch {
      // Ignore popup close errors once the session reaches a final state.
    }
    otpPopupRef.current = null;
    setOtpPopupState({ status: "idle", url: null });
  }, [clearOtpPopupMonitor, sessionStatus?.paymentStatus]);

  useEffect(
    () => () => {
      clearOtpPopupMonitor();
    },
    [clearOtpPopupMonitor],
  );

  async function refreshPricing() {
    await loadPreview(selectedPlan, normalizedCouponInput);
  }

  async function clearCoupon() {
    setCouponCode("");
    await loadPreview(selectedPlan, null);
  }

  async function startCheckout() {
    if (!canManageBilling) {
      return;
    }

    if (previewDirty) {
      setCheckoutError("Refresh the billing summary after editing the coupon code before starting checkout.");
      return;
    }

    if (!preview && !previewLoading) {
      setCheckoutError("Load the billing summary before starting secure checkout.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutHint("Creating secure checkout session…");
    setSessionStatus(null);
    setLiveBreakdown(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          couponCode: previewCouponCode,
        }),
      });

      setCheckoutLoading(false);

      const payload = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string | null; error?: string; sessionId?: string | null }
        | null;

      if (!response.ok || !payload?.checkoutUrl || !payload.sessionId) {
        setCheckoutError(payload?.error ?? "Checkout session could not be created.");
        return;
      }

      setCheckoutSession({
        checkoutUrl: payload.checkoutUrl,
        couponCode: previewCouponCode,
        plan: selectedPlan,
        sessionId: payload.sessionId,
      });
      setCheckoutHint("Secure checkout is loading below.");
    } catch (error) {
      setCheckoutLoading(false);
      setCheckoutError(
        error instanceof Error ? error.message : "Checkout session could not be created.",
      );
    }
  }

  const paymentStatusLabel = sessionStatus?.paymentStatus
    ? formatStatusLabel(sessionStatus.paymentStatus)
    : formatStatusLabel(billing?.status ?? "pending");

  return (
    <div className="space-y-8">
      {billingNotice ? (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {billingNotice}
        </div>
      ) : null}

      {!canManageBilling ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Billing changes are limited to workspace owners and managers. You can still review usage, plan details, and payment status here.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="kicker">Current workspace plan</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">{planDefinitionFor(planTier).label}</h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                  Select the next plan, review the exact pricing summary from Dodo, then load the secure checkout frame.
                </p>
              </div>
              <span className={`badge ${statusToneClass(billing?.status)}`}>
                {formatStatusLabel(billing?.status ?? "none")}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {availablePlans.map((plan) => {
                const isSelected = plan.id === selectedPlan;
                const isCurrent = plan.id === planTier;
                return (
                  <article
                    className={`panel-card p-5 transition-colors ${
                      isSelected ? "border-sky-400/60 bg-sky-500/10" : "border-[var(--line)] bg-[var(--bg-soft)]"
                    }`}
                    key={plan.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-100">{plan.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-sky-200/80">{plan.headline}</p>
                      </div>
                      {isCurrent ? <span className="badge">Current</span> : null}
                    </div>
                    <p className="mt-3 text-sm text-neutral-400">{plan.description}</p>
                    <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                      {plan.bullets.map((bullet) => (
                        <li className="flex items-start gap-2" key={bullet}>
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className={isSelected ? "btn btn-primary mt-5 w-full" : "btn btn-ghost mt-5 w-full"}
                      onClick={() => setSelectedPlan(plan.id)}
                      type="button"
                    >
                      {isSelected ? "Selected" : `Choose ${plan.label}`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="panel-card space-y-5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="kicker">Pricing summary</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-100">{selectedPlanDefinition.label}</h3>
                </div>
                {previewLoading ? (
                  <span className="inline-flex items-center gap-2 text-sm text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating
                  </span>
                ) : (
                  <span className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                    Live Dodo preview
                  </span>
                )}
              </div>

              <p className="text-sm text-neutral-400">{selectedPlanDefinition.description}</p>

              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-200">Coupon code</span>
                  <input
                    className="input"
                    disabled={!canManageBilling}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    value={couponCode}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-ghost"
                    disabled={!canManageBilling || previewLoading}
                    onClick={refreshPricing}
                    type="button"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Update pricing
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={!canManageBilling || (!couponCode && !previewCouponCode)}
                    onClick={clearCoupon}
                    type="button"
                  >
                    Clear code
                  </button>
                </div>
                {previewDirty ? (
                  <p className="text-xs text-amber-200">
                    Coupon edits are not applied yet. Refresh pricing before loading secure checkout.
                  </p>
                ) : null}
              </div>

              {previewError ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {previewError}
                </div>
              ) : null}

              {preview?.taxIdError ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {preview.taxIdError}
                </div>
              ) : null}

              <div className="space-y-4">
                {(preview?.productCart.length ? preview.productCart : [null]).map((item, index) => {
                  const title = item?.name ?? selectedPlanDefinition.label;
                  const description = item?.description ?? selectedPlanDefinition.description;
                  return (
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4" key={item?.productId ?? index}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">{title}</p>
                          <p className="mt-1 text-sm text-neutral-400">{description}</p>
                        </div>
                        <span className="text-sm text-neutral-300">Qty {item?.quantity ?? 1}</span>
                      </div>

                      {item?.creditEntitlements.length ? (
                        <ul className="mt-4 space-y-2 text-sm text-neutral-300">
                          {item.creditEntitlements.map((credit) => (
                            <li className="flex items-start gap-2" key={credit.creditEntitlementId}>
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                              <span>
                                {credit.amount} {credit.unit} {credit.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {item?.meters.length ? (
                        <div className="mt-4 space-y-2 rounded-xl border border-dashed border-[var(--line)] px-3 py-3 text-sm text-neutral-300">
                          {item.meters.map((meter) => (
                            <p key={`${item.productId}-${meter.name}`}>
                              <span className="font-medium text-slate-200">{meter.name}</span>
                              {meter.description ? `: ${meter.description}. ` : ": "}
                              {meter.freeThreshold ? `Free up to ${meter.freeThreshold.toLocaleString()} ${meter.measurementUnit}, ` : ""}
                              then {meter.pricePerUnit} per {meter.measurementUnit}.
                            </p>
                          ))}
                        </div>
                      ) : null}

                      {item?.addons.length ? (
                        <div className="mt-4 space-y-2 text-sm text-neutral-300">
                          {item.addons.map((addon) => (
                            <div className="rounded-xl border border-[var(--line)] px-3 py-3" key={addon.addonId}>
                              <p className="font-medium text-slate-200">{addon.name}</p>
                              {addon.description ? <p className="mt-1 text-neutral-400">{addon.description}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Subtotal</span>
                  <span>{formatMoney(effectiveCurrentBreakdown?.subtotal, effectiveCurrentBreakdown?.currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Discount</span>
                  <span>
                    {typeof effectiveCurrentBreakdown?.discount === "number"
                      ? `-${formatMoney(effectiveCurrentBreakdown.discount, effectiveCurrentBreakdown.currency)}`
                      : "N/A"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Tax</span>
                  <span>{formatMoney(effectiveCurrentBreakdown?.tax, effectiveCurrentBreakdown?.currency)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-base font-semibold text-slate-100">
                  <span>Due today</span>
                  <span>{formatMoney(effectiveCurrentBreakdown?.totalAmount, effectiveCurrentBreakdown?.currency)}</span>
                </div>
                {preview?.recurringBreakdown ? (
                  <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-sm text-sky-100">
                    <p className="font-medium">Recurring terms</p>
                    <p className="mt-2 text-sky-100/90">
                      This subscription renews automatically until canceled. The renewal amount is
                      {" "}
                      <strong>{formatMoney(preview.recurringBreakdown.totalAmount, preview.currency)}</strong>
                      {" "}
                      per billing cycle, plus any applicable taxes displayed in secure checkout.
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                  <span>Currency: {effectiveCurrentBreakdown?.currency ?? preview?.currency ?? "USD"}</span>
                  <span>Billing country: {preview?.billingCountry ?? "Collected in checkout"}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="btn btn-primary"
                  disabled={!canManageBilling || checkoutLoading || previewLoading}
                  onClick={startCheckout}
                  type="button"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading checkout
                    </>
                  ) : checkoutSession ? (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Reload secure checkout
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Open secure checkout
                    </>
                  )}
                </button>
                <a
                  className="btn btn-ghost"
                  href="/billing-policy"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Receipt className="h-4 w-4" />
                  Refund policy
                </a>
              </div>
            </article>

            <article className="panel-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="kicker">Billing status</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-100">Payment lifecycle</h3>
                </div>
                <span className={`badge ${statusToneClass(paymentStatusLabel)}`}>{paymentStatusLabel}</span>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                  <p className="text-neutral-500">Last successful payment</p>
                  <p className="mt-2 font-medium text-slate-100">{formatDateTime(billing?.lastPaymentAt)}</p>
                  <p className="mt-1 text-neutral-400">
                    {formatMoney(billing?.lastPaymentAmount, billing?.lastPaymentCurrency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                  <p className="text-neutral-500">Current billing period</p>
                  <p className="mt-2 font-medium text-slate-100">{formatDateTime(billing?.currentPeriodStart)}</p>
                  <p className="mt-1 text-neutral-400">through {formatDateTime(billing?.currentPeriodEnd)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                  <p className="text-neutral-500">Recovery automation</p>
                  <p className="mt-2 font-medium text-slate-100">{billing?.failureReminderCount ?? 0} reminders sent</p>
                  <p className="mt-1 text-neutral-400">Past-due workspaces downgrade to Starter after the recovery window ends.</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                  <p className="text-neutral-500">Invoice and references</p>
                  {billing?.lastInvoiceUrl ? (
                    <a
                      className="mt-2 inline-flex items-center gap-2 font-medium text-sky-200 hover:text-sky-100"
                      href={billing.lastInvoiceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open latest invoice <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p className="mt-2 text-neutral-400">Invoice link will appear after the next completed payment.</p>
                  )}
                </div>
              </div>

              {billing?.paymentFailedAt ? (
                <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Payment failure detected at {formatDateTime(billing.paymentFailedAt)}. Fix billing before the recovery window ends to avoid an automatic downgrade.
                </div>
              ) : null}

              {billing?.canceledAt ? (
                <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Subscription canceled at {formatDateTime(billing.canceledAt)}{billing.cancelReason ? ` (${billing.cancelReason}).` : "."}
                </div>
              ) : null}
            </article>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            {[
              {
                label: "Incidents / day",
                used: usage.incidentsCreated,
                limit: quota.incidentsPerDay,
              },
              {
                label: "Triage runs / day",
                used: usage.triageRuns,
                limit: quota.triageRunsPerDay,
              },
              {
                label: "Customer updates / day",
                used: usage.customerUpdates,
                limit: quota.customerUpdatesPerDay,
              },
              {
                label: "Reminder emails / day",
                used: usage.reminderEmailsSent,
                limit: quota.reminderEmailsPerDay,
              },
            ].map((row) => (
              <article className="panel-card p-4" key={row.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-100">{row.label}</p>
                  <span className="text-sm text-neutral-400">
                    {row.used} / {row.limit}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-900">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-[width]"
                    style={{ width: `${percent(row.used, row.limit)}%` }}
                  />
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="panel-card h-fit p-5 xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="kicker">Secure checkout</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">Embedded payment frame</h3>
              <p className="mt-2 text-sm text-neutral-400">
                TrustLoop keeps plan and pricing context on this page. Payment details stay inside Dodo’s secure checkout frame and footer.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className={`badge ${statusToneClass(paymentStatusLabel)}`}>{paymentStatusLabel}</span>
            {sessionStatusLoading ? (
              <span className="inline-flex items-center gap-2 text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking session
              </span>
            ) : null}
          </div>

          {checkoutHint ? <p className="mt-3 text-sm text-neutral-400">{checkoutHint}</p> : null}
          {checkoutError ? (
            <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            </div>
          ) : null}

          {sessionStatus ? (
            <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                <p className="text-neutral-500">Session created</p>
                <p className="mt-2 font-medium text-slate-100">{formatDateTime(sessionStatus.sessionCreatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
                <p className="text-neutral-500">Payment status</p>
                <p className="mt-2 font-medium text-slate-100">{formatStatusLabel(sessionStatus.paymentStatus ?? sessionStatus.providerStatus)}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))]">
            {!checkoutSession ? (
              <div className="flex min-h-[640px] flex-col items-center justify-center gap-4 px-6 py-12 text-center text-neutral-400">
                <CreditCard className="h-10 w-10 text-sky-200" />
                <div>
                  <p className="text-base font-medium text-slate-100">Secure checkout appears here</p>
                  <p className="mt-2 max-w-sm text-sm text-neutral-400">
                    Review the pricing summary, apply any coupon, then open the embedded Dodo checkout to finish payment without leaving settings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-[640px] bg-[#020617] p-3">
                {!checkoutFrameReady ? (
                  <div className="flex min-h-[120px] items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-white/5 px-4 py-4 text-sm text-neutral-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing the payment form…
                  </div>
                ) : null}
                <div className={checkoutFrameReady ? "mt-3" : "mt-4"} id={CHECKOUT_ELEMENT_ID} />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-400">
            <p className="flex items-center gap-2 font-medium text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Inline checkout requirements are covered here
            </p>
            <ul className="mt-3 space-y-2">
              <li>Recurring pricing is shown above whenever the selected plan renews.</li>
              <li>Item descriptions, totals, tax, and currency remain visible next to the checkout frame.</li>
              <li>The embedded Dodo frame keeps its footer and legal information intact.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
