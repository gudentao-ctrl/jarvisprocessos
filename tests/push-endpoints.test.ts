import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "../src/lib/push-endpoints";

describe("push delivery destinations", () => {
  it("accepts the Chrome/Android, Firefox, Windows and Apple push services", () => {
    for (const url of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-by3p.notify.windows.com/w/?token=abc",
      "https://web.push.apple.com/QGx",
    ]) {
      expect(isAllowedPushEndpoint(url)).toBe(true);
    }
  });
  it("rejects any other address", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.test/x",
      "https://evil.test/fcm.googleapis.com",
      "https://user:pw@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://169.254.169.254/latest",
      "not a url",
    ]) {
      expect(isAllowedPushEndpoint(url)).toBe(false);
    }
  });
});
