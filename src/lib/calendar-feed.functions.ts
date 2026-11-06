import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isAllowedCalendarFeedUrl } from "./calendar-feed-url";

async function assertTeam(sb: any, userId: string) {
  const { data: roles } = await sb.from("user_roles").select("is_superadmin").eq("user_id", userId);
  if ((roles ?? []).some((r: any) => r.is_superadmin)) return;
  const { data } = await sb.from("user_company_permissions").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r: any) => ["CONSULTOR", "GESTOR", "SUPERADMIN"].includes(r.role)))
    throw new Error("Disponibilidade disponível apenas para a equipe.");
}

export const getMyCalendarFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("user_calendar_feeds").select("cached_at, last_error, updated_at").eq("user_id", context.userId).maybeSingle();
    return { linked: !!data, lastRead: data?.cached_at ?? null, error: data?.last_error ?? null };
  });

export const saveMyCalendarFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().trim().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isAllowedCalendarFeedUrl(data.url))
      throw new Error("Cole o \"Endereço secreto no formato iCal\" do Google Agenda (começa com https://calendar.google.com/calendar/ical/).");
    const { readBusy, encryptFeed } = await import("./calendar-feed.server");
    const now = Date.now();
    const busy = await readBusy(data.url.trim(), now - 86400_000, now + 90 * 86400_000);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("user_calendar_feeds").upsert({
      user_id: context.userId,
      feed_ciphertext: await encryptFeed(data.url.trim()),
      busy_cache: busy,
      cached_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Não foi possível salvar o link da agenda.");
    return { ok: true, upcoming: busy.filter((b) => b[0] > now).length };
  });

export const removeMyCalendarFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("user_calendar_feeds").delete().eq("user_id", context.userId);
    return { ok: true };
  });

/** Team members available to invite (name, email, agenda linked). */
export const listAgendaTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const [{ data: perms }, { data: sas }] = await Promise.all([
      admin.from("user_company_permissions").select("user_id, role").in("role", ["CONSULTOR", "GESTOR", "SUPERADMIN"]),
      admin.from("user_roles").select("user_id").eq("is_superadmin", true),
    ]);
    const ids = [...new Set([...(perms ?? []), ...(sas ?? [])].map((r: any) => r.user_id))];
    if (!ids.length) return [];
    const [{ data: profiles }, { data: feeds }] = await Promise.all([
      admin.from("profiles").select("user_id, full_name, email, status").in("user_id", ids),
      admin.from("user_calendar_feeds").select("user_id").in("user_id", ids),
    ]);
    const linked = new Set((feeds ?? []).map((f: any) => f.user_id));
    return (profiles ?? [])
      .filter((p: any) => p.status === "active" && p.email)
      .map((p: any) => ({ user_id: p.user_id as string, name: (p.full_name || p.email) as string, email: (p.email as string).toLowerCase(), linked: linked.has(p.user_id) }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  });

/** Free/busy for team members by email within a time window. Only times, never event titles. */
export const checkAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ emails: z.array(z.string().email()).max(60), all_team: z.boolean().default(false), start: z.string(), end: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTeam(context.supabase, context.userId);
    const start = new Date(data.start).getTime();
    const end = data.end ? new Date(data.end).getTime() : start + 3600_000;
    if (!Number.isFinite(start) || !(end > start)) throw new Error("Horário inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const team = await listAgendaTeamInternal(admin);
    const wanted = new Set(data.emails.map((e) => e.toLowerCase()));
    const people = team.filter((t) => data.all_team || wanted.has(t.email));
    const { busyForUsers } = await import("./calendar-feed.server");
    const busyMap = await busyForUsers(admin, people.filter((p) => p.linked).map((p) => p.user_id));
    return people.map((p) => {
      const info = busyMap.get(p.user_id);
      if (!p.linked || !info?.busy) return { name: p.name, email: p.email, status: "unknown" as const, conflicts: [] as string[][] };
      const conflicts = info.busy.filter(([s, e]) => s < end && e > start).map(([s, e]) => [new Date(s).toISOString(), new Date(e).toISOString()]);
      return { name: p.name, email: p.email, status: conflicts.length ? ("busy" as const) : ("free" as const), conflicts, error: info.error };
    });
  });

async function listAgendaTeamInternal(admin: any) {
  const [{ data: perms }, { data: sas }] = await Promise.all([
    admin.from("user_company_permissions").select("user_id").in("role", ["CONSULTOR", "GESTOR", "SUPERADMIN"]),
    admin.from("user_roles").select("user_id").eq("is_superadmin", true),
  ]);
  const ids = [...new Set([...(perms ?? []), ...(sas ?? [])].map((r: any) => r.user_id))];
  if (!ids.length) return [] as { user_id: string; name: string; email: string; linked: boolean }[];
  const [{ data: profiles }, { data: feeds }] = await Promise.all([
    admin.from("profiles").select("user_id, full_name, email, status").in("user_id", ids),
    admin.from("user_calendar_feeds").select("user_id").in("user_id", ids),
  ]);
  const linked = new Set((feeds ?? []).map((f: any) => f.user_id));
  return (profiles ?? [])
    .filter((p: any) => p.status === "active" && p.email)
    .map((p: any) => ({ user_id: p.user_id, name: p.full_name || p.email, email: String(p.email).toLowerCase(), linked: linked.has(p.user_id) }));
}
