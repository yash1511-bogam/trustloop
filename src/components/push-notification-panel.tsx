"use client";

import { useEffect, useState } from "react";

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
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : String(testError));
    } finally {
      setLoading(false);
    }
  }

  const browserSupport =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Configure browser push notifications for reminder escalations and operational alerts.
      </p>

      <div className="panel-card p-4 text-sm text-neutral-400">
        <p>
          Push configured server-side: <strong>{status?.configured ? "Yes" : "No"}</strong>
        </p>
        <p>
          Browser support: <strong>{browserSupport ? "Yes" : "No"}</strong>
        </p>
        <p>
          Active subscriptions for your account: <strong>{status?.activeSubscriptions ?? 0}</strong>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={loading || !browserSupport} onClick={enablePush} type="button">
          {loading ? "Working..." : "Enable push notifications"}
        </button>
        <button className="btn btn-ghost" disabled={loading || !browserSupport} onClick={disablePush} type="button">
          Disable push notifications
        </button>
        <button className="btn btn-ghost" disabled={loading || !browserSupport} onClick={sendTestPush} type="button">
          Send test notification
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
