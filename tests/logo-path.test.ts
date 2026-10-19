import { describe, expect, it } from "vitest";
import { logoObjectPath } from "../src/lib/logo-path";

describe("report logo destination", () => {
  const origins = ["https://files.example.test"];
  it("preserves private object paths and legacy trusted storage URLs", () => {
    expect(logoObjectPath("company/logo.png", origins)).toBe("company/logo.png");
    expect(logoObjectPath("https://files.example.test/storage/v1/object/sign/portal-logos/company/logo.png?token=example", origins)).toBe("company/logo.png");
  });
  it("blocks internal hosts, arbitrary URLs, redirects and traversal", () => {
    for (const value of ["http://127.0.0.1/private", "http://169.254.169.254/latest/meta-data", "https://evil.test/logo.png", "https://files.example.test/redirect", "https://files.example.test/storage/v1/object/sign/other/a", "//evil.test/a", "../a", "a/../b", "a/%2e%2e/b", "a\\b", "file:///etc/passwd"]) {
      expect(logoObjectPath(value, origins)).toBeNull();
    }
  });
});