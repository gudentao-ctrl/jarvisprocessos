// src/lib/reload-timestamp.functions.ts
import { createServerFn } from "@supabase/auth-helpers-nextjs";
import { requireSupabaseAuth } from "@/lib/supabase-middleware";

export const getReloadTimestamp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("value")
      .eq("key", "ui_reload_timestamp")
      .single();
    if (error) {
      console.error("Failed to fetch reload timestamp", error);
      return { timestamp: null };
    }
    return { timestamp: data?.value ?? null };
  });
