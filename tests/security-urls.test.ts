import { describe, expect, it } from "vitest";
import { isAllowedRecoveryUrl, isAllowedGoogleCallbackUrl } from "../src/lib/security-urls";

describe("password recovery destination", () => {
  it("accepts only the app's recovery pages", () => {
    expect(isAllowedRecoveryUrl("https://jarvisprocessos.lovable.app/auth")).toBe(true);
    expect(isAllowedRecoveryUrl("http://localhost:8080/auth")).toBe(true);
  });
  it("rejects unrelated shared-host apps and unsafe variations", () => {
    for (const url of ["https://attacker.lovable.app/auth", "https://jarvisprocessos.lovable.app.evil.test/auth", "http://jarvisprocessos.lovable.app/auth", "https://jarvisprocessos.lovable.app/auth?redirect=https://evil.test", "https://user:pass@jarvisprocessos.lovable.app/auth", "http://localhost:9999/auth"]) {
      expect(isAllowedRecoveryUrl(url)).toBe(false);
    }
  });
});
describe("Google callback destination", () => {
  it("accepts the exact application callback", () => {
    expect(isAllowedGoogleCallbackUrl("https://jarvisprocessos.lovable.app/google-callback")).toBe(true);
    expect(isAllowedGoogleCallbackUrl("http://localhost:8080/google-callback")).toBe(true);
  });
  it("rejects other tenants, paths and embedded redirects", () => {
    expect(isAllowedGoogleCallbackUrl("https://attacker.lovable.app/google-callback")).toBe(false);
    expect(isAllowedGoogleCallbackUrl("https://jarvisprocessos.lovable.app/auth")).toBe(false);
    expect(isAllowedGoogleCallbackUrl("https://jarvisprocessos.lovable.app/google-callback?next=https://evil.test")).toBe(false);
  });
});
