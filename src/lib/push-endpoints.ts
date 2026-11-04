/** Push deliveries go only to the browsers' own push services, never arbitrary URLs. */
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return PUSH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith("." + suffix));
  } catch {
    return false;
  }
}
