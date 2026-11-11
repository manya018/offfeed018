self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: "OFFFEED", body: event.data?.text() ?? "A new update is waiting." }; }
  event.waitUntil(self.registration.showNotification(payload.title || "OFFFEED", {
    body: payload.body || "Discover something new on OFFFEED.", icon: "/favicon.ico", badge: "/favicon.ico",
    tag: payload.tag || "offfeed-update", data: { url: payload.url || "/" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
