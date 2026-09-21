import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildGoogleCalendarUrl } from "./google-calendar.functions";

const EventInput = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  event_type: z.enum(["reuniao", "alinhamento", "workshop", "visita", "entrega", "outro"]).default("reuniao"),
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
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(100) }).parse(d),
  )
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
    z.object({
      company_id: z.string().uuid().nullable().optional(),
      project_id: z.string().uuid().nullable().optional(),
      view: z.enum(["all", "company"]).optional().default("all"),
    }).parse(d ?? {}),
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
      sb.from("company_members").select("user_id, company_id, member_role").in("user_id", creatorIds),
    ]);

    const superadmins = new Set(
      (profiles ?? []).filter((p: any) => p.is_superadmin).map((p: any) => p.user_id),
    );

    return (rows ?? []).map((row: any) => {
      let guestEmails: string[] = Array.isArray(row.guest_emails) ? row.guest_emails : [];
      if (guestEmails.length === 0 && row.description?.includes("[Convidados:")) {
        const match = row.description.match(/\[Convidados:\s*([^\]]+)\]/);
        if (match && match[1]) {
          guestEmails = match[1].split(",").map((e: string) => e.trim()).filter(Boolean);
        }
      }

      const googleCalendarUrl = buildGoogleCalendarUrl({
        title: row.title,
        description: row.description,
        location: row.location,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        guestEmails,
      });

      return {
        ...row,
        guest_emails: guestEmails,
        googleCalendarUrl,
        is_manager_alignment:
          (row.event_type === "alinhamento" || row.is_internal_invite) &&
          (superadmins.has(row.created_by) ||
            (memberships ?? []).some(
              (m: any) =>
                m.user_id === row.created_by &&
                m.member_role === "gestor" &&
                m.company_id === row.company_id,
            )),
      };
    });
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { id, sync_google, ...payload } = data;

    const tryDb = async (p: any) => {
      if (id) {
        return await sb.from("calendar_events").update(p).eq("id", id).select().maybeSingle();
      }
      return await sb.from("calendar_events").insert({ ...p, created_by: context.userId }).select().single();
    };

    let { data: savedRow, error } = await tryDb(payload);

    // Fallback caso colunas novas (guest_emails, is_internal_invite, google_event_id)
    // não existam ainda ou o cache do schema do Supabase não as reconheça
    if (error && (error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("schema cache") || error.message?.toLowerCase().includes("guest_email"))) {
      console.warn("[saveEvent] Coluna não encontrada no Supabase, executando fallback seguro:", error.message);
      const fallbackPayload: any = { ...payload };
      delete fallbackPayload.guest_emails;
      delete fallbackPayload.is_internal_invite;
      delete fallbackPayload.google_event_id;

      // Preservar os convidados na descrição para não perder informação
      if (payload.guest_emails && payload.guest_emails.length > 0) {
        const guestTag = `\n[Convidados: ${payload.guest_emails.join(", ")}]`;
        if (!fallbackPayload.description?.includes("[Convidados:")) {
          fallbackPayload.description = (fallbackPayload.description || "") + guestTag;
        }
      }

      const retry = await tryDb(fallbackPayload);
      if (retry.error) throw new Error(retry.error.message);
      savedRow = retry.data;
      error = null;
    }

    if (error) throw new Error(error.message);
    const row = savedRow;

    // Gera a URL do Google Calendar para o evento
    const googleCalendarUrl = buildGoogleCalendarUrl({
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      guestEmails: data.guest_emails,
    });

    // Tentativa secundária de sincronização via API do Google (se o usuário possuir tokens)
    if (sync_google && (data.guest_emails?.length || data.is_internal_invite)) {
      try {
        const { data: tokenRow } = await sb
          .from("user_google_calendar_tokens")
          .select("access_token, refresh_token, expiry_date")
          .eq("user_id", context.userId)
          .maybeSingle();

        if (tokenRow) {
          const { getGoogleOAuthCredentials } = await import("./google-calendar.functions");
          const { clientId, clientSecret } = await getGoogleOAuthCredentials(sb);
          const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
          const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

          let accessToken = tokenRow.access_token;
          const isExpired = tokenRow.expiry_date && Date.now() > tokenRow.expiry_date - 60_000;
          if (isExpired && tokenRow.refresh_token && clientId && clientSecret) {
            const res = await fetch(GOOGLE_TOKEN_URL, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: tokenRow.refresh_token,
                grant_type: "refresh_token",
              }),
            });
            if (res.ok) {
              const tokens: any = await res.json();
              accessToken = tokens.access_token;
              await sb.from("user_google_calendar_tokens").update({
                access_token: tokens.access_token,
                expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
              }).eq("user_id", context.userId);
            }
          }

          if (accessToken) {
            const attendees = (data.guest_emails ?? []).map((email) => ({ email }));
            const startDt = new Date(data.starts_at);
            const endDt = data.ends_at
              ? new Date(data.ends_at)
              : new Date(startDt.getTime() + 60 * 60_000);
            const body = {
              summary: data.title,
              description: data.description,
              location: data.location,
              start: { dateTime: startDt.toISOString(), timeZone: "America/Sao_Paulo" },
              end: { dateTime: endDt.toISOString(), timeZone: "America/Sao_Paulo" },
              attendees,
            };
            const isUpdate = !!row?.google_event_id;
            const url = isUpdate
              ? `${GOOGLE_CALENDAR_API}/calendars/primary/events/${row.google_event_id}?sendUpdates=all`
              : `${GOOGLE_CALENDAR_API}/calendars/primary/events?sendUpdates=all`;
            const gRes = await fetch(url, {
              method: isUpdate ? "PUT" : "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
            if (gRes.ok) {
              const gEvent: any = await gRes.json();
              try {
                await sb.from("calendar_events").update({ google_event_id: gEvent.id }).eq("id", row.id);
                row.google_event_id = gEvent.id;
              } catch {}
            }
          }
        }
      } catch (e) {
        console.warn("[Google Calendar] sync silencioso ignorado:", e);
      }
    }

    return {
      ...row,
      googleCalendarUrl,
    };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calendar_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
