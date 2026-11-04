// Browser-side helpers for turning on phone/computer notifications on this device.
export type PushState = "unsupported" | "iframe" | "ios-install" | "denied" | "off" | "on";

const SW_URL = "/push-sw.js";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function keyToBytes(base64url: string) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** What this device can do right now (call from effects or handlers only). */
export async function currentPushState(): Promise<PushState> {
  if (window.top !== window.self) return "iframe";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

type Save = (sub: { endpoint: string; p256dh: string; auth: string; userAgent: string }) => Promise<unknown>;

async function subscribe(getPublicKey: () => Promise<{ publicKey: string }>, save: Save) {
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  const { publicKey } = await getPublicKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(publicKey),
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Assinatura inválida");
  await save({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent.slice(0, 300),
  });
}

/** Must run from a click: browsers only show the permission prompt after a user action. */
export async function enablePush(getPublicKey: () => Promise<{ publicKey: string }>, save: Save): Promise<PushState> {
  const state = await currentPushState();
  if (state === "iframe" || state === "unsupported" || state === "ios-install" || state === "denied") return state;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  await subscribe(getPublicKey, save);
  return "on";
}

/** Keeps the device linked to whoever is signed in, without prompting. */
export async function refreshPushLink(getPublicKey: () => Promise<{ publicKey: string }>, save: Save) {
  if (window.top !== window.self) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  await subscribe(getPublicKey, save);
}

export async function disablePush(remove: (endpoint: string) => Promise<unknown>) {
  const reg = await navigator.serviceWorker?.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await remove(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  }
}
