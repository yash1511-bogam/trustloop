"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Bell, BellOff, Send } from "@/components/icon-compat";

type PushStatusPayload = {
  configured: boolean;
  vapidPublicKey: string | null;
  activeSubscriptions: number;
};

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer.slice(
    outputArray.byteOffset,
    outputArray.byteOffset + outputArray.byteLength,
  );
}

export function PushNotificationPanel() {
  const [status, setStatus] = useState<PushStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    const response = await fetch("/api/notifications/push", {
      method: "GET",
    });

    if (!response.ok) {
      setStatus(null);
      return;
    }

    const payload = (await response.json()) as PushStatusPayload;
    setStatus(payload);
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function enablePush() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("This browser does not support push notifications.");
        return;
      }

      if (!status?.configured || !status.vapidPublicKey) {
        setError("Push notifications are not configured by the workspace admin.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(status.vapidPublicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      if (
        !subscriptionJson.endpoint ||
        !subscriptionJson.keys?.p256dh ||
        !subscriptionJson.keys?.auth
      ) {
        setError("Browser returned an invalid push subscription.");
        return;
      }

      const saveResponse = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subscriptionJson.endpoint,
            keys: {
              p256dh: subscriptionJson.keys.p256dh,
              auth: subscriptionJson.keys.auth,
            },
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveResponse.ok) {
        const payload = (await saveResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Failed to save push subscription.");
        return;
      }

      setMessage("Push notifications enabled for this browser.");
      await refreshStatus();
      setTimeout(() => setMessage(null), 3000);
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : String(enableError));
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!("serviceWorker" in navigator)) {
        setError("Service workers are not available in this browser.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setMessage("No active push subscription found for this browser.");
        return;
      }

      await fetch("/api/notifications/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      await subscription.unsubscribe();

      setMessage("Push notifications disabled for this browser.");
      await refreshStatus();
      setTimeout(() => setMessage(null), 3000);
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : String(disableError));
    } finally {
      setLoading(false);
    }
  }

  async function sendTestPush() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/notifications/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Failed to send test notification.");
        return;
      }

      const payload = (await response.json()) as {
        sent: number;
        failed: number;
        disabled: number;
      };
      setMessage(
        `Test push sent: ${payload.sent} delivered, ${payload.failed} failed, ${payload.disabled} disabled.`,
      );
      setTimeout(() => setMessage(null), 5000);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : String(testError));
    } finally {
      setLoading(false);
    }
  }

  const [browserSupport, setBrowserSupport] = useState(false);

  useEffect(() => {
    setBrowserSupport("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
            Configure browser push notifications for reminder escalations and operational alerts. 
            This allows TrustLoop to reach you even when the dashboard isn&apos;t active.
          </p>

          <div className="flex flex-col gap-4">
            <button 
              className="btn btn-primary w-full sm:w-fit" 
              disabled={loading || !browserSupport} 
              onClick={enablePush} 
              type="button"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Enable for this browser
            </button>
            <div className="flex flex-wrap gap-2">
              <button 
                className="btn btn-ghost text-xs !min-h-[32px]" 
                disabled={loading || !browserSupport} 
                onClick={disablePush} 
                type="button"
              >
                <BellOff className="w-3 h-3" /> Disable
              </button>
              <button 
                className="btn btn-ghost text-xs !min-h-[32px]" 
                disabled={loading || !browserSupport} 
                onClick={sendTestPush} 
                type="button"
              >
                <Send className="w-3 h-3" /> Test notification
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 pt-4 border-t border-[var(--color-rim)] md:border-t-0 md:border-l md:pl-12">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Server support</p>
            <p className={`text-sm font-medium ${status?.configured ? "text-[var(--color-resolve)]" : "text-[var(--color-warning)]"}`}>
              {status?.configured ? "Configured" : "Not configured"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Browser support</p>
            <p className={`text-sm font-medium ${browserSupport ? "text-[var(--color-resolve)]" : "text-[var(--color-danger)]"}`}>
              {browserSupport ? "Available" : "Not supported"}
            </p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Active subscriptions</p>
            <p className="text-2xl font-light text-[var(--color-title)]">{status?.activeSubscriptions ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
