import { supabase } from "@/integrations/supabase/client";
import { getActiveMember } from "@/lib/device";

export const VAPID_PUBLIC_KEY =
  "BLa3jzZTthsvyp-o3hv3_XBD3Nf6yCCGNUP7FuXic5l9Uq8_GvHKZltwW5n6Kdsj6QJybU8FuNHqXrfnluOUnKk";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.warn("[push] SW registration failed", e);
    return null;
  }
}

export type PushStatus =
  | "unsupported"
  | "ios-needs-pwa"
  | "denied"
  | "default"
  | "granted-unsubscribed"
  | "subscribed";

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) {
    if (isIos() && !isStandalone()) return "ios-needs-pwa";
    return "unsupported";
  }
  if (isIos() && !isStandalone()) return "ios-needs-pwa";
  const perm = Notification.permission;
  if (perm === "denied") return "denied";
  if (perm === "default") return "default";
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "granted-unsubscribed";
}

export async function subscribeToPush(): Promise<boolean> {
  const m = getActiveMember();
  if (!m) return false;
  if (!isPushSupported()) return false;
  if (isIos() && !isStandalone()) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg =
    (await navigator.serviceWorker.getRegistration("/push-sw.js")) ??
    (await registerPushServiceWorker());
  if (!reg) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (e) {
      console.warn("[push] subscribe failed", e);
      return false;
    }
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) return false;

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        member_id: m.memberId,
        group_id: m.groupId,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.warn("[push] save subscription failed", error);
    return false;
  }
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try {
      await sub.unsubscribe();
    } catch {}
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}