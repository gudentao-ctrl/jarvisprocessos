/** Signed-in sessions must ask for the password again this long after the password was typed. */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            Array.from(atob(padded), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
          )
        : Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * When the user actually signed in (ms). Token refreshes keep the original sign-in time in the
 * `amr` claim, so this does not move while the app silently renews the session.
 */
export function signInTimeFromToken(accessToken: string | null | undefined): number | null {
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return null;
  const stamps = amr
    .map((entry) => Number((entry as { timestamp?: unknown })?.timestamp))
    .filter((t) => Number.isFinite(t) && t > 0);
  if (stamps.length === 0) return null;
  return Math.max(...stamps) * 1000;
}

export function isSessionExpired(signInTimeMs: number | null, nowMs: number, maxAgeMs = SESSION_MAX_AGE_MS) {
  if (signInTimeMs == null) return false;
  return nowMs - signInTimeMs >= maxAgeMs;
}
