// Jarvis Home Assist — Service Worker for Web Push notifications

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Jarvis", message: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Jarvis Home Assist", {
      body: data.message || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.id ? `notif-${data.id}` : undefined,
      data: { url: data.action_url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
