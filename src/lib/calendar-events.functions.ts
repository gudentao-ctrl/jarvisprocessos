import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EventInput = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  event_type: z.enum(["reuniao", "workshop", "visita", "entrega", "outro"]).default("reuniao"),
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  location: z.string().max(300).optional().default(""),
  participants: z.array(z.string()).optional().default([]),
});

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      company_id: z.string().uuid().nullable().optional(),
      project_id: z.string().uuid().nullable().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("calendar_events")
      .select("*, companies(name), projects(name)")
      .order("starts_at", { ascending: true });
    if (data.company_id) q = q.eq("company_id", data.company_id);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("calendar_events").update(rest).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("calendar_events")
      .insert({ ...data, created_by: context.userId })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calendar_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
