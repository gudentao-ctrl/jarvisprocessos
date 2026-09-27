// src/lib/set-reload-timestamp.functions.ts
import { createServerFn } from "@supabase/auth-helpers-nextjs";
import { requireSupabaseAuth } from "@/lib/supabase-middleware";

/**
 * Atualiza o registro `ui_reload_timestamp` em `system_settings` com a data/hora atual.
 * Essa chamada pode ser usada após um deploy ou qualquer alteração que
 * precise forçar o recarregamento da UI do Jarvis.
 */
export const setReloadTimestamp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("system_settings")
      .upsert({ key: "ui_reload_timestamp", value: now }, { onConflict: "key" });
    if (error) {
      console.error("Failed to update ui_reload_timestamp", error);
      return { success: false, error: error.message };
    }
    return { success: true, timestamp: now };
  });
