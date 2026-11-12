import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Check, LoaderCircle, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerNotifications, markCustomerNotificationRead, removeCustomerPushSubscription, saveCustomerPushSubscription, updateCustomerNotificationPreferences } from "@/lib/customer-notifications.functions";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — OFFFEED" }] }),
  component: CustomerNotificationsPage,
});

function toUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function CustomerNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [preferences, setPreferences] = useState({ in_app_enabled: true, sale_email_enabled: false, push_enabled: false });
  const [pushSupported, setPushSupported] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(Boolean(user));
      if (!user) { setNotifications([]); return; }
      const result = await getCustomerNotifications();
      setNotifications(result.notifications ?? []);
      setPreferences(result.preferences ?? { in_app_enabled: true, sale_email_enabled: false, push_enabled: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notifications could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setPushSupported(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    void load();
  }, [load]);

  const savePreferences = async (next: typeof preferences) => {
    setBusy(true);
    try {
      await updateCustomerNotificationPreferences({ data: { inAppEnabled: next.in_app_enabled, saleEmailEnabled: next.sale_email_enabled, pushEnabled: next.push_enabled } });
      setPreferences(next);
      toast.success("Notification preferences saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Preferences could not be saved."); }
    finally { setBusy(false); }
  };

  const enablePush = async () => {
    const publicKey = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_VAPID_PUBLIC_KEY || "BG1gb7aOkjVOYxmLv8xA2akvpAmejgc9Gs-svgJYmHtVlkRhcAoOjPt0THDwf1BNzKDhsANqdVb7Y3fKvxIgqR4";
    if (!publicKey) { toast.error("OFFFEED push notifications are not configured yet."); return; }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Browser notification permission was not granted.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The browser returned an incomplete push subscription.");
      await saveCustomerPushSubscription({ data: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent } });
      setPreferences((current) => ({ ...current, push_enabled: true }));
      toast.success("This device is enabled for OFFFEED sale alerts.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Push notifications could not be enabled."); }
    finally { setBusy(false); }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removeCustomerPushSubscription({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      } else {
        await updateCustomerNotificationPreferences({ data: { inAppEnabled: preferences.in_app_enabled, saleEmailEnabled: preferences.sale_email_enabled, pushEnabled: false } });
      }
      setPreferences((current) => ({ ...current, push_enabled: false }));
      toast.success("Push notifications disabled on this device.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Push notifications could not be disabled."); }
    finally { setBusy(false); }
  };

  const markRead = async (id: string) => {
    try {
      await markCustomerNotificationRead({ data: { notificationId: id } });
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update notification."); }
  };

  const unread = notifications.filter((item) => !item.read_at).length;
  return <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">YOUR OFFFEED</p><h1 className="mt-2 font-display text-4xl">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Sale launches, reminders and last calls — all in one place.</p></div>
      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{unread} unread</span>
    </div>
    {!signedIn && !loading ? <div className="mt-8 rounded-2xl border border-dashed p-8 text-center"><Bell className="mx-auto size-8 text-muted-foreground"/><h2 className="mt-3 font-medium">Sign in to see your notifications</h2><p className="mt-1 text-sm text-muted-foreground">Your OFFFEED sale alerts are linked to your customer account.</p><Button asChild className="mt-4"><Link to="/profile">Sign in / Create account</Link></Button></div> : <>
      <section className="mt-7 rounded-2xl border p-5">
        <h2 className="font-display text-2xl">Notification preferences</h2><p className="mt-1 text-sm text-muted-foreground">Choose how OFFFEED keeps you informed about brand sales.</p>
        <div className="mt-5 divide-y">
          <label className="flex items-center justify-between gap-4 py-4"><span className="flex items-center gap-3"><Bell className="size-5 text-primary"/><span><span className="block text-sm font-medium">In-app notifications</span><span className="text-xs text-muted-foreground">Updates in your OFFFEED notification centre</span></span></span><input type="checkbox" checked={preferences.in_app_enabled} disabled={busy || loading} onChange={(e) => void savePreferences({ ...preferences, in_app_enabled: e.target.checked })} className="size-4 accent-primary"/></label>
          <label className="flex items-center justify-between gap-4 py-4"><span className="flex items-center gap-3"><Mail className="size-5 text-primary"/><span><span className="block text-sm font-medium">Sale emails</span><span className="text-xs text-muted-foreground">Sale launches, reminders and ending-soon emails</span></span></span><input type="checkbox" checked={preferences.sale_email_enabled} disabled={busy || loading} onChange={(e) => void savePreferences({ ...preferences, sale_email_enabled: e.target.checked })} className="size-4 accent-primary"/></label>
          <div className="flex items-center justify-between gap-4 py-4"><span className="flex items-center gap-3"><Smartphone className="size-5 text-primary"/><span><span className="block text-sm font-medium">Browser push notifications</span><span className="text-xs text-muted-foreground">{pushSupported ? "Alerts on this device, even when OFFFEED is closed" : "This browser does not support push notifications"}</span></span></span>{preferences.push_enabled ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void disablePush()}><BellOff className="mr-2 size-4"/>Disable</Button> : <Button size="sm" disabled={busy || loading || !pushSupported} onClick={() => void enablePush()}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin"/> : <Bell className="mr-2 size-4"/>}Enable</Button>}</div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Email sale updates are off until you opt in. You can change these settings at any time.</p>
      </section>
      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="font-display text-2xl">Your updates</h2><Button variant="ghost" size="sm" onClick={() => void load()}>Refresh</Button></div>
        {loading ? <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading notifications…</p> : notifications.length ? <div className="mt-4 divide-y border-y">{notifications.map((item) => <article key={item.id} className="flex gap-3 py-5"><span className={item.read_at ? "mt-1 size-2 shrink-0 rounded-full bg-muted" : "mt-1 size-2 shrink-0 rounded-full bg-primary"}/><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("en-IN")}</p></div>{!item.read_at && <Button size="sm" variant="ghost" onClick={() => void markRead(item.id)}><Check className="size-4"/> <span className="sr-only">Mark as read</span></Button>}</article>)}</div> : <div className="mt-4 rounded-xl border border-dashed p-8 text-center"><Bell className="mx-auto size-7 text-muted-foreground"/><p className="mt-3 font-medium">You're all caught up</p><p className="mt-1 text-sm text-muted-foreground">New sale announcements will appear here.</p></div>}
      </section>
    </>}
  </main>;
}
