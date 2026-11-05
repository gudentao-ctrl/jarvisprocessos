import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_MS, isSessionExpired, signInTimeFromToken } from "../src/lib/session-expiry";

function tokenWith(payload: unknown) {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.sig`;
}

describe("24-hour sign-in limit", () => {
  it("lasts exactly 24 hours", () => {
    expect(SESSION_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
  it("keeps a session signed in 23h59 ago and ends one signed in 24h ago", () => {
    const now = Date.UTC(2026, 10, 4, 21, 0, 0);
    expect(isSessionExpired(now - (24 * 60 - 1) * 60_000, now)).toBe(false);
    expect(isSessionExpired(now - 24 * 60 * 60_000, now)).toBe(true);
  });
  it("reads the original sign-in time from the token, not its renewal time", () => {
    const signedIn = 1_790_000_000;
    const token = tokenWith({ iat: signedIn + 50_000, amr: [{ method: "password", timestamp: signedIn }] });
    expect(signInTimeFromToken(token)).toBe(signedIn * 1000);
  });
  it("does not sign out when the sign-in time is unknown", () => {
    expect(signInTimeFromToken(tokenWith({ iat: 1 }))).toBeNull();
    expect(isSessionExpired(null, Date.now())).toBe(false);
  });
});
