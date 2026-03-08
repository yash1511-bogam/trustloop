self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network requests are handled by the browser; push is handled below.
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "TrustLoop",
      body: event.data.text(),
    };
  }

  const title = payload.title || "TrustLoop";
  const body = payload.body || "You have a new incident operations alert.";
  const url = payload.url || "/dashboard";
  const tag = payload.tag || "trustloop-notification";
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: {
        ...data,
        url,
      },
      icon: "/next.svg",
      badge: "/next.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
