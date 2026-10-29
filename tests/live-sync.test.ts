import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { liveSyncTopics } from "@/lib/live-sync";

describe("liveSyncTopics", () => {
  it("always listens to the shared app doorbell and puts the active company first", () => {
    expect(liveSyncTopics(["a", "b", "c"], "b")).toEqual([
      "app-bell",
      "company-bell:b",
      "company-bell:a",
      "company-bell:c",
    ]);
  });

  it("caps company doorbells at 30 so phones keep few connections", () => {
    const ids = Array.from({ length: 40 }, (_, i) => `c${i}`);
    expect(liveSyncTopics(ids, null)).toHaveLength(31);
  });
});
