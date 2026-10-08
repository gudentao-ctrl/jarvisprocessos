import { describe, expect, it } from "vitest";
import { calculateAssessmentAge } from "../src/lib/assessment-age";

describe("calendar age", () => {
  it("changes only on the birthday", () => {
    expect(calculateAssessmentAge("1990-10-08", new Date("2026-10-07T23:59:59Z"))).toBe(35);
    expect(calculateAssessmentAge("1990-10-08", new Date("2026-10-08T00:00:00Z"))).toBe(36);
    expect(calculateAssessmentAge("1990-10-08", new Date("2026-10-09T00:00:00Z"))).toBe(36);
  });
  it("rejects absent, impossible and future birth dates", () => {
    const today = new Date("2026-10-07T12:00:00Z");
    for (const value of [null, undefined, "", "2026-02-30", "2026-13-01", "2027-01-01"]) {
      expect(calculateAssessmentAge(value, today)).toBeNull();
    }
  });
  it("handles leap birthdays and newborn ages", () => {
    expect(calculateAssessmentAge("2000-02-29", new Date("2026-02-28T12:00:00Z"))).toBe(25);
    expect(calculateAssessmentAge("2000-02-29", new Date("2026-03-01T12:00:00Z"))).toBe(26);
    expect(calculateAssessmentAge("2026-10-07", new Date("2026-10-07T12:00:00Z"))).toBe(0);
  });
});