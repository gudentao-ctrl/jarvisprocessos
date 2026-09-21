import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getMaiaStore,
  saveMaiaStore,
  assertManagerOrAdmin,
} from "./maia-finance.functions";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// ─── Resolver de Credenciais Google OAuth ───────────────────────────────────

export async function getGoogleOAuthCredentials(
  sb?: any,
): Promise<{ clientId: string; clientSecret: string }> {
  let clientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ""
  ).trim();
  let clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.VITE_GOOGLE_CLIENT_SECRET ||
    ""
  ).trim();

  if ((!clientId || !clientSecret) && sb) {
    try {
      const store = await getMaiaStore(sb);
      if (store?.googleOAuth?.clientId) {
        clientId = clientId || store.googleOAuth.clientId.trim();
        clientSecret =
          clientSecret || (store.googleOAuth.clientSecret || "").trim();
        if (clientId) process.env.GOOGLE_CLIENT_ID = clientId;
        if (clientSecret) process.env.GOOGLE_CLIENT_SECRET = clientSecret;
      }
    } catch {}
  }

  return { clientId, clientSecret };
}

async function updateLocalEnv(vars: Record<string, string>) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      for (const [k, v] of Object.entries(vars)) {
        const regex = new RegExp(`^${k}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${k}=${v}`);
        } else {
          content += `\n${k}=${v}`;
        }
      }
      fs.writeFileSync(envPath, content, "utf-8");
    }
  } catch {}
}

// ─── Status e Configuração de Credenciais da API Google ─────────────────────

export const getGoogleOAuthConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { clientId, clientSecret } = await getGoogleOAuthCredentials(sb);
    return {
      configured: !!(clientId && clientSecret),
      clientId: clientId
        ? `${clientId.slice(0, 12)}...${clientId.slice(-12)}`
        : "",
      rawClientId: clientId,
      hasSecret: !!clientSecret,
    };
  });

export const saveGoogleOAuthConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clientId: z.string().min(5, "Informe um Client ID válido do Google"),
        clientSecret: z
          .string()
          .min(5, "Informe um Client Secret válido do Google"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertManagerOrAdmin(sb, context.userId);

    const clientId = data.clientId.trim();
    const clientSecret = data.clientSecret.trim();

    // 1. Atualizar no ambiente de execução
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;

    // 2. Persistir localmente no arquivo .env se acessível
    await updateLocalEnv({
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
    });

    // 3. Persistir no store global de templates no Supabase para durabilidade
    const store = await getMaiaStore(sb);
    store.googleOAuth = {
      clientId,
      clientSecret,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    await saveMaiaStore(sb, store);

    return { ok: true, configured: true };
  });

// ─── Auth URL ────────────────────────────────────────────────────────────────

export const getGoogleAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        redirectUri: z.string().url(),
        googleEmail: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { clientId } = await getGoogleOAuthCredentials(sb);
    if (!clientId) {
      throw new Error(
        "Credenciais do Google não configuradas no servidor (GOOGLE_CLIENT_ID).",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: data.redirectUri,
      response_type: "code",
      scope:
        "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent select_account",
    });

    if (data.googleEmail && data.googleEmail.trim()) {
      params.set("login_hint", data.googleEmail.trim().toLowerCase());
    }

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  });

// ─── Save tokens from OAuth code ─────────────────────────────────────────────

export const saveGoogleCalendarTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string(), redirectUri: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { clientId, clientSecret } = await getGoogleOAuthCredentials(sb);
    if (!clientId || !clientSecret) {
      throw new Error("Credenciais do Google OAuth não configuradas no servidor.");
    }

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
    const googleEmail = profile.email || null;

    const tokenPayload = {
      user_id: context.userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : null,
      google_email: googleEmail,
      updated_at: new Date().toISOString(),
    };

    // 1. Tentar salvar no banco de dados na tabela user_google_calendar_tokens
    try {
      await sb.from("user_google_calendar_tokens").upsert(tokenPayload);
    } catch {}

    // 2. Persistir no store global garantindo funcionamento em qualquer ambiente
    try {
      const store = await getMaiaStore(sb);
      store.googleTokens = store.googleTokens || {};
      store.googleTokens[context.userId] = tokenPayload;
      await saveMaiaStore(sb, store);
    } catch {}

    return { ok: true, email: googleEmail };
  });

// ─── Get connection status ────────────────────────────────────────────────────

export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;

    try {
      const { data, error } = await sb
        .from("user_google_calendar_tokens")
        .select("google_email, expiry_date")
        .eq("user_id", context.userId)
        .maybeSingle();

      if (!error && data) {
        return { connected: true, email: data.google_email as string | null };
      }
    } catch {}

    // Fallback store
    try {
      const store = await getMaiaStore(sb);
      const token = store.googleTokens?.[context.userId];
      if (token && token.access_token) {
        return { connected: true, email: (token.google_email as string) || null };
      }
    } catch {}

    return { connected: false, email: null };
  });

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;

    try {
      await sb
        .from("user_google_calendar_tokens")
        .delete()
        .eq("user_id", context.userId);
    } catch {}

    try {
      const store = await getMaiaStore(sb);
      if (store.googleTokens?.[context.userId]) {
        delete store.googleTokens[context.userId];
        await saveMaiaStore(sb, store);
      }
    } catch {}

    return { ok: true };
  });

// ─── Refresh token if needed ──────────────────────────────────────────────────

async function getValidAccessToken(
  sb: any,
  userId: string,
): Promise<string | null> {
  let row: any = null;

  try {
    const { data } = await sb
      .from("user_google_calendar_tokens")
      .select("access_token, refresh_token, expiry_date")
      .eq("user_id", userId)
      .maybeSingle();
    row = data;
  } catch {}

  if (!row) {
    try {
      const store = await getMaiaStore(sb);
      row = store.googleTokens?.[userId];
    } catch {}
  }

  if (!row) return null;

  const isExpired = row.expiry_date && Date.now() > row.expiry_date - 60_000;
  if (!isExpired) return row.access_token;

  const { clientId, clientSecret } = await getGoogleOAuthCredentials(sb);
  if (!clientId || !clientSecret || !row.refresh_token) return null;

  try {
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

    const newExpiry = tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null;

    try {
      await sb
        .from("user_google_calendar_tokens")
        .update({
          access_token: tokens.access_token,
          expiry_date: newExpiry,
        })
        .eq("user_id", userId);
    } catch {}

    try {
      const store = await getMaiaStore(sb);
      if (store.googleTokens?.[userId]) {
        store.googleTokens[userId].access_token = tokens.access_token;
        store.googleTokens[userId].expiry_date = newExpiry;
        await saveMaiaStore(sb, store);
      }
    } catch {}

    return tokens.access_token;
  } catch {
    return null;
  }
}

// ─── Sync event to Google Calendar ───────────────────────────────────────────

export const syncEventToGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        title: z.string(),
        description: z.string().optional().default(""),
        location: z.string().optional().default(""),
        starts_at: z.string(),
        ends_at: z.string().nullable().optional(),
        guest_emails: z.array(z.string().email()).optional().default([]),
        google_event_id: z.string().nullable().optional(),
      })
      .parse(d),
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

// ─── Gerador de URL Direta do Google Calendar (Sem necessidade de API complexa) ──

export function buildGoogleCalendarUrl({
  title,
  description = "",
  location = "",
  startsAt,
  endsAt,
  guestEmails = [],
}: {
  title: string;
  description?: string;
  location?: string;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  guestEmails?: string[];
}): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 60 * 60 * 1000);

  const formatIsoForGoogle = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const datesParam = `${formatIsoForGoogle(start)}/${formatIsoForGoogle(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Compromisso",
    dates: datesParam,
  });

  if (description) params.set("details", description);
  if (location) params.set("location", location);
  if (guestEmails && guestEmails.length > 0) {
    params.set("add", guestEmails.join(","));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
