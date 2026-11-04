import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Called by the database right after it stores new notifications. It needs no secret: it only
// delivers notifications that already exist, are less than 15 minutes old and were never sent.
const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { dispatchNotifications } = await import("@/lib/push.server");
          const sent = await dispatchNotifications(supabaseAdmin, parsed.ids);
          return Response.json({ ok: true, sent });
        } catch (err) {
          console.error("[push-dispatch]", (err as Error).message);
          return new Response("Dispatch failed", { status: 500 });
        }
      },
    },
  },
});
