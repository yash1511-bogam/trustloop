"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Check,
} from "@/components/icon-compat";
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
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amountCents !== "number") return "N/A";
  const amount = amountCents / 100;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US");
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseBreakdown(data: Record<string, unknown> | undefined): LiveBreakdown | null {
  if (!data) return null;
  const readNumber = (v: unknown): number | null => (typeof v === "number" ? v : null);
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
  if (!data) return null;
  const message = asRecord(data.message);
  return firstString(data.redirect_to, message.redirect_to, data.url, message.url);
}

type BillingInterval = "monthly" | "annual";

const PLAN_PRICES: Record<PlanTier, { monthly: number; annual: number }> = {
  starter: { monthly: 49, annual: 39 },
  pro: { monthly: 149, annual: 119 },
  enterprise: { monthly: 0, annual: 0 },
};

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
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [couponCode, setCouponCode] = useState(billing?.discountCode ?? "");
  const [previewCouponCode, setPreviewCouponCode] = useState<string | null>(normalizeCoupon(billing?.discountCode));
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
  const isEnterprise = selectedPlan === "enterprise";
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [canceledLocally, setCanceledLocally] = useState(false);

  const persistCheckoutSession = useCallback((session: CheckoutSession) => {
    try { window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(session)); } catch { /* noop */ }
  }, []);

  const clearStoredCheckoutSession = useCallback(() => {
    try { window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const effectiveCurrentBreakdown = useMemo(() => {
    if (!preview) return null;
    return {
      currency: liveBreakdown?.currency ?? preview.currency,
      discount: liveBreakdown?.discount ?? preview.currentBreakdown.discount,
      subtotal: liveBreakdown?.subtotal ?? preview.currentBreakdown.subtotal,
      tax: liveBreakdown?.tax ?? preview.currentBreakdown.tax,
      totalAmount: liveBreakdown?.finalTotal ?? liveBreakdown?.total ?? preview.currentBreakdown.totalAmount,
    };
  }, [liveBreakdown, preview]);

  const loadPreview = useCallback(async (plan: PlanTier, appliedCouponCode: string | null, interval: BillingInterval = "monthly") => {
    if (plan === "enterprise") { setPreviewLoading(false); return false; }
    const requestId = ++previewRequestId.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/billing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval, couponCode: appliedCouponCode }),
      });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & BillingPreview) | null;
      if (requestId !== previewRequestId.current) return false;
      setPreviewLoading(false);
      if (!response.ok || !payload) { setPreviewError(payload?.error ?? "Could not load billing preview."); return false; }
      setPreview(payload as BillingPreview);
      setPreviewCouponCode(appliedCouponCode);
      setLiveBreakdown(null);
      return true;
    } catch (error) {
      if (requestId !== previewRequestId.current) return false;
      setPreviewLoading(false);
      setPreviewError(error instanceof Error ? error.message : "Could not load billing preview.");
      return false;
    }
  }, []);

  useEffect(() => { previewCouponCodeRef.current = previewCouponCode; }, [previewCouponCode]);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (!storedValue) return;
      const parsed = JSON.parse(storedValue) as Partial<CheckoutSession>;
      if (typeof parsed.checkoutUrl !== "string" || typeof parsed.sessionId !== "string" || (parsed.plan !== "starter" && parsed.plan !== "pro" && parsed.plan !== "enterprise")) { clearStoredCheckoutSession(); return; }
      const restoredCouponCode = normalizeCoupon(parsed.couponCode);
      const restoredSession: CheckoutSession = { checkoutUrl: parsed.checkoutUrl, couponCode: restoredCouponCode, plan: parsed.plan, sessionId: parsed.sessionId };
      setSelectedPlan(restoredSession.plan);
      setCouponCode(restoredSession.couponCode ?? "");
      setPreviewCouponCode(restoredSession.couponCode);
      previewCouponCodeRef.current = restoredSession.couponCode;
      setCheckoutSession(restoredSession);
      setCheckoutFrameReady(false);
      setCheckoutHint("Resuming your payment session. Reload the payment form if further confirmation is still required.");
      void loadPreview(restoredSession.plan, restoredSession.couponCode, billingInterval);
      setCheckoutLaunchNonce((c) => c + 1);
    } catch { clearStoredCheckoutSession(); }
  }, [billingInterval, clearStoredCheckoutSession, loadPreview]);

  useEffect(() => { void loadPreview(selectedPlan, previewCouponCodeRef.current, billingInterval); }, [loadPreview, selectedPlan, billingInterval]);

  useEffect(() => {
    if (!checkoutSession) return;
    if (checkoutSession.plan !== selectedPlan || checkoutSession.couponCode !== previewCouponCode) {
      try { dodoRef.current?.Checkout.close(); } catch { /* noop */ }
      setCheckoutSession(null); setCheckoutFrameReady(false); setGatewayOpen(false);
      setCheckoutHint("Plan or billing cycle changed. Start a new payment session to apply the updated summary.");
      setSessionStatus(null); setLiveBreakdown(null); clearStoredCheckoutSession();
    }
  }, [checkoutSession, clearStoredCheckoutSession, previewCouponCode, selectedPlan, billingInterval]);

  useEffect(() => {
    if (!checkoutSession?.checkoutUrl || checkoutLaunchNonce === 0) return;
    const checkoutUrl = checkoutSession.checkoutUrl;
    let cancelled = false;
    async function mountCheckout() {
      setCheckoutError(null); setCheckoutFrameReady(false); setGatewayOpen(false); setCheckoutHint("Loading payment form…");
      try {
        const sdkModule = await import("dodopayments-checkout");
        if (cancelled) return;
        const sdk = sdkModule.DodoPayments as DodoSdk;
        dodoRef.current = sdk;
        sdk.Initialize({
          mode: checkoutMode, displayType: "inline",
          onEvent: (event) => {
            if (cancelled) return;
            const data = asRecord(event.data);
            if (event.event_type === "checkout.opened") { setCheckoutFrameReady(true); setGatewayOpen(true); setCheckoutHint("Payment form loaded."); return; }
            if (event.event_type === "checkout.payment_page_opened") { setGatewayOpen(true); setCheckoutHint("Payment page is ready."); return; }
            if (event.event_type === "checkout.form_ready") { setCheckoutFrameReady(true); setGatewayOpen(true); setCheckoutHint("Payment form is ready."); return; }
            if (event.event_type === "checkout.breakdown") { setLiveBreakdown(parseBreakdown(data)); return; }
            if (event.event_type === "checkout.status") { const m = asRecord(data.message); const ps = firstString(data.status, m.status, data.payment_status); if (ps) setSessionStatus((c) => c ? { ...c, paymentStatus: ps } : c); return; }
            if (event.event_type === "checkout.redirect_requested") { const r = extractRedirectUrl(data); if (r) { setCheckoutFrameReady(false); setGatewayOpen(false); setCheckoutHint("Continuing to payment verification…"); window.location.assign(r); } return; }
            if (event.event_type === "checkout.redirect") { setCheckoutFrameReady(false); setGatewayOpen(false); setCheckoutHint("Continuing to payment verification…"); return; }
            if (event.event_type === "checkout.link_expired") { setCheckoutFrameReady(false); setGatewayOpen(false); setCheckoutError("This payment session expired. Start a new payment session."); clearStoredCheckoutSession(); return; }
            if (event.event_type === "checkout.error") { const m = asRecord(data.message); setCheckoutError(firstString(data.message, m.message, m.error, data.error) ?? "Checkout encountered an unexpected error."); return; }
            if (event.event_type === "checkout.closed") { setCheckoutFrameReady(false); setGatewayOpen(false); setCheckoutHint("Payment form closed. Reload it any time to continue this billing session."); }
          },
        });
        try { sdk.Checkout.close(); } catch { /* noop */ }
        const target = document.getElementById(CHECKOUT_ELEMENT_ID);
        if (!target) { setCheckoutError("Payment form container could not be mounted."); return; }
        target.innerHTML = "";
        sdk.Checkout.open({ checkoutUrl, elementId: CHECKOUT_ELEMENT_ID, options: { fontSize: "md", fontWeight: "medium", payButtonText: "Complete checkout", showSecurityBadge: true, showTimer: false } });
      } catch (error) { setCheckoutError(error instanceof Error ? error.message : "Payment form could not be loaded."); }
    }
    void mountCheckout();
    return () => { cancelled = true; try { dodoRef.current?.Checkout.close(); } catch { /* noop */ } };
  }, [checkoutLaunchNonce, checkoutMode, checkoutSession?.checkoutUrl, clearStoredCheckoutSession]);

  useEffect(() => {
    if (!checkoutSession?.sessionId) return;
    const sessionId = checkoutSession.sessionId;
    let cancelled = false;
    let timeoutId: number | undefined;
    async function pollStatus() {
      setSessionStatusLoading(true);
      try {
        const response = await fetch(`/api/billing/session/${sessionId}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ({ error?: string } & CheckoutStatusPayload) | null;
        if (cancelled) return;
        setSessionStatusLoading(false);
        if (!response.ok || !payload) { if (payload?.error) setCheckoutHint(payload.error); return; }
        setSessionStatus(payload as CheckoutStatusPayload);
        if (!payload.paymentStatus || !FINAL_PAYMENT_STATUSES.has(payload.paymentStatus.toLowerCase())) { timeoutId = window.setTimeout(pollStatus, 4000); }
      } catch (error) { if (cancelled) return; setSessionStatusLoading(false); setCheckoutHint(error instanceof Error ? error.message : "Could not refresh checkout status."); }
    }
    void pollStatus();
    return () => { cancelled = true; if (timeoutId) window.clearTimeout(timeoutId); };
  }, [checkoutSession?.sessionId]);

  useEffect(() => {
    const ps = sessionStatus?.paymentStatus?.toLowerCase();
    if (!ps || !FINAL_PAYMENT_STATUSES.has(ps)) return;
    clearStoredCheckoutSession(); setCheckoutFrameReady(false); setGatewayOpen(false);
  }, [clearStoredCheckoutSession, sessionStatus?.paymentStatus]);

  async function refreshPricing() { await loadPreview(selectedPlan, normalizedCouponInput, billingInterval); }
  async function clearCoupon() { setCouponCode(""); await loadPreview(selectedPlan, null, billingInterval); }

  async function startCheckout() {
    if (!canManageBilling) return;
    if (previewDirty) { setCheckoutError("Refresh the billing summary after editing the coupon code before starting payment."); return; }
    if (!preview && !previewLoading) { setCheckoutError("Load the billing summary before starting payment."); return; }
    setCheckoutLoading(true); setCheckoutError(null); setCheckoutHint("Creating payment session…"); setSessionStatus(null); setLiveBreakdown(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: selectedPlan, interval: billingInterval, couponCode: previewCouponCode }) });
      setCheckoutLoading(false);
      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string | null; error?: string; sessionId?: string | null } | null;
      if (!response.ok || !payload?.checkoutUrl || !payload.sessionId) { setCheckoutError(payload?.error ?? "Checkout session could not be created."); return; }
      const nextSession: CheckoutSession = { checkoutUrl: payload.checkoutUrl, couponCode: previewCouponCode, plan: selectedPlan, sessionId: payload.sessionId };
      setCheckoutSession(nextSession); setCheckoutFrameReady(false); persistCheckoutSession(nextSession); setCheckoutHint("Loading payment form…"); setCheckoutLaunchNonce((c) => c + 1);
    } catch (error) { setCheckoutLoading(false); setCheckoutError(error instanceof Error ? error.message : "Checkout session could not be created."); }
  }

  const paymentStatusValue = sessionStatus?.paymentStatus ?? billing?.status ?? "pending";

  async function cancelSubscription() {
    if (!confirm("Are you sure you want to cancel? Your plan will remain active until the end of the current billing period.")) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setCancelError(data?.error ?? "Failed to cancel subscription.");
        return;
      }
      setCanceledLocally(true);
    } catch {
      setCancelError("Failed to cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  }

  const isCanceled = canceledLocally || !!billing?.canceledAt;
  const paymentStatusLabel = formatStatusLabel(paymentStatusValue);
  const sessionFinalized = !!sessionStatus?.paymentStatus && FINAL_PAYMENT_STATUSES.has(sessionStatus.paymentStatus.toLowerCase());

  return (
    <div className="space-y-10">
      {billingNotice && (
        <div className="border-l-2 border-[var(--color-signal)] py-4 pl-4 text-sm text-[var(--color-signal)]">{billingNotice}</div>
      )}
      {!canManageBilling && (
        <div className="py-4 text-sm text-[var(--color-warning)] border-l-2 border-[var(--color-warning)] pl-4">
          Billing changes are limited to workspace owners and managers. You can still review usage, plan details, and payment status here.
        </div>
      )}

      {/* ── Overview ── */}
      <section className="pb-10 border-b border-[var(--color-rim)]">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <h2 className="text-xl font-medium text-[var(--color-title)]">Overview</h2>
          <span className={`text-sm tracking-wide ${paymentStatusValue.includes("active") || paymentStatusValue.includes("paid") ? "text-[var(--color-resolve)]" : "text-[var(--color-subtext)]"}`}>
            {paymentStatusLabel}
          </span>
        </div>
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm tracking-wide text-[var(--color-ghost)]">Current plan</p>
            <p className="mt-2 text-2xl font-light text-[var(--color-title)]">{planDefinitionFor(planTier).label}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-[var(--color-ghost)]">Last payment</p>
            <p className="mt-2 text-2xl font-light text-[var(--color-title)]">{formatMoney(billing?.lastPaymentAmount, billing?.lastPaymentCurrency)}</p>
            <p className="mt-1 text-sm text-[var(--color-subtext)]">{formatDateTime(billing?.lastPaymentAt)}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-[var(--color-ghost)]">Renewal window</p>
            <p className="mt-2 text-2xl font-light text-[var(--color-title)]">{formatDateTime(billing?.currentPeriodEnd)}</p>
            <p className="mt-1 text-sm text-[var(--color-subtext)]">Started {formatDateTime(billing?.currentPeriodStart)}</p>
          </div>
          <div>
            <p className="text-sm tracking-wide text-[var(--color-ghost)]">Recovery reminders</p>
            <p className="mt-2 text-2xl font-light text-[var(--color-title)]">{billing?.failureReminderCount ?? 0}</p>
          </div>
        </div>
      </section>

      {/* ── Plan selection — 2026 3-tier side-by-side ── */}
      <section className="pb-10 border-b border-[var(--color-rim)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl font-medium text-[var(--color-title)]">Choose your plan</h2>
            <p className="mt-1 text-sm text-[var(--color-subtext)]">Simple pricing that scales with your team. No hidden fees.</p>
          </div>
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] p-1.5">
            <button
              className={billingInterval === "monthly" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setBillingInterval("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={billingInterval === "annual" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setBillingInterval("annual")}
              type="button"
            >
              Annual
              <span className="ml-1 rounded-full bg-[var(--color-signal-dim)] px-2 py-0.5 text-[11px] text-[var(--color-signal)]">save 20%</span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {(["starter", "pro", "enterprise"] as PlanTier[]).map((id) => {
            const plan = planDefinitionFor(id);
            const pp = PLAN_PRICES[id];
            const price = billingInterval === "annual" ? pp.annual : pp.monthly;
            const isSelected = id === selectedPlan;
            const isCurrent = id === planTier;
            const isPopular = id === "pro";

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedPlan(id)}
                className={`relative text-left p-6 rounded-2xl border transition-all flex flex-col ${
                  isSelected
                    ? "border-[var(--color-signal)] bg-[rgba(212,98,43,0.06)] ring-1 ring-[rgba(212,98,43,0.24)]"
                    : "border-[var(--color-rim)] bg-[var(--color-surface)] hover:border-[var(--color-ghost)]"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-signal)] px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white">
                    Most popular
                  </span>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-[var(--color-title)]">{plan.label}</p>
                  {isCurrent && <span className="text-[10px] tracking-wider text-[var(--color-signal)] font-medium uppercase">Current</span>}
                </div>
                <p className="mt-2">
                  <span className="text-2xl font-light text-[var(--color-title)]">{id === "enterprise" ? "Custom" : `$${price}`}</span>
                  <span className="text-sm text-[var(--color-ghost)]">{id === "enterprise" ? "" : "/mo"}</span>
                  {id !== "enterprise" && billingInterval === "annual" && (
                    <span className="ml-2 text-sm line-through text-[var(--color-ghost)]">${pp.monthly}</span>
                  )}
                </p>
                <p className="mt-3 text-sm text-[var(--color-subtext)] leading-relaxed">{plan.description}</p>
                <ul className="mt-5 space-y-2.5 flex-grow">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--color-body)]">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-[var(--color-signal)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                  {id === "enterprise" && (
                    <>
                      <li className="flex items-start gap-2.5 text-sm text-[var(--color-body)]">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[var(--color-signal)] shrink-0" />
                        <span>SAML SSO</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-[var(--color-body)]">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[var(--color-signal)] shrink-0" />
                        <span>Dedicated onboarding</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-[var(--color-body)]">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[var(--color-signal)] shrink-0" />
                        <span>Custom SLA</span>
                      </li>
                    </>
                  )}
                </ul>
                <div className="mt-6 pt-4 border-t border-[var(--color-rim)]">
                  {id === "enterprise" ? (
                    <Link
                      href="/contact-sales"
                      className="btn btn-ghost w-full justify-center text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Contact us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className={`block text-center text-sm font-medium ${isSelected ? "text-[var(--color-signal)]" : "text-[var(--color-ghost)]"}`}>
                      {isSelected ? "Selected" : "Select plan"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Checkout (hidden for Enterprise — they use Contact us) ── */}
      {!isEnterprise && (
        <section className="pb-10 border-b border-[var(--color-rim)]">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-medium text-[var(--color-title)]">Checkout</h2>
            {previewLoading && (
              <span className="text-sm tracking-wide text-[var(--color-ghost)] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating
              </span>
            )}
          </div>

          <div className="mt-8 grid gap-16 lg:grid-cols-2">
            {/* Left: Summary & Coupon */}
            <div className="space-y-10">
              <div>
                <div className="space-y-4 text-sm text-[var(--color-body)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Subtotal</span>
                    <span>{formatMoney(effectiveCurrentBreakdown?.subtotal, effectiveCurrentBreakdown?.currency)}</span>
                  </div>
                  {typeof effectiveCurrentBreakdown?.discount === "number" && effectiveCurrentBreakdown.discount > 0 && (
                    <div className="flex justify-between text-[var(--color-resolve)]">
                      <span>Discount</span>
                      <span>-{formatMoney(effectiveCurrentBreakdown.discount, effectiveCurrentBreakdown.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Tax</span>
                    <span>{formatMoney(effectiveCurrentBreakdown?.tax, effectiveCurrentBreakdown?.currency)}</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[var(--color-rim)] flex justify-between">
                    <span className="font-medium text-[var(--color-title)]">Total due today</span>
                    <span className="font-medium text-[var(--color-title)]">{formatMoney(effectiveCurrentBreakdown?.totalAmount, effectiveCurrentBreakdown?.currency)}</span>
                  </div>
                </div>
                {preview?.recurringBreakdown && (
                  <div className="mt-8 pt-8 border-t border-[var(--color-rim)]">
                    <p className="text-sm text-[var(--color-ghost)] mb-2">Recurring</p>
                    <p className="text-sm text-[var(--color-body)]">
                      Renews at <span className="text-[var(--color-title)]">{formatMoney(preview.recurringBreakdown.totalAmount, preview.currency)}</span> per billing cycle.
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-8 border-t border-[var(--color-rim)]">
                <label className="block text-sm text-[var(--color-ghost)] mb-4">Promo code</label>
                <div className="flex items-center gap-4">
                  <input
                    className="bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors w-full placeholder:text-[var(--color-ghost)]"
                    disabled={!canManageBilling}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    value={couponCode}
                    onBlur={refreshPricing}
                    onKeyDown={(e) => e.key === "Enter" && refreshPricing()}
                  />
                  {(couponCode || previewCouponCode) && (
                    <button className="text-sm text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors" onClick={clearCoupon} type="button">Clear</button>
                  )}
                </div>
                {previewDirty && <p className="mt-2 text-xs text-[var(--color-warning)]">Press enter to apply</p>}
              </div>
              {previewError && <p className="text-sm text-[var(--color-danger)]">{previewError}</p>}
              {preview?.taxIdError && <p className="text-sm text-[var(--color-danger)]">{preview.taxIdError}</p>}
            </div>

            {/* Right: Inline checkout form */}
            <div>
              {!checkoutSession ? (
                <div className="h-full flex flex-col justify-center">
                  <button
                    className="group flex w-full items-center justify-between border-b border-[var(--color-rim)] py-6 text-left transition-colors hover:border-[var(--color-signal)]"
                    disabled={!canManageBilling || checkoutLoading || previewLoading}
                    onClick={startCheckout}
                    type="button"
                  >
                    <span className="text-2xl font-light text-[var(--color-title)]">
                      {checkoutLoading ? "Preparing secure checkout..." : "Subscribe now"}
                    </span>
                    {!checkoutLoading && <ArrowRight className="h-6 w-6 text-[var(--color-ghost)] group-hover:text-[var(--color-signal)] transition-colors" />}
                  </button>
                  <p className="mt-6 text-sm text-[var(--color-ghost)] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Secure payment · Cancel anytime
                  </p>
                </div>
              ) : (
                <div className="transition-opacity duration-200">
                  {checkoutHint && !checkoutFrameReady && <p className="text-sm text-[var(--color-ghost)] mb-6">{checkoutHint}</p>}
                  {checkoutError && <div className="mb-6 text-sm text-[var(--color-danger)] border-l-2 border-[var(--color-danger)] pl-4">{checkoutError}</div>}
                  <div className="min-h-[300px]" id={CHECKOUT_ELEMENT_ID} />
                  {sessionStatus && sessionFinalized && (
                    <div className="mt-8 text-sm text-[var(--color-ghost)]">
                      <button className="text-[var(--color-signal)] transition-colors" onClick={startCheckout}>Start new payment session</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Enterprise contact prompt when Enterprise is selected ── */}
      {isEnterprise && (
        <section className="pb-10 border-b border-[var(--color-rim)]">
          <div className="flex flex-col items-center text-center py-8 space-y-4">
            <h2 className="text-xl font-medium text-[var(--color-title)]">Enterprise pricing is custom</h2>
            <p className="text-sm text-[var(--color-subtext)] max-w-md">
              Our team will work with you to build a plan that fits your organization&apos;s scale, compliance, and support requirements.
            </p>
            <Link href="/contact-sales" className="btn btn-primary px-8 py-3">
              Contact our sales team
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Activity & Quotas ── */}
      <section className="pb-10">
        <h2 className="text-xl font-medium text-[var(--color-title)] mb-8">Activity &amp; Quotas</h2>
        <div className="grid gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <h3 className="text-sm tracking-wide text-[var(--color-ghost)] mb-6 uppercase">Lifecycle</h3>
            <div>
              <p className="text-sm text-[var(--color-subtext)] mb-1">Current period</p>
              <p className="text-[var(--color-body)]">{formatDateTime(billing?.currentPeriodStart)} – {formatDateTime(billing?.currentPeriodEnd)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-subtext)] mb-1">Cancellation</p>
              <p className="text-[var(--color-body)]">{isCanceled ? (billing?.canceledAt ? formatDateTime(billing.canceledAt) : "Cancellation scheduled") : "Active"}</p>
              <p className="text-sm text-[var(--color-ghost)] mt-1">{isCanceled ? (billing?.cancelReason === "user_requested" ? "Your plan stays active until the end of the current billing period." : billing?.cancelReason ?? "Cancellation scheduled.") : "No cancellation scheduled."}</p>
            </div>
            {cancelError && <p className="text-sm text-[var(--color-danger)]">{cancelError}</p>}
            {canManageBilling && billing?.status === "ACTIVE" && !isCanceled && (
              <button
                className="text-sm text-[var(--color-danger)] hover:text-[var(--color-danger)] transition-opacity disabled:opacity-50"
                disabled={cancelLoading}
                onClick={cancelSubscription}
                type="button"
              >
                {cancelLoading ? "Cancelling…" : "Cancel subscription"}
              </button>
            )}
            {billing?.lastInvoiceUrl && (
              <a className="text-sm text-[var(--color-signal)] transition-colors inline-flex items-center gap-2" href={billing.lastInvoiceUrl} rel="noreferrer" target="_blank">
                View latest invoice <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <a className="text-sm text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors inline-flex items-center gap-2" href="/billing-policy" rel="noreferrer" target="_blank">
              Refund policy
            </a>
          </div>
          <div className="space-y-8">
            <h3 className="text-sm tracking-wide text-[var(--color-ghost)] mb-6 uppercase">Today&apos;s Usage</h3>
            {[
              { label: "Incidents", used: usage.incidentsCreated, limit: quota.incidentsPerDay },
              { label: "Triage runs", used: usage.triageRuns, limit: quota.triageRunsPerDay },
              { label: "Customer updates", used: usage.customerUpdates, limit: quota.customerUpdatesPerDay },
              { label: "Reminder emails", used: usage.reminderEmailsSent, limit: quota.reminderEmailsPerDay },
            ].map((row) => {
              const pct = percent(row.used, row.limit);
              const barColor = pct >= 90 ? "var(--color-danger)" : pct >= 70 ? "var(--color-warning)" : "var(--color-resolve)";
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[var(--color-body)]">{row.label}</span>
                    <span className="text-[var(--color-ghost)]">{row.used} / {row.limit}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {billing?.paymentFailedAt && (
          <p className="mt-8 text-sm text-[var(--color-danger)]">Payment failure detected at {formatDateTime(billing.paymentFailedAt)}.</p>
        )}
      </section>
    </div>
  );
}
