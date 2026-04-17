"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BillingVerification } from "@/components/billing-verification";
import {
  ExternalLink,
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
  dodoSubscriptionId: string | null;
  dodoProductId: string | null;
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

type Props = {
  annualAvailable: boolean;
  currentInterval: "monthly" | "annual";
  billing: BillingState | null;
  billingNotice: string | null;
  canManageBilling: boolean;
  checkoutMode: "live" | "test";
  planTier: PlanTier;
  quota: Quota;
  usage: Usage;
};


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
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${code}`;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

type BillingInterval = "monthly" | "annual";

const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, enterprise: 2 };

export function BillingPanel({
  annualAvailable,
  currentInterval,
  billing,
  billingNotice,
  canManageBilling,
  planTier,
  quota,
  usage,
}: Props) {
  useCleanUrl(["billing"]);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(planTier);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(currentInterval);
  const [couponCode, setCouponCode] = useState(billing?.discountCode ?? "");
  const [previewCouponCode, setPreviewCouponCode] = useState<string | null>(normalizeCoupon(billing?.discountCode));
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const previewRequestId = useRef(0);
  const previewCouponCodeRef = useRef<string | null>(previewCouponCode);

  const normalizedCouponInput = normalizeCoupon(couponCode);
  const previewDirty = normalizedCouponInput !== previewCouponCode;
  const isEnterprise = selectedPlan === "enterprise";
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [canceledLocally, setCanceledLocally] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [planPrices, setPlanPrices] = useState<Record<string, { subtotal: number; totalAmount: number; currency: string }>>({});
  const [altPlanPrices, setAltPlanPrices] = useState<Record<string, { subtotal: number; totalAmount: number; currency: string }>>({});

  const effectiveCurrentBreakdown = useMemo(() => {
    if (preview) {
      const b = preview.recurringBreakdown ?? preview.currentBreakdown;
      return {
        currency: preview.currency,
        discount: b.discount,
        subtotal: b.subtotal,
        tax: b.tax,
        totalAmount: b.totalAmount,
      };
    }
    return null;
  }, [preview]);

  const loadPreview = useCallback(async (plan: PlanTier, appliedCouponCode: string | null, interval: BillingInterval = "monthly", country?: string, zip?: string) => {
    if (plan === "enterprise") { setPreviewLoading(false); return false; }
    const requestId = ++previewRequestId.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/billing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval, couponCode: appliedCouponCode, billingCountry: country || undefined, billingZip: zip || undefined }),
      });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & BillingPreview) | null;
      if (requestId !== previewRequestId.current) return false;
      setPreviewLoading(false);
      if (!response.ok || !payload) { setPreviewError(payload?.error ?? "Could not load billing preview."); return false; }
      setPreview(payload as BillingPreview);
      setPreviewCouponCode(appliedCouponCode);
      return true;
    } catch (error) {
      if (requestId !== previewRequestId.current) return false;
      setPreviewLoading(false);
      setPreviewError(error instanceof Error ? error.message : "Could not load billing preview.");
      return false;
    }
  }, []);

  useEffect(() => { previewCouponCodeRef.current = previewCouponCode; }, [previewCouponCode]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { void loadPreview(selectedPlan, previewCouponCodeRef.current, billingInterval); }, [loadPreview, selectedPlan, billingInterval]);

  // Fetch prices for all non-enterprise plans when interval changes
  useEffect(() => {
    let cancelled = false;
    async function fetchPricesForInterval(interval: BillingInterval) {
      const plans: PlanTier[] = ["starter", "pro"];
      const results = await Promise.all(plans.map(async (plan) => {
        try {
          const res = await fetch("/api/billing/preview", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ plan, interval }) });
          const data = (await res.json().catch(() => null)) as BillingPreview | null;
          if (data?.currentBreakdown) {
            const b = data.recurringBreakdown ?? data.currentBreakdown;
            return [plan, { subtotal: b.subtotal, totalAmount: b.totalAmount, currency: data.currency }] as const;
          }
        } catch { /* noop */ }
        return null;
      }));
      const map: Record<string, { subtotal: number; totalAmount: number; currency: string }> = {};
      for (const r of results) { if (r) map[r[0]] = r[1]; }
      return map;
    }
    const altInterval = billingInterval === "annual" ? "monthly" : "annual";
    Promise.all([fetchPricesForInterval(billingInterval), fetchPricesForInterval(altInterval)]).then(([current, alt]) => {
      if (cancelled) return;
      setPlanPrices(current);
      setAltPlanPrices(alt);
    });
    return () => { cancelled = true; };
  }, [billingInterval]);

  async function refreshPricing() { await loadPreview(selectedPlan, normalizedCouponInput, billingInterval); }
  async function clearCoupon() { setCouponCode(""); await loadPreview(selectedPlan, null, billingInterval); }

  async function startCheckout() {
    if (!canManageBilling) return;
    if (previewDirty) { setCheckoutError("Refresh the billing summary after editing the coupon code before starting payment."); return; }
    if (!preview && !previewLoading) { setCheckoutError("Load the billing summary before starting payment."); return; }
    setCheckoutLoading(true); setCheckoutError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          interval: billingInterval,
          couponCode: previewCouponCode,
        }),
      });
      setCheckoutLoading(false);
      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string | null; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) { setCheckoutError(payload?.error ?? "Checkout session could not be created."); return; }
      // Redirect to Dodo hosted checkout — skips to payment step since billing details are pre-filled
      window.location.assign(payload.checkoutUrl);
    } catch (error) { setCheckoutLoading(false); setCheckoutError(error instanceof Error ? error.message : "Checkout session could not be created."); }
  }

  const paymentStatusValue = billing?.status ?? "pending";

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  async function cancelSubscription() {
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
      setShowCancelModal(false);
    } catch {
      setCancelError("Failed to cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  }

  const isCanceled = canceledLocally || !!billing?.canceledAt;
  const paymentStatusLabel = formatStatusLabel(paymentStatusValue);
  const isCurrentPlan = selectedPlan === planTier;
  const isDowngradeSelected = !isEnterprise && (PLAN_RANK[selectedPlan] ?? 0) < (PLAN_RANK[planTier] ?? 0);
  const isActiveSubscription = billing?.status === "ACTIVE" && !!billing?.dodoSubscriptionId;
  const isIntervalSwitch = isCurrentPlan && isActiveSubscription && billingInterval !== currentInterval;
  const isUpgrade = !isEnterprise && !isCurrentPlan && !isDowngradeSelected;
  const isActiveUpgrade = isUpgrade && isActiveSubscription;
  const isExactSamePlanAndInterval = isCurrentPlan && billingInterval === currentInterval;

  async function changePlan() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, interval: billingInterval }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setCheckoutError(data?.error ?? "Failed to change plan.");
        return;
      }
      window.location.reload();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Failed to change plan.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function downgradeSubscription() {
    if (!canManageBilling || !isDowngradeSelected) return;
    setDowngradeLoading(true);
    setDowngradeError(null);
    try {
      const res = await fetch("/api/billing/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, interval: billingInterval }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setDowngradeError(data?.error ?? "Failed to downgrade plan.");
        return;
      }
      window.location.reload();
    } catch {
      setDowngradeError("Failed to downgrade plan.");
    } finally {
      setDowngradeLoading(false);
    }
  }
  return (
    <div className="space-y-10">
      {billingNotice && (
        billingNotice === "verifying"
          ? <BillingVerification />
          : <div className="border-l-2 border-[var(--color-signal)] py-4 pl-4 text-sm text-[var(--color-signal)]">{billingNotice}</div>
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

      {/* ── Plan selection ── */}
      <section className="pb-10 border-b border-[var(--color-rim)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-medium text-[var(--color-title)]">Choose your plan</h2>
            <p className="mt-1 text-sm text-[var(--color-subtext)]">Simple pricing that scales with your team.</p>
          </div>
          {annualAvailable && <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] p-1">
            <button
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${billingInterval === "monthly" ? "bg-[var(--color-signal)] text-white" : "text-[var(--color-ghost)] hover:text-[var(--color-body)]"}`}
              onClick={() => setBillingInterval("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${billingInterval === "annual" ? "bg-[var(--color-signal)] text-white" : "text-[var(--color-ghost)] hover:text-[var(--color-body)]"}`}
              onClick={() => setBillingInterval("annual")}
              type="button"
            >
              Annual
              <span className={`ml-1 text-[10px] ${billingInterval === "annual" ? "text-white/70" : "text-[var(--color-signal)]"}`}>-10%</span>
            </button>
          </div>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(["starter", "pro", "enterprise"] as PlanTier[]).map((id) => {
            const plan = planDefinitionFor(id);
            const isSelected = id === selectedPlan;
            const pp = planPrices[id];
            const selectedBreakdown = isSelected ? effectiveCurrentBreakdown : null;
            const price = selectedBreakdown ? selectedBreakdown.totalAmount : pp?.totalAmount;
            const cur = selectedBreakdown ? selectedBreakdown.currency : pp?.currency;
            const displayPrice = price != null && cur ? formatMoney(billingInterval === "annual" ? Math.round(price / 12) : price, cur) : null;
            const isCurrent = id === planTier;
            const isDowngrade = (PLAN_RANK[id] ?? 0) < (PLAN_RANK[planTier] ?? 0);
            const isUpgrade = !isCurrent && !isDowngrade && id !== "enterprise";

            return (
              <button
                key={id}
                type="button"
                onClick={() => { setSelectedPlan(id); setShowDowngradeConfirm(false); }}
                className={`relative text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? "border-[var(--color-signal)] bg-[var(--color-raised)] shadow-[0_0_0_1px_var(--color-signal)]"
                    : "border-[var(--color-rim)] bg-[var(--color-surface)] hover:border-[var(--color-ghost)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-semibold text-[var(--color-title)]">{plan.label}</span>
                  {isCurrent && <span className="text-[10px] tracking-wider text-[var(--color-signal)] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--color-signal)]/10">Current</span>}
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-[var(--color-title)]">{id === "enterprise" ? "Custom" : displayPrice ? <>{displayPrice}<span className="text-xs font-normal text-[var(--color-ghost)]">/mo +tax</span></> : "—"}</span>
                  {id !== "enterprise" && billingInterval === "annual" && altPlanPrices[id] && (
                    <span className="text-xs line-through text-[var(--color-ghost)] ml-1">{formatMoney(altPlanPrices[id].totalAmount, altPlanPrices[id].currency)}</span>
                  )}
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.bullets.slice(0, 3).map((b) => (
                    <li key={b} className="flex items-center gap-1.5 text-xs text-[var(--color-subtext)]">
                      <Check className="h-3 w-3 text-[var(--color-signal)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-[var(--color-rim)]">
                  {id === "enterprise" ? (
                    <Link
                      href="/contact-sales"
                      target="_blank"
                      className="block text-center text-xs font-medium text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Contact sales
                    </Link>
                  ) : isCurrent ? (
                    <span className="block text-center text-xs font-medium text-[var(--color-signal)]">Current plan</span>
                  ) : isDowngrade ? (
                    <span className={`block text-center text-xs font-medium ${isSelected ? "text-[var(--color-warning)]" : "text-[var(--color-ghost)]"}`}>
                      {isSelected ? "Downgrade" : "Downgrade"}
                    </span>
                  ) : isUpgrade ? (
                    <span className={`block text-center text-xs font-medium ${isSelected ? "text-[var(--color-signal)]" : "text-[var(--color-ghost)]"}`}>
                      {isSelected ? "Selected" : "Upgrade"}
                    </span>
                  ) : (
                    <span className={`block text-center text-xs font-medium ${isSelected ? "text-[var(--color-signal)]" : "text-[var(--color-ghost)]"}`}>
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
            <h2 className="text-xl font-medium text-[var(--color-title)]">{isDowngradeSelected ? "Downgrade" : "Checkout"}</h2>
            {previewLoading && (
              <span className="flex items-center gap-2 text-sm text-[var(--color-ghost)]">
                <span className="h-3 w-3 rounded-full bg-[var(--color-rim)] animate-pulse" /> Updating
              </span>
            )}
          </div>

          <div className={`mt-8 max-w-xl mx-auto transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}>
            {isDowngradeSelected ? (
              <div>
                <p className="text-sm text-[var(--color-subtext)] mb-4">
                  You are downgrading from <span className="text-[var(--color-title)]">{planDefinitionFor(planTier).label}</span> to <span className="text-[var(--color-title)]">{planDefinitionFor(selectedPlan).label}</span>. Your quotas will be reduced immediately.
                </p>
                {downgradeError && <p className="text-sm text-[var(--color-danger)] mb-4">{downgradeError}</p>}
                {!showDowngradeConfirm ? (
                  <button
                    className="group flex w-full items-center justify-between border-b border-[var(--color-rim)] py-6 text-left transition-colors hover:border-[var(--color-warning)] cursor-pointer"
                    disabled={!canManageBilling}
                    onClick={() => setShowDowngradeConfirm(true)}
                    type="button"
                  >
                    <span className="text-2xl font-light text-[var(--color-title)]">Confirm downgrade</span>
                    <ArrowRight className="h-6 w-6 text-[var(--color-ghost)] group-hover:text-[var(--color-warning)] transition-colors" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      className="rounded-lg border border-[var(--color-rim)] px-4 py-2.5 text-sm text-[var(--color-body)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer"
                      disabled={downgradeLoading}
                      onClick={() => setShowDowngradeConfirm(false)}
                      type="button"
                    >
                      Keep subscription
                    </button>
                    <button
                      className="rounded-lg bg-[var(--color-warning)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      disabled={!canManageBilling || downgradeLoading}
                      onClick={downgradeSubscription}
                      type="button"
                    >
                      {downgradeLoading ? "Processing downgrade..." : "Confirm"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Order summary */}
                <div className="rounded-lg border border-[var(--color-rim)] bg-[var(--color-surface)] p-6 space-y-4 text-sm text-[var(--color-body)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Plan</span>
                    <span>{planDefinitionFor(selectedPlan).label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Billing</span>
                    <span>{billingInterval === "annual" ? "Annual" : "Monthly"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Subtotal</span>
                    <span>{isExactSamePlanAndInterval ? formatMoney(0, "USD") : formatMoney(effectiveCurrentBreakdown?.subtotal, effectiveCurrentBreakdown?.currency)}</span>
                  </div>
                  {typeof effectiveCurrentBreakdown?.discount === "number" && effectiveCurrentBreakdown.discount > 0 && (
                    <div className="flex justify-between text-[var(--color-resolve)]">
                      <span>Discount</span>
                      <span>-{formatMoney(effectiveCurrentBreakdown.discount, effectiveCurrentBreakdown.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ghost)]">Tax</span>
                    <span>{typeof effectiveCurrentBreakdown?.tax === "number" ? formatMoney(effectiveCurrentBreakdown.tax, effectiveCurrentBreakdown.currency) : <span className="text-[var(--color-ghost)] italic">Calculated at checkout</span>}</span>
                  </div>
                  <div className="pt-4 mt-2 border-t border-[var(--color-rim)] flex justify-between">
                    <span className="font-medium text-[var(--color-title)]">{isIntervalSwitch || isActiveUpgrade ? "New recurring price" : "Total due today"}</span>
                    <span className="font-medium text-[var(--color-title)]">{isExactSamePlanAndInterval ? formatMoney(0, "USD") : formatMoney(effectiveCurrentBreakdown?.totalAmount, effectiveCurrentBreakdown?.currency)}</span>
                  </div>
                  {preview?.recurringBreakdown && (
                    <p className="pt-3 text-xs text-[var(--color-ghost)]">
                      Renews at {formatMoney(preview.recurringBreakdown.totalAmount, preview.currency)} per billing cycle
                    </p>
                  )}
                </div>

                {/* Promo code */}
                <div>
                  <label className="block text-sm text-[var(--color-ghost)] mb-2">Promo code</label>
                  <div className="flex items-center gap-3">
                    <input
                      className="flex-1 rounded-lg border border-[var(--color-rim)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-title)] placeholder:text-[var(--color-ghost)] focus:outline-none focus:border-[var(--color-signal)] transition-colors"
                      disabled={!canManageBilling}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      value={couponCode}
                      onKeyDown={(e) => e.key === "Enter" && refreshPricing()}
                    />
                    <button className="rounded-lg border border-[var(--color-rim)] px-4 py-2.5 text-sm text-[var(--color-body)] hover:border-[var(--color-signal)] transition-colors" onClick={refreshPricing} type="button">Apply</button>
                    {(couponCode || previewCouponCode) && (
                      <button className="text-sm text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors" onClick={clearCoupon} type="button">Clear</button>
                    )}
                  </div>
                  {previewDirty && <p className="mt-2 text-xs text-[var(--color-warning)]">Press enter or click Apply</p>}
                </div>

                {previewError && <p className="text-sm text-[var(--color-danger)]">{previewError}</p>}
                {preview?.taxIdError && <p className="text-sm text-[var(--color-danger)]">{preview.taxIdError}</p>}
                {checkoutError && <div className="text-sm text-[var(--color-danger)] border-l-2 border-[var(--color-danger)] pl-4">{checkoutError}</div>}

                {/* CTA */}
                <button
                  className="w-full rounded-lg bg-[var(--color-signal)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-signal-hover)] disabled:opacity-50"
                  disabled={!canManageBilling || checkoutLoading || previewLoading || isExactSamePlanAndInterval}
                  onClick={isActiveSubscription ? changePlan : startCheckout}
                  type="button"
                >
                  {isExactSamePlanAndInterval
                    ? "Current plan"
                    : isIntervalSwitch
                      ? (checkoutLoading ? "Switching..." : `Switch to ${billingInterval} billing`)
                      : isActiveUpgrade
                        ? (checkoutLoading ? "Upgrading..." : `Upgrade to ${planDefinitionFor(selectedPlan).label}`)
                        : checkoutLoading ? "Preparing secure checkout..." : "Continue to payment"}
                </button>
                {(isIntervalSwitch || isActiveUpgrade) && (
                  <p className="text-xs text-[var(--color-ghost)] text-center">
                    No extra charge now. Changes take effect at the next billing cycle.
                  </p>
                )}
                <p className="text-xs text-[var(--color-ghost)] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure payment · Cancel anytime
                </p>
              </div>
            )}
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
            <Link href="/contact-sales" target="_blank" className="btn btn-primary px-8 py-3">
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
              <p className="text-[var(--color-body)]">{formatDate(billing?.currentPeriodStart)} – {formatDate(billing?.currentPeriodEnd)}</p>
            </div>
            {isCanceled && (
            <div>
              <p className="text-sm text-[var(--color-subtext)] mb-1">Cancellation</p>
              <p className="text-[var(--color-body)]">{billing?.canceledAt ? formatDate(billing.canceledAt) : "Cancellation scheduled"}</p>
              <p className="text-sm text-[var(--color-ghost)] mt-1">{billing?.cancelReason === "user_requested" ? "Your plan stays active until the end of the current billing period." : billing?.cancelReason ?? "Cancellation scheduled."}</p>
            </div>
            )}
            {cancelError && <p className="text-sm text-[var(--color-danger)]">{cancelError}</p>}
            <div className="flex flex-col items-start gap-3 pt-2">
              {billing?.lastInvoiceUrl && (
                <a className="text-sm text-[var(--color-signal)] transition-colors inline-flex items-center gap-2" href={billing.lastInvoiceUrl} rel="noreferrer" target="_blank">
                  View latest invoice <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <a className="text-sm text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors inline-flex items-center gap-2" href="/billing-policy" rel="noreferrer" target="_blank">
                Refund policy
              </a>
              {canManageBilling && billing?.status === "ACTIVE" && !isCanceled && (
                <button
                  className="text-sm text-[var(--color-danger)] hover:text-[var(--color-danger)] transition-opacity disabled:opacity-50 cursor-pointer"
                  disabled={cancelLoading}
                  onClick={() => setShowCancelModal(true)}
                  type="button"
                >
                  {cancelLoading ? "Cancelling…" : "Cancel subscription"}
                </button>
              )}
            </div>
            {showCancelModal && (
              <div className="rounded-xl border border-[var(--color-rim)] bg-[var(--color-surface)] p-6 shadow-lg">
                <h3 className="text-lg font-medium text-[var(--color-title)]">Cancel subscription</h3>
                <p className="mt-3 text-sm text-[var(--color-subtext)]">
                  Are you sure you want to cancel? Your plan will remain active until the end of the current billing period. You won&apos;t be charged again.
                </p>
                {cancelError && <p className="mt-3 text-sm text-[var(--color-danger)]">{cancelError}</p>}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    className="rounded-lg border border-[var(--color-rim)] px-4 py-2 text-sm text-[var(--color-body)] hover:bg-[var(--color-raised)] transition-colors cursor-pointer"
                    disabled={cancelLoading}
                    onClick={() => setShowCancelModal(false)}
                    type="button"
                  >
                    Keep subscription
                  </button>
                  <button
                    className="rounded-lg bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    disabled={cancelLoading}
                    onClick={cancelSubscription}
                    type="button"
                  >
                    {cancelLoading ? "Cancelling…" : "Confirm cancellation"}
                  </button>
                </div>
              </div>
            )}
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

      {/* Cancel subscription modal */}
    </div>
  );
}
