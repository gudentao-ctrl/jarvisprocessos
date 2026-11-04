import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isAllowedPushEndpoint } from "./push-endpoints";

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const [list, unread] = await Promise.all([
      sb
        .from("user_notifications")
        .select("id, kind, title, body, link, read_at, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(30),
      sb
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .is("read_at", null),
    ]);
    if (list.error) throw new Error(list.error.message);
    if (unread.error) throw new Error(unread.error.message);
    return {
      items: (list.data ?? []) as {
        id: string;
        kind: string;
        title: string;
        body: string;
        link: string;
        read_at: string | null;
        created_at: string;
      }[],
      unread: unread.count ?? 0,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(100).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    let q = sb
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (data.ids?.length) q = q.in("id", data.ids);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public half of the signing key so this device can subscribe. */
export const getPushPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getVapidConfig } = await import("./push.server");
    const config = await getVapidConfig(supabaseAdmin);
    return { publicKey: config.publicKey };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        endpoint: z.string().url().max(1000),
        p256dh: z.string().min(20).max(200),
        auth: z.string().min(8).max(100),
        userAgent: z.string().max(300).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!isAllowedPushEndpoint(data.endpoint)) throw new Error("Serviço de avisos não suportado.");
    const { error } = await (context.supabase as any).rpc("register_push_subscription", {
      _endpoint: data.endpoint,
      _p256dh: data.p256dh,
      _auth: data.auth,
      _user_agent: data.userAgent,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
