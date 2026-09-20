import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// ─── Auth URL ────────────────────────────────────────────────────────────────

export const getGoogleAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ redirectUri: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: data.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  });

// ─── Save tokens from OAuth code ─────────────────────────────────────────────

export const saveGoogleCalendarTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string(), redirectUri: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      throw new Error("Google OAuth2 credentials not configured");

    // Exchange code for tokens
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: data.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google token exchange failed: ${err}`);
    }
    const tokens: any = await res.json();

    // Fetch Google user email
    const profileRes = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const profile: any = profileRes.ok ? await profileRes.json() : {};

    const sb: any = context.supabase;
    const { error } = await sb.from("user_google_calendar_tokens").upsert({
      user_id: context.userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : null,
      google_email: profile.email ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, email: profile.email ?? null };
  });

// ─── Get connection status ────────────────────────────────────────────────────

export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { data } = await sb
      .from("user_google_calendar_tokens")
      .select("google_email, expiry_date")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return { connected: false, email: null };
    return { connected: true, email: data.google_email as string | null };
  });

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { error } = await sb
      .from("user_google_calendar_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Refresh token if needed ──────────────────────────────────────────────────

async function getValidAccessToken(sb: any, userId: string): Promise<string | null> {
  const { data: row } = await sb
    .from("user_google_calendar_tokens")
    .select("access_token, refresh_token, expiry_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  const isExpired = row.expiry_date && Date.now() > row.expiry_date - 60_000;
  if (!isExpired) return row.access_token;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !row.refresh_token) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const tokens: any = await res.json();

  await sb.from("user_google_calendar_tokens").update({
    access_token: tokens.access_token,
    expiry_date: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null,
  }).eq("user_id", userId);

  return tokens.access_token;
}

// ─── Sync event to Google Calendar ───────────────────────────────────────────

export const syncEventToGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      event_id: z.string().uuid(),
      title: z.string(),
      description: z.string().optional().default(""),
      location: z.string().optional().default(""),
      starts_at: z.string(),
      ends_at: z.string().nullable().optional(),
      guest_emails: z.array(z.string().email()).optional().default([]),
      google_event_id: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const accessToken = await getValidAccessToken(sb, context.userId);
    if (!accessToken) return { ok: false, reason: "no_token" };

    const attendees = data.guest_emails.map((email) => ({ email }));
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

    let url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?sendUpdates=all`;
    let method = "POST";
    if (data.google_event_id) {
      url = `${GOOGLE_CALENDAR_API}/calendars/primary/events/${data.google_event_id}?sendUpdates=all`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Google Calendar] sync error:", err);
      return { ok: false, reason: err };
    }

    const gEvent: any = await res.json();

    // Persist google_event_id on the local record
    await sb
      .from("calendar_events")
      .update({ google_event_id: gEvent.id })
      .eq("id", data.event_id);

    return { ok: true, google_event_id: gEvent.id as string };
  });
