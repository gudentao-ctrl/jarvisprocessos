// Server-only: encrypted private Google Agenda addresses and busy-time reading (titles never leave).
import { isAllowedCalendarFeedUrl } from "./calendar-feed-url";

type Admin = any;
export type Busy = [number, number];
const CACHE_MS = 10 * 60 * 1000;

async function aesKey() {
  const secret = process.env["CALENDAR_FEED_SECRET"];
  if (!secret) throw new Error("Configuração de agenda indisponível.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptFeed(url: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(url)));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return toB64(out);
}
async function decryptFeed(stored: string) {
  const buf = fromB64(stored);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, await aesKey(), buf.slice(12));
  return new TextDecoder().decode(pt);
}

/** Downloads and expands the agenda into busy intervals between from..to (ms). */
export async function readBusy(url: string, from: number, to: number): Promise<Busy[]> {
  if (!isAllowedCalendarFeedUrl(url)) throw new Error("Endereço de agenda inválido.");
  const res = await fetch(url, { redirect: "error", headers: { Accept: "text/calendar" } });
  if (!res.ok) throw new Error(res.status === 404 ? "Link da agenda não encontrado ou revogado." : `Google respondeu ${res.status}.`);
  const text = await res.text();
  if (text.length > 15_000_000) throw new Error("Agenda grande demais.");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("O link não é uma agenda iCal.");
  const ICAL: any = (await import("ical.js")).default;
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(tz); } catch { /* ignore */ }
  }
  const vevents = root.getAllSubcomponents("vevent");
  const exceptions = new Map<string, any[]>();
  const masters: any[] = [];
  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) {
      const uid = v.getFirstPropertyValue("uid");
      exceptions.set(uid, [...(exceptions.get(uid) ?? []), v]);
    } else masters.push(v);
  }
  const busy: Busy[] = [];
  const push = (s: number, e: number, comp: any) => {
    if (String(comp.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") return;
    if (String(comp.getFirstPropertyValue("transp") ?? "").toUpperCase() === "TRANSPARENT") return;
    if (e > from && s < to) busy.push([s, e]);
  };
  for (const v of masters) {
    try {
      const ev = new ICAL.Event(v);
      for (const ex of exceptions.get(ev.uid) ?? []) ev.relateException(ex);
      if (!ev.isRecurring()) {
        push(ev.startDate.toJSDate().getTime(), (ev.endDate ?? ev.startDate).toJSDate().getTime(), v);
        continue;
      }
      const it = ev.iterator();
      let next;
      let guard = 0;
      while ((next = it.next()) && guard++ < 3000) {
        const t = next.toJSDate().getTime();
        if (t >= to) break;
        const d = ev.getOccurrenceDetails(next);
        const s = d.startDate.toJSDate().getTime();
        const e = d.endDate.toJSDate().getTime();
        if (e <= from) continue;
        push(s, e, d.item.component);
      }
    } catch { /* skip malformed event */ }
  }
  return busy.sort((a, b) => a[0] - b[0]).slice(0, 5000);
}

/** Busy times for users (cached 10 min). Returns per user: busy list, or null when no agenda linked. */
export async function busyForUsers(admin: Admin, userIds: string[]) {
  const out = new Map<string, { busy: Busy[] | null; error: string | null }>();
  if (!userIds.length) return out;
  const { data, error } = await admin.from("user_calendar_feeds").select("user_id, feed_ciphertext, busy_cache, cached_at").in("user_id", userIds);
  if (error) throw new Error(error.message);
  const now = Date.now();
  await Promise.all(
    (data ?? []).map(async (row: any) => {
      if (row.cached_at && now - new Date(row.cached_at).getTime() < CACHE_MS) {
        out.set(row.user_id, { busy: row.busy_cache as Busy[], error: null });
        return;
      }
      try {
        const busy = await readBusy(await decryptFeed(row.feed_ciphertext), now - 86400_000, now + 90 * 86400_000);
        await admin.from("user_calendar_feeds").update({ busy_cache: busy, cached_at: new Date().toISOString(), last_error: null }).eq("user_id", row.user_id);
        out.set(row.user_id, { busy, error: null });
      } catch (err) {
        const msg = (err as Error).message.slice(0, 300);
        await admin.from("user_calendar_feeds").update({ last_error: msg }).eq("user_id", row.user_id);
        out.set(row.user_id, { busy: (row.busy_cache as Busy[]) ?? [], error: msg });
      }
    }),
  );
  for (const id of userIds) if (!out.has(id)) out.set(id, { busy: null, error: null });
  return out;
}
