import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertPermission } from "./permissions.functions";

const EventInput = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  event_type: z
    .enum(["reuniao", "alinhamento", "workshop", "visita", "entrega", "outro"])
    .default("reuniao"),
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  location: z.string().max(300).optional().default(""),
  participants: z.array(z.string()).optional().default([]),
  is_internal_invite: z.boolean().optional().default(false),
  guest_emails: z.array(z.string().email()).optional().default([]),
  sync_google: z.boolean().optional().default(false),
});

export const listCalendarLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { data, error } = await sb
      .from("calendar_locations")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      // Table may not exist yet (migration pending)
      console.warn("[calendar_locations] table not found, returning defaults");
      return [
        { id: "maia", name: "Maia" },
        { id: "po-londrina", name: "PO Londrina" },
        { id: "iluminacao", name: "Iluminação" },
        { id: "prefeitura", name: "Prefeitura" },
      ];
    }
    return data ?? [];
  });

export const createCalendarLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: row, error } = await sb
      .from("calendar_locations")
      .insert({ name: data.name, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid().nullable().optional(),
        project_id: z.string().uuid().nullable().optional(),
        view: z.enum(["all", "company"]).optional().default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // Always load events for this user OR internal invites from managers/superadmins
    let q = sb
      .from("calendar_events")
      .select("*, companies(name), projects(name)")
      .order("starts_at", { ascending: true });

    // Filter by company only when view is "company" and company_id provided
    if (data.view === "company" && data.company_id) {
      q = q.eq("company_id", data.company_id);
    } else if (data.company_id && data.view !== "all") {
      q = q.eq("company_id", data.company_id);
    }
    if (data.project_id) q = q.eq("project_id", data.project_id);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const creatorIds = [...new Set((rows ?? []).map((row: any) => row.created_by).filter(Boolean))];
    if (creatorIds.length === 0) return rows ?? [];

    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      sb.from("profiles").select("user_id, is_superadmin").in("user_id", creatorIds),
      sb
        .from("company_members")
        .select("user_id, company_id, member_role")
        .in("user_id", creatorIds),
    ]);

    const superadmins = new Set(
      (profiles ?? []).filter((p: any) => p.is_superadmin).map((p: any) => p.user_id),
    );

    return (rows ?? []).map((row: any) => ({
      ...row,
      is_manager_alignment:
        (row.event_type === "alinhamento" || row.is_internal_invite) &&
        (superadmins.has(row.created_by) ||
          (memberships ?? []).some(
            (m: any) =>
              m.user_id === row.created_by &&
              m.member_role === "gestor" &&
              m.company_id === row.company_id,
          )),
    }));
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { id, sync_google, ...payload } = data;
    await assertPermission(sb, data.company_id || null, "agenda", id ? "update" : "create");
    if (id) {
      const { data: existing, error } = await sb.from("calendar_events").select("company_id").eq("id", id).single();
      if (error || !existing) throw new Error("Evento não encontrado ou sem acesso.");
      await assertPermission(sb, existing.company_id || null, "agenda", "update");
    }

    let row: any;
    if (id) {
      const { data: updated, error } = await sb
        .from("calendar_events")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: inserted, error } = await sb
        .from("calendar_events")
        .insert({ ...payload, created_by: context.userId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }

    if (sync_google) {
      const { syncStoredGoogleEvent } = await import("./google-calendar.server");
      const result = await syncStoredGoogleEvent(sb, context.userId, row.id);
      if (result.ok && result.google_event_id) row.google_event_id = result.google_event_id;
      else row.google_sync_error = result.reason;
    }

    return row;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: event, error: readError } = await context.supabase.from("calendar_events").select("company_id").eq("id", data.id).single();
    if (readError || !event) throw new Error("Evento não encontrado ou sem acesso.");
    await assertPermission(context.supabase, event.company_id || null, "agenda", "delete");
    const { error } = await context.supabase.from("calendar_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
