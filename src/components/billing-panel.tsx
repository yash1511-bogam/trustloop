"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useCleanUrl } from "@/hooks/use-clean-url";
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

  return date.toLocaleString("en-US");
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
  useCleanUrl(["billing"]);
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
  const [, setGatewayOpen] = useState(false);
  const [checkoutLaunchNonce, setCheckoutLaunchNonce] = useState(0);
  const [liveBreakdown, setLiveBreakdown] = useState<LiveBreakdown | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckoutStatusPayload | null>(null);
  const [, setSessionStatusLoading] = useState(false);
  const previewRequestId = useRef(0);
  const previewCouponCodeRef = useRef<string | null>(previewCouponCode);
  const dodoRef = useRef<DodoSdk | null>(null);

  const normalizedCouponInput = normalizeCoupon(couponCode);
  const previewDirty = normalizedCouponInput !== previewCouponCode;
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
          onEvent: (event) => {
            if (cancelled) {
              return;
            }

            const data = asRecord(event.data);

            if (event.event_type === "checkout.opened") {
              setCheckoutFrameReady(true);
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
            fontSize: "md",
            fontWeight: "medium",
            payButtonText: "Complete checkout",
            showSecurityBadge: true,
            showTimer: false,
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
    <div className="space-y-16">
      {billingNotice ? (
        <div className="py-4 text-sm text-sky-400 border-l-2 border-sky-400 pl-4">
          {billingNotice}
        </div>
      ) : null}

      {!canManageBilling ? (
        <div className="py-4 text-sm text-amber-400 border-l-2 border-amber-400 pl-4">
          Billing changes are limited to workspace owners and managers. You can still review usage, plan details, and payment status here.
        </div>
      ) : null}

      {/* Overview Section */}
      <section className="pb-10 border-b border-white/5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium text-slate-100">Overview</h2>
          <span className={`text-sm tracking-wide ${paymentStatusValue.includes("active") || paymentStatusValue.includes("paid") ? "text-emerald-400" : "text-neutral-400"}`}>
            {paymentStatusLabel}
          </span>
        </div>

        <div className="mt-8 grid gap-12 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm tracking-wide text-neutral-500">Current plan</p>
            <p className="mt-2 text-2xl font-light text-slate-100">{planDefinitionFor(planTier).label}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-neutral-500">Last payment</p>
            <p className="mt-2 text-2xl font-light text-slate-100">
              {formatMoney(billing?.lastPaymentAmount, billing?.lastPaymentCurrency)}
            </p>
            <p className="mt-1 text-sm text-neutral-400">{formatDateTime(billing?.lastPaymentAt)}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-neutral-500">Renewal window</p>
            <p className="mt-2 text-2xl font-light text-slate-100">{formatDateTime(billing?.currentPeriodEnd)}</p>
            <p className="mt-1 text-sm text-neutral-400">Current period started {formatDateTime(billing?.currentPeriodStart)}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-neutral-500">Recovery reminders</p>
            <p className="mt-2 text-2xl font-light text-slate-100">{billing?.failureReminderCount ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Plan Selection */}
      <section className="pb-10 border-b border-white/5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium text-slate-100">Plan</h2>
          <span className="text-sm text-neutral-500 tracking-wide">
            {availablePlans.length} plans
          </span>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-3">
          {availablePlans.map((plan) => {
            const isSelected = plan.id === selectedPlan;
            const isCurrent = plan.id === planTier;
            return (
              <article
                className={`transition-opacity cursor-pointer flex flex-col ${
                  isSelected ? "opacity-100" : "opacity-50 hover:opacity-100"
                }`}
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-light text-slate-100">{plan.label}</p>
                  {isCurrent && <span className="text-xs tracking-wider text-sky-400">CURRENT</span>}
                  {isSelected && !isCurrent && <span className="text-xs tracking-wider text-emerald-400">SELECTED</span>}
                </div>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{plan.description}</p>
                <div className="mt-6 flex-grow">
                  <ul className="space-y-3 text-sm text-neutral-300">
                    {plan.bullets.map((bullet) => (
                      <li className="flex items-start gap-3" key={bullet}>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Seamless Payment Flow */}
      <section className="pb-10 border-b border-white/5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium text-slate-100">Checkout</h2>
          {previewLoading && (
            <span className="text-sm tracking-wide text-neutral-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating
            </span>
          )}
        </div>

        <div className="mt-8 grid gap-16 lg:grid-cols-2">
          {/* Left Column: Summary & Coupon */}
          <div className="space-y-10">
            <div>
              <p className="text-3xl font-light text-slate-100 mb-6">
                {formatMoney(
                  effectiveCurrentBreakdown?.totalAmount,
                  effectiveCurrentBreakdown?.currency,
                )} <span className="text-lg text-neutral-500">due today</span>
              </p>

              <div className="space-y-4 text-sm text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Subtotal</span>
                  <span>{formatMoney(effectiveCurrentBreakdown?.subtotal, effectiveCurrentBreakdown?.currency)}</span>
                </div>
                {typeof effectiveCurrentBreakdown?.discount === "number" && effectiveCurrentBreakdown.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatMoney(effectiveCurrentBreakdown.discount, effectiveCurrentBreakdown.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tax</span>
                  <span>{formatMoney(effectiveCurrentBreakdown?.tax, effectiveCurrentBreakdown?.currency)}</span>
                </div>
              </div>

              {preview?.recurringBreakdown && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <p className="text-sm text-neutral-500 mb-2">Recurring</p>
                  <p className="text-sm text-neutral-300">
                    Renews automatically at <span className="text-slate-100">{formatMoney(preview.recurringBreakdown.totalAmount, preview.currency)}</span> per billing cycle.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-white/5">
              <label className="block text-sm text-neutral-500 mb-4">Promo code</label>
              <div className="flex items-center gap-4">
                <input
                  className="bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors w-full placeholder:text-neutral-600"
                  disabled={!canManageBilling}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Enter code"
                  value={couponCode}
                  onBlur={refreshPricing}
                  onKeyDown={(e) => e.key === 'Enter' && refreshPricing()}
                />
                {(couponCode || previewCouponCode) && (
                  <button
                    className="text-sm text-neutral-500 hover:text-slate-300 transition-colors"
                    onClick={clearCoupon}
                    type="button"
                  >
                    Clear
                  </button>
                )}
              </div>
              {previewDirty && (
                <p className="mt-2 text-xs text-amber-400">Press enter to apply</p>
              )}
            </div>
            {previewError && <p className="text-sm text-red-400">{previewError}</p>}
            {preview?.taxIdError && <p className="text-sm text-red-400">{preview.taxIdError}</p>}
          </div>

          {/* Right Column: Inline Form */}
          <div>
            {!checkoutSession ? (
              <div className="h-full flex flex-col justify-center">
                <button
                  className="group flex items-center justify-between w-full py-6 border-b border-white/10 hover:border-sky-400 transition-colors text-left"
                  disabled={!canManageBilling || checkoutLoading || previewLoading}
                  onClick={startCheckout}
                  type="button"
                >
                  <span className="text-2xl font-light text-slate-100">
                    {checkoutLoading ? "Preparing secure checkout..." : "Proceed to payment"}
                  </span>
                  {!checkoutLoading && <ArrowRight className="h-6 w-6 text-neutral-500 group-hover:text-sky-400 transition-colors" />}
                </button>
                <p className="mt-6 text-sm text-neutral-500 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Secure inline payment
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {checkoutHint && !checkoutFrameReady && (
                  <p className="text-sm text-neutral-500 mb-6">{checkoutHint}</p>
                )}
                {checkoutError && (
                  <div className="mb-6 text-sm text-red-400 border-l-2 border-red-400 pl-4">
                    {checkoutError}
                  </div>
                )}
                
                <div className="min-h-[300px]" id={CHECKOUT_ELEMENT_ID} />

                {sessionStatus && sessionFinalized && (
                  <div className="mt-8 text-sm text-neutral-500">
                    <button className="text-sky-400 hover:text-sky-300 transition-colors" onClick={startCheckout}>
                      Start new payment session
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Usage & Lifecycle Minimalist Grid */}
      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100 mb-8">Activity & Quotas</h2>
        <div className="grid gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <h3 className="text-sm tracking-wide text-neutral-500 mb-6 uppercase">Lifecycle</h3>
            <div>
              <p className="text-sm text-neutral-400 mb-1">Current period</p>
              <p className="text-slate-200">{formatDateTime(billing?.currentPeriodStart)} - {formatDateTime(billing?.currentPeriodEnd)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400 mb-1">Cancellation</p>
              <p className="text-slate-200">{billing?.canceledAt ? formatDateTime(billing.canceledAt) : "Active"}</p>
              <p className="text-sm text-neutral-500 mt-1">{billing?.cancelReason ?? "No cancellation scheduled."}</p>
            </div>
            {billing?.lastInvoiceUrl && (
              <div>
                <a
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-2"
                  href={billing.lastInvoiceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View latest invoice <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <a className="text-sm text-neutral-500 hover:text-slate-300 transition-colors inline-flex items-center gap-2" href="/billing-policy" rel="noreferrer" target="_blank">
              Refund policy
            </a>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm tracking-wide text-neutral-500 mb-6 uppercase">Today&apos;s Usage</h3>
            {[
              { label: "Incidents", used: usage.incidentsCreated, limit: quota.incidentsPerDay },
              { label: "Triage runs", used: usage.triageRuns, limit: quota.triageRunsPerDay },
              { label: "Customer updates", used: usage.customerUpdates, limit: quota.customerUpdatesPerDay },
              { label: "Reminder emails", used: usage.reminderEmailsSent, limit: quota.reminderEmailsPerDay },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-200">{row.label}</span>
                  <span className="text-neutral-500">{row.used} / {row.limit}</span>
                </div>
                <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-1000 ease-out"
                    style={{ width: `${percent(row.used, row.limit)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {billing?.paymentFailedAt && (
          <p className="mt-8 text-sm text-red-400">
            Payment failure detected at {formatDateTime(billing.paymentFailedAt)}.
          </p>
        )}
      </section>
    </div>
  );
}
