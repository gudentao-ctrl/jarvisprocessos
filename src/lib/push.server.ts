// Server-only helpers for sending phone/computer notifications through the browsers' push services.
import { isAllowedPushEndpoint } from "./push-endpoints";

type Admin = any;
type VapidConfig = { publicKey: string; privateJwk: JsonWebKey };

function b64urlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Signing keys are created once on first use and stay in a service-role-only table. */
export async function getVapidConfig(admin: Admin): Promise<VapidConfig> {
  const read = async () => {
    const { data, error } = await admin
      .from("push_vapid_config")
      .select("public_key, private_jwk")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { publicKey: data.public_key as string, privateJwk: data.private_jwk as JsonWebKey } : null;
  };
  const existing = await read();
  if (existing) return existing;

  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const privateJwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as JsonWebKey;
  const x = b64urlToBytes(privateJwk.x!);
  const y = b64urlToBytes(privateJwk.y!);
  const raw = new Uint8Array(65);
  raw[0] = 4;
  raw.set(x, 1);
  raw.set(y, 33);
  const { error } = await admin
    .from("push_vapid_config")
    .upsert(
      { id: 1, public_key: bytesToB64url(raw), private_jwk: privateJwk },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  const stored = await read();
  if (!stored) throw new Error("Configuração de avisos indisponível.");
  return stored;
}

/** Sends each notification once; returns how many device deliveries succeeded. */
export async function dispatchNotifications(admin: Admin, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("user_notifications")
    .update({ pushed_at: new Date().toISOString() })
    .in("id", ids)
    .is("pushed_at", null)
    .gte("created_at", since)
    .select("id, user_id, title, body, link");
  if (error) throw new Error(error.message);
  if (!rows?.length) return 0;

  const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];
  const { data: subs, error: subError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subError) throw new Error(subError.message);
  if (!subs?.length) return 0;

  const [{ buildPushHTTPRequest }, vapid] = await Promise.all([
    import("@pushforge/builder"),
    getVapidConfig(admin),
  ]);
  const stale: string[] = [];
  const used: string[] = [];
  let sent = 0;

  await Promise.all(
    rows.flatMap((n: any) =>
      subs
        .filter((s: any) => s.user_id === n.user_id && isAllowedPushEndpoint(s.endpoint))
        .map(async (s: any) => {
          try {
            const req = await buildPushHTTPRequest({
              privateJWK: vapid.privateJwk as any,
              subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              message: {
                payload: { title: n.title, body: n.body, url: n.link, tag: n.id },
                adminContact: "https://jarvisprocessos.lovable.app",
                options: { ttl: 60 * 60 * 12, urgency: "high" },
              },
            });
            const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
            if (res.status === 404 || res.status === 410) stale.push(s.id);
            else if (res.ok) {
              sent += 1;
              used.push(s.id);
            } else console.warn("[push] delivery failed", res.status, await res.text().catch(() => ""));
          } catch (err) {
            console.warn("[push] delivery error", (err as Error).message);
          }
        }),
    ),
  );

  if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);
  if (used.length)
    await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
  return sent;
}
