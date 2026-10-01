// src/lib/reload-timestamp.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getReloadTimestamp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const database = context.supabase as any;
    const { data, error } = await database
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
