import { isAllowedGoogleCallbackUrl } from './security-urls';

async function privateClient() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

/** Call only after authenticating the caller; token rows never cross RPC boundaries. */
export async function googleCredentials() {
  const clientId = process.env['GOOGLE_CLIENT_ID']?.trim() || '';
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET']?.trim() || '';
  if (clientId && clientSecret) return { clientId, clientSecret };
  const db = await privateClient();
  const { data, error } = await db.from('google_calendar_private_config').select('client_id,client_secret').eq('id', true).maybeSingle();
  if (error) throw new Error('Não foi possível consultar a configuração Google.');
  return { clientId: clientId || data?.client_id || '', clientSecret: clientSecret || data?.client_secret || '' };
}

export async function storeGoogleConfig(clientId: string, clientSecret: string) {
  const db = await privateClient();
  const { error } = await db.from('google_calendar_private_config').upsert({ id: true, client_id: clientId, client_secret: clientSecret, updated_at: new Date().toISOString() });
  if (error) throw new Error('Não foi possível salvar a configuração Google.');
}

export async function createGoogleState(userId: string, redirectUri: string) {
  if (!isAllowedGoogleCallbackUrl(redirectUri)) throw new Error('Endereço de retorno não autorizado.');
  const state = crypto.randomUUID();
  const db = await privateClient();
  const { error } = await db.from('google_calendar_oauth_states').insert({ state, user_id: userId, redirect_uri: redirectUri });
  if (error) throw new Error('Não foi possível iniciar a autorização Google.');
  return state;
}

export async function exchangeGoogleCode(userId: string, code: string, state: string, redirectUri: string) {
  if (!isAllowedGoogleCallbackUrl(redirectUri)) throw new Error('Endereço de retorno não autorizado.');
  const db = await privateClient();
  // Atomic consumption prevents cross-user callbacks and replay.
  const { data: row, error } = await db.from('google_calendar_oauth_states').delete().eq('state', state).eq('user_id', userId).eq('redirect_uri', redirectUri).gt('expires_at', new Date().toISOString()).select('state').maybeSingle();
  if (error || !row) throw new Error('Autorização expirada ou inválida. Conecte novamente.');
  const { clientId, clientSecret } = await googleCredentials();
  if (!clientId || !clientSecret) throw new Error('Credenciais do Google não configuradas.');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
  if (!response.ok) throw new Error('Não foi possível autorizar a conta Google.');
  const tokens = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokens.access_token) throw new Error('Resposta de autorização Google inválida.');
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw new Error('Não foi possível confirmar a conta Google.');
  const profile = await profileResponse.json() as { email?: string };
  const { error: saveError } = await db.from('google_calendar_private_tokens').upsert({ user_id: userId, access_token: tokens.access_token, refresh_token: tokens.refresh_token || null, expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null, google_email: profile.email || null, updated_at: new Date().toISOString() });
  if (saveError) throw new Error('Não foi possível salvar a conexão Google.');
  return { ok: true, email: profile.email || null };
}

export async function googleStatus(userId: string) {
  const db = await privateClient();
  const { data, error } = await db.from('google_calendar_private_tokens').select('google_email').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Não foi possível consultar a conexão Google.');
  return { connected: Boolean(data), email: data?.google_email || null };
}

export async function disconnectGoogle(userId: string) {
  const db = await privateClient();
  const { data } = await db.from('google_calendar_private_tokens').select('access_token').eq('user_id', userId).maybeSingle();
  if (data?.access_token) {
    await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: data.access_token }) }).catch(() => undefined);
  }
  const { error } = await db.from('google_calendar_private_tokens').delete().eq('user_id', userId);
  if (error) throw new Error('Não foi possível desconectar a conta Google.');
  return { ok: true };
}

async function validGoogleToken(userId: string) {
  const db = await privateClient();
  const { data: row, error } = await db.from('google_calendar_private_tokens').select('access_token,refresh_token,expiry_date').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Não foi possível consultar a conexão Google.');
  if (!row) return null;
  if (!row.expiry_date || Date.now() < row.expiry_date - 60_000) return row.access_token;
  if (!row.refresh_token) return null;
  const { clientId, clientSecret } = await googleCredentials();
  if (!clientId || !clientSecret) return null;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: row.refresh_token, grant_type: 'refresh_token' }) });
  if (!response.ok) return null;
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) return null;
  const { error: saveError } = await db.from('google_calendar_private_tokens').update({ access_token: token.access_token, expiry_date: token.expires_in ? Date.now() + token.expires_in * 1000 : null, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (saveError) throw new Error('Não foi possível renovar a conexão Google.');
  return token.access_token;
}

/** sb must be the caller's RLS client, never the privileged client. */
export async function syncStoredGoogleEvent(sb: any, userId: string, eventId: string) {
  const { data: event, error } = await sb.from('calendar_events').select('*').eq('id', eventId).single();
  if (error || !event) throw new Error('Evento não encontrado ou sem acesso.');
  const { assertPermission } = await import('./permissions.functions');
  await assertPermission(sb, event.company_id || null, 'agenda', 'update');
  // Verify UPDATE through RLS before any external side effect.
  const { data: writable, error: writeError } = await sb.from('calendar_events').update({ updated_at: new Date().toISOString() }).eq('id', eventId).select('id').maybeSingle();
  if (writeError || !writable) throw new Error('Você não pode sincronizar este evento.');
  const token = await validGoogleToken(userId);
  if (!token) return { ok: false, reason: 'no_token' };
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 3600000);
  const body = { summary: event.title, description: event.description, location: event.location, start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' }, end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' }, attendees: (event.guest_emails || []).map((email: string) => ({ email })) };
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${event.google_event_id ? `/${encodeURIComponent(event.google_event_id)}` : ''}?sendUpdates=all`;
  const response = await fetch(url, { method: event.google_event_id ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) return { ok: false, reason: 'Não foi possível sincronizar o evento no Google.' };
  const result = await response.json() as { id: string };
  const { error: saveError } = await sb.from('calendar_events').update({ google_event_id: result.id }).eq('id', eventId);
  if (saveError) throw new Error('Evento enviado, mas o vínculo não pôde ser salvo.');
  return { ok: true, google_event_id: result.id };
}