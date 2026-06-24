import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listIndicatorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("v_indicator_status").select("*").order("name");
    if (data.project_id) q = q.eq("project_id", data.project_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ indicator_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("indicator_collections")
      .select("*")
      .eq("indicator_id", data.indicator_id)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateIndicatorPublicSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      target: z.number().nullable().optional(),
      critical_min: z.number().nullable().optional(),
      critical_max: z.number().nullable().optional(),
      direction: z.enum(["higher_better", "lower_better"]).optional(),
      frequency: z.string().optional(),
      unit: z.string().optional(),
      responsible_name: z.string().optional(),
      responsible_email: z.string().optional(),
      instructions: z.string().optional(),
      description: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("indicators").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const regenerateIndicatorToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // generate URL-safe random token client-side here (server runtime)
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const b64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const { data: row, error } = await context.supabase
      .from("indicators").update({ public_token: b64 }).eq("id", data.id).select("id, public_token").single();
    if (error) throw new Error(error.message);
    return row;
  });
