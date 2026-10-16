import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAccessAdmin, assertPermission } from "./permissions.functions";

export const getGoogleOAuthConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { googleCredentials } = await import("./google-calendar.server");
    const { clientId, clientSecret } = await googleCredentials();
    return { configured: Boolean(clientId && clientSecret), clientId: "", rawClientId: "", hasSecret: Boolean(clientSecret) };
  });

export const saveGoogleOAuthConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().trim().min(5).max(500), clientSecret: z.string().trim().min(5).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAccessAdmin(context.supabase);
    const { storeGoogleConfig } = await import("./google-calendar.server");
    await storeGoogleConfig(data.clientId, data.clientSecret);
    return { ok: true, configured: true };
  });

export const getGoogleAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ redirectUri: z.string().url().max(500), googleEmail: z.string().email().max(254).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context.supabase, null, "agenda", "read");
    const { googleCredentials, createGoogleState } = await import("./google-calendar.server");
    const { clientId } = await googleCredentials();
    if (!clientId) throw new Error("Credenciais do Google não configuradas. Solicite ao SuperAdmin.");
    const state = await createGoogleState(context.userId, data.redirectUri);
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: data.redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email", access_type: "offline", prompt: "consent select_account", state });
    if (data.googleEmail) params.set("login_hint", data.googleEmail.trim().toLowerCase());
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  });

export const saveGoogleCalendarTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(4096), state: z.string().uuid(), redirectUri: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context.supabase, null, "agenda", "read");
    const { exchangeGoogleCode } = await import("./google-calendar.server");
    return exchangeGoogleCode(context.userId, data.code, data.state, data.redirectUri);
  });

export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { googleStatus } = await import("./google-calendar.server");
    return googleStatus(context.userId);
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectGoogle } = await import("./google-calendar.server");
    return disconnectGoogle(context.userId);
  });

export const syncEventToGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { syncStoredGoogleEvent } = await import("./google-calendar.server");
    return syncStoredGoogleEvent(context.supabase, context.userId, data.event_id);
  });
