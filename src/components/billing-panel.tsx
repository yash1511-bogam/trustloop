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
      elementId?: string;
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
const CHECKOUT_STORAGE_KEY = "trustloop.billing.pendingCheckout";
const FINAL_PAYMENT_STATUSES = new Set(["failed", "succeeded", "cancelled", "canceled"]);

const gatewayTheme = {
  radius: "18px",
  light: {
    bgPrimary: "#04050b",
    bgSecondary: "#0b1020",
    borderPrimary: "rgba(148, 163, 184, 0.28)",
    borderSecondary: "rgba(148, 163, 184, 0.14)",
    buttonPrimary: "#e2e8f0",
    buttonPrimaryHover: "#f8fafc",
    buttonSecondary: "#121a2c",
    buttonSecondaryHover: "#172033",
    buttonTextPrimary: "#020617",
    buttonTextSecondary: "#e2e8f0",
    inputFocusBorder: "#38bdf8",
    textError: "#fca5a5",
    textPlaceholder: "#94a3b8",
    textPrimary: "#e5eefb",
    textSecondary: "#94a3b8",
    textSuccess: "#86efac",
  },
  dark: {
    bgPrimary: "#04050b",
    bgSecondary: "#0b1020",
    borderPrimary: "rgba(148, 163, 184, 0.28)",
    borderSecondary: "rgba(148, 163, 184, 0.16)",
    buttonPrimary: "#e2e8f0",
    buttonPrimaryHover: "#f8fafc",
    buttonSecondary: "#121a2c",
    buttonSecondaryHover: "#172033",
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
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [checkoutLaunchNonce, setCheckoutLaunchNonce] = useState(0);
  const [liveBreakdown, setLiveBreakdown] = useState<LiveBreakdown | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckoutStatusPayload | null>(null);
  const [sessionStatusLoading, setSessionStatusLoading] = useState(false);
  const previewRequestId = useRef(0);
  const previewCouponCodeRef = useRef<string | null>(previewCouponCode);
  const dodoRef = useRef<DodoSdk | null>(null);

  const normalizedCouponInput = normalizeCoupon(couponCode);
  const previewDirty = normalizedCouponInput !== previewCouponCode;
  const selectedPlanDefinition = useMemo(() => planDefinitionFor(selectedPlan), [selectedPlan]);
  const availablePlans = useMemo(
    () => (["starter", "pro", "enterprise"] as PlanTier[]).map((plan) => planDefinitionFor(plan)),
    [],
  );

  const persistCheckoutSession = useCallback((session: CheckoutSession) => {
    try {
      window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore browser storage failures; the checkout can still continue in the current tab.
    }
  }, []);

  const clearStoredCheckoutSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch {
      // Ignore browser storage failures.
    }
  }, []);

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
    try {
      const storedValue = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (!storedValue) {
        return;
      }

      const parsed = JSON.parse(storedValue) as Partial<CheckoutSession>;
      if (
        typeof parsed.checkoutUrl !== "string" ||
        typeof parsed.sessionId !== "string" ||
        (parsed.plan !== "starter" && parsed.plan !== "pro" && parsed.plan !== "enterprise")
      ) {
        clearStoredCheckoutSession();
        return;
      }

      const restoredCouponCode = normalizeCoupon(parsed.couponCode);
      const restoredSession: CheckoutSession = {
        checkoutUrl: parsed.checkoutUrl,
        couponCode: restoredCouponCode,
        plan: parsed.plan,
        sessionId: parsed.sessionId,
      };

      setSelectedPlan(restoredSession.plan);
      setCouponCode(restoredSession.couponCode ?? "");
      setPreviewCouponCode(restoredSession.couponCode);
      previewCouponCodeRef.current = restoredSession.couponCode;
      setCheckoutSession(restoredSession);
      setCheckoutFrameReady(false);
      setCheckoutHint("Resuming your payment session. Reload the payment form if further confirmation is still required.");
      void loadPreview(restoredSession.plan, restoredSession.couponCode);
      setCheckoutLaunchNonce((current) => current + 1);
    } catch {
      clearStoredCheckoutSession();
    }
  }, [clearStoredCheckoutSession, loadPreview]);

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
      setGatewayOpen(false);
      setCheckoutHint("Plan or coupon changed. Start a new payment session to apply the updated summary.");
      setSessionStatus(null);
      setLiveBreakdown(null);
      clearStoredCheckoutSession();
    }
  }, [checkoutSession, clearStoredCheckoutSession, previewCouponCode, selectedPlan]);

  useEffect(() => {
    if (!checkoutSession?.checkoutUrl || checkoutLaunchNonce === 0) {
      return;
    }

    const checkoutUrl = checkoutSession.checkoutUrl;
    let cancelled = false;

    async function mountCheckout() {
      setCheckoutError(null);
      setCheckoutFrameReady(false);
      setGatewayOpen(false);
      setCheckoutHint("Loading payment form…");

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
              setGatewayOpen(true);
              setCheckoutHint("Payment form loaded.");
              return;
            }

            if (event.event_type === "checkout.payment_page_opened") {
              setGatewayOpen(true);
              setCheckoutHint("Payment page is ready.");
              return;
            }

            if (event.event_type === "checkout.form_ready") {
              setCheckoutFrameReady(true);
              setGatewayOpen(true);
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
                setCheckoutFrameReady(false);
                setGatewayOpen(false);
                setCheckoutHint("Continuing to payment verification in the same tab…");
                window.location.assign(redirectUrl);
              }
              return;
            }

            if (event.event_type === "checkout.redirect") {
              setCheckoutFrameReady(false);
              setGatewayOpen(false);
              setCheckoutHint("Continuing to payment verification in the same tab…");
              return;
            }

            if (event.event_type === "checkout.link_expired") {
              setCheckoutFrameReady(false);
              setGatewayOpen(false);
              setCheckoutError("This payment session expired. Start a new payment session.");
              clearStoredCheckoutSession();
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
              setGatewayOpen(false);
              setCheckoutHint("Payment form closed. Reload it any time to continue this billing session.");
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
          setCheckoutError("Payment form container could not be mounted.");
          return;
        }

        target.innerHTML = "";
        sdk.Checkout.open({
          checkoutUrl,
          elementId: CHECKOUT_ELEMENT_ID,
          options: {
            fontSize: "sm",
            fontWeight: "medium",
            payButtonText: "Proceed to payment",
            showSecurityBadge: true,
            showTimer: true,
            themeConfig: gatewayTheme,
          },
        });
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : "Payment form could not be loaded.",
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
  }, [checkoutLaunchNonce, checkoutMode, checkoutSession?.checkoutUrl, clearStoredCheckoutSession]);

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
    const paymentStatus = sessionStatus?.paymentStatus?.toLowerCase();
    if (!paymentStatus || !FINAL_PAYMENT_STATUSES.has(paymentStatus)) {
      return;
    }

    clearStoredCheckoutSession();
    setCheckoutFrameReady(false);
    setGatewayOpen(false);
  }, [clearStoredCheckoutSession, sessionStatus?.paymentStatus]);

  async function refreshPricing() {
    await loadPreview(selectedPlan, normalizedCouponInput);
  }

  async function clearCoupon() {
    setCouponCode("");
    await loadPreview(selectedPlan, null);
  }

  function resumeCheckout() {
    if (!checkoutSession) {
      return;
    }

    setCheckoutError(null);
    setCheckoutHint("Loading payment form…");
    setCheckoutLaunchNonce((current) => current + 1);
  }

  async function startCheckout() {
    if (!canManageBilling) {
      return;
    }

    if (previewDirty) {
      setCheckoutError("Refresh the billing summary after editing the coupon code before starting payment.");
      return;
    }

    if (!preview && !previewLoading) {
      setCheckoutError("Load the billing summary before starting payment.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutHint("Creating payment session…");
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

      const nextSession: CheckoutSession = {
        checkoutUrl: payload.checkoutUrl,
        couponCode: previewCouponCode,
        plan: selectedPlan,
        sessionId: payload.sessionId,
      };

      setCheckoutSession(nextSession);
      setCheckoutFrameReady(false);
      persistCheckoutSession(nextSession);
      setCheckoutHint("Loading payment form…");
      setCheckoutLaunchNonce((current) => current + 1);
    } catch (error) {
      setCheckoutLoading(false);
      setCheckoutError(
        error instanceof Error ? error.message : "Checkout session could not be created.",
      );
    }
  }

  const paymentStatusValue = sessionStatus?.paymentStatus ?? billing?.status ?? "pending";
  const paymentStatusLabel = formatStatusLabel(paymentStatusValue);
  const sessionFinalized =
    !!sessionStatus?.paymentStatus &&
    FINAL_PAYMENT_STATUSES.has(sessionStatus.paymentStatus.toLowerCase());

  return (
    <div className="space-y-6">
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

      <section className="panel-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Billing overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              {planDefinitionFor(planTier).label}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Choose a plan, review live pricing, then proceed to payment. The payment form only opens lower on the page after you confirm the selection.
            </p>
          </div>
          <span className={`badge ${statusToneClass(paymentStatusValue)}`}>{paymentStatusLabel}</span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Current plan</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{planDefinitionFor(planTier).label}</p>
            <p className="mt-1 text-sm text-neutral-400">{planDefinitionFor(planTier).headline}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Last payment</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {formatMoney(billing?.lastPaymentAmount, billing?.lastPaymentCurrency)}
            </p>
            <p className="mt-1 text-sm text-neutral-400">{formatDateTime(billing?.lastPaymentAt)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Renewal window</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{formatDateTime(billing?.currentPeriodEnd)}</p>
            <p className="mt-1 text-sm text-neutral-400">Current period started {formatDateTime(billing?.currentPeriodStart)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Recovery reminders</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{billing?.failureReminderCount ?? 0}</p>
            <p className="mt-1 text-sm text-neutral-400">Past-due workspaces downgrade to Starter after the recovery window ends.</p>
          </div>
        </div>
      </section>

      <section className="panel-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Step 1</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">Select a payment plan</h3>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Pick the workspace plan first. Pricing and checkout stay separate so the page is easier to scan.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-neutral-500">
            {availablePlans.length} plans available
          </span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {availablePlans.map((plan) => {
            const isSelected = plan.id === selectedPlan;
            const isCurrent = plan.id === planTier;
            return (
              <article
                className={`rounded-[28px] border p-5 transition-colors ${
                  isSelected
                    ? "border-sky-400/60 bg-sky-500/10"
                    : "border-[var(--line)] bg-[var(--bg-soft)]"
                }`}
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-100">{plan.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-sky-200/80">
                      {plan.headline}
                    </p>
                  </div>
                  {isCurrent ? <span className="badge">Current</span> : null}
                </div>
                <p className="mt-3 text-sm text-neutral-400">{plan.description}</p>
                <div className="mt-4 max-h-40 overflow-y-auto pr-1">
                  <ul className="space-y-2 text-sm text-neutral-300">
                    {plan.bullets.map((bullet) => (
                      <li className="flex items-start gap-2" key={bullet}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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

      <section className="panel-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Step 2</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">Review pricing</h3>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Review the live billing preview for {selectedPlanDefinition.label}, apply a coupon if needed, then proceed to payment.
            </p>
          </div>
          {previewLoading ? (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating preview
            </span>
          ) : (
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500">Live Dodo preview</span>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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
            </div>
            {previewDirty ? (
              <p className="mt-3 text-xs text-amber-200">
                Coupon edits are not applied yet. Refresh pricing before proceeding to payment.
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

          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-100">{selectedPlanDefinition.label}</p>
                <p className="mt-1 text-sm text-neutral-400">{selectedPlanDefinition.description}</p>
              </div>
              <span className="text-sm text-neutral-400">
                Currency: {effectiveCurrentBreakdown?.currency ?? preview?.currency ?? "USD"}
              </span>
            </div>

            <div className="mt-4 max-h-[360px] space-y-4 overflow-y-auto pr-1">
              {(preview?.productCart.length ? preview.productCart : [null]).map((item, index) => {
                const title = item?.name ?? selectedPlanDefinition.label;
                const description = item?.description ?? selectedPlanDefinition.description;

                return (
                  <div
                    className="rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)] p-4"
                    key={item?.productId ?? index}
                  >
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
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
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
                            {meter.freeThreshold
                              ? `Free up to ${meter.freeThreshold.toLocaleString()} ${meter.measurementUnit}, `
                              : ""}
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
                            {addon.description ? (
                              <p className="mt-1 text-neutral-400">{addon.description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[rgba(2,6,23,0.5)] p-4 text-sm text-neutral-300">
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span>
                  {formatMoney(effectiveCurrentBreakdown?.subtotal, effectiveCurrentBreakdown?.currency)}
                </span>
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
                <span>
                  {formatMoney(
                    effectiveCurrentBreakdown?.totalAmount,
                    effectiveCurrentBreakdown?.currency,
                  )}
                </span>
              </div>

              {preview?.recurringBreakdown ? (
                <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-sm text-sky-100">
                  <p className="font-medium">Recurring terms</p>
                  <p className="mt-2 text-sky-100/90">
                    This subscription renews automatically until canceled. The renewal amount is{" "}
                    <strong>
                      {formatMoney(preview.recurringBreakdown.totalAmount, preview.currency)}
                    </strong>{" "}
                    per billing cycle, plus any applicable taxes displayed in payment.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span>Billing country: {preview?.billingCountry ?? "Collected in payment"}</span>
                <span>The payment form opens inline on this page after you proceed.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="btn btn-primary"
              disabled={!canManageBilling || checkoutLoading || previewLoading}
              onClick={checkoutSession && !sessionFinalized ? resumeCheckout : startCheckout}
              type="button"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing payment
                </>
              ) : checkoutSession && !sessionFinalized ? (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Reload payment form
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Proceed to payment
                </>
              )}
            </button>
            <a className="btn btn-ghost" href="/billing-policy" rel="noreferrer" target="_blank">
              <Receipt className="h-4 w-4" />
              Refund policy
            </a>
          </div>
        </div>
      </section>

      {checkoutSession ? (
        <section className="panel-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="kicker">Step 3</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">Payment form</h3>
              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                Payment opens inline in a black secure surface. If card or bank verification is required, the flow continues in the same tab and returns here when finished.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`badge ${statusToneClass(paymentStatusValue)}`}>{paymentStatusLabel}</span>
              {sessionStatusLoading ? (
                <span className="inline-flex items-center gap-2 text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking session
                </span>
              ) : null}
            </div>
          </div>

          {checkoutHint ? <p className="mt-4 text-sm text-neutral-400">{checkoutHint}</p> : null}

          {checkoutError ? (
            <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            </div>
          ) : null}

          {sessionStatus ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-300">
                <p className="text-neutral-500">Session created</p>
                <p className="mt-2 font-medium text-slate-100">
                  {formatDateTime(sessionStatus.sessionCreatedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-300">
                <p className="text-neutral-500">Payment status</p>
                <p className="mt-2 font-medium text-slate-100">
                  {formatStatusLabel(sessionStatus.paymentStatus ?? sessionStatus.providerStatus)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-300">
                <p className="text-neutral-500">Customer</p>
                <p className="mt-2 font-medium text-slate-100">
                  {sessionStatus.customerName ?? sessionStatus.customerEmail ?? "Collected in payment"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-800 bg-[linear-gradient(180deg,#06070d,#02030a)] p-6">
            <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-200/75">Secure payment</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-100">
                    Black inline payment surface with same-tab verification
                  </h4>
                  <p className="mt-2 text-sm text-slate-300/85">
                    TrustLoop keeps plan details on this page while Dodo renders the payment form inline below. OTP or bank verification continues in the same browser tab and returns to this billing session when complete.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={sessionFinalized ? startCheckout : resumeCheckout}
                    type="button"
                  >
                    <CreditCard className="h-4 w-4" />
                    {sessionFinalized
                      ? "Start new payment session"
                      : gatewayOpen
                        ? "Reload payment form"
                        : "Open payment form"}
                  </button>
                  <a className="btn btn-ghost" href="/billing-policy" rel="noreferrer" target="_blank">
                    <Receipt className="h-4 w-4" />
                    Refund policy
                  </a>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="text-slate-400">Form status</p>
                  <p className="mt-2 font-medium text-slate-100">
                    {sessionFinalized
                      ? "Completed"
                      : checkoutFrameReady
                        ? "Visible on this page"
                        : gatewayOpen
                          ? "Loading on this page"
                          : "Ready to load"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="text-slate-400">Verification handling</p>
                  <p className="mt-2 font-medium text-slate-100">Same tab, no popup windows</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="text-slate-400">Session ID</p>
                  <p className="mt-2 truncate font-medium text-slate-100">{checkoutSession.sessionId}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-[#04050b] p-3">
                {!checkoutFrameReady ? (
                  <div className="flex min-h-[120px] items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing the inline payment form…
                  </div>
                ) : null}
                <div className={checkoutFrameReady ? "mt-3" : "mt-4"} id={CHECKOUT_ELEMENT_ID} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4 text-sm text-neutral-400">
            <p className="flex items-center gap-2 font-medium text-slate-100">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Payment notes
            </p>
            <ul className="mt-3 space-y-2">
              <li>Recurring pricing and totals stay visible above while the payment form is active.</li>
              <li>OTP or bank verification continues in the same browser tab and returns to this billing screen.</li>
              <li>The Dodo inline payment form keeps its legal footer and secure payment controls intact.</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[var(--line)] bg-[var(--bg-soft)]/55 px-6 py-8 text-sm text-neutral-400">
          <div className="flex flex-wrap items-center gap-3">
            <CreditCard className="h-5 w-5 text-sky-200" />
            <p>The payment form opens inline on this page after you select a plan and click <span className="font-medium text-slate-100">Proceed to payment</span>.</p>
          </div>
        </section>
      )}

      <section className="panel-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Billing status</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">Payment lifecycle</h3>
          </div>
          <span className={`badge ${statusToneClass(paymentStatusValue)}`}>{paymentStatusLabel}</span>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-neutral-500">Current billing period</p>
            <p className="mt-2 font-medium text-slate-100">{formatDateTime(billing?.currentPeriodStart)}</p>
            <p className="mt-1 text-neutral-400">through {formatDateTime(billing?.currentPeriodEnd)}</p>
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
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-neutral-500">Recovery automation</p>
            <p className="mt-2 font-medium text-slate-100">
              {billing?.failureReminderCount ?? 0} reminders sent
            </p>
            <p className="mt-1 text-neutral-400">
              Past-due workspaces downgrade to Starter after the recovery window ends.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4">
            <p className="text-neutral-500">Cancellation</p>
            <p className="mt-2 font-medium text-slate-100">
              {billing?.canceledAt ? formatDateTime(billing.canceledAt) : "Active"}
            </p>
            <p className="mt-1 text-neutral-400">
              {billing?.cancelReason ?? "No cancellation scheduled."}
            </p>
          </div>
        </div>

        {billing?.paymentFailedAt ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Payment failure detected at {formatDateTime(billing.paymentFailedAt)}. Fix billing before the recovery window ends to avoid an automatic downgrade.
          </div>
        ) : null}
      </section>

      <section className="panel-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Usage today</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">Workspace limits</h3>
          </div>
          <span className="text-xs uppercase tracking-[0.16em] text-neutral-500">
            Resets daily
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--bg-base)] p-4" key={row.label}>
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
        </div>
      </section>
    </div>
  );
}
