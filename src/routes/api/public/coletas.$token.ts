import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  value: z.number().finite(),
  reference_period: z.string().max(20).optional(),
  observation: z.string().max(2000).optional(),
  submitted_by_name: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/public/coletas/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const token = params.token;
        if (!token || token.length < 8) {
          return new Response("Token inválido", { status: 400 });
        }
        let payload: unknown;
        try { payload = await request.json(); }
        catch { return new Response("Body inválido", { status: 400 }); }

        const parsed = Body.safeParse(payload);
        if (!parsed.success) {
          return new Response("Dados inválidos", { status: 400 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: ind, error: ie } = await sb
          .from("indicators").select("id").eq("public_token", token).maybeSingle();
        if (ie) return new Response(ie.message, { status: 500 });
        if (!ind) return new Response("Indicador não encontrado", { status: 404 });

        const ipRaw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("cf-connecting-ip") ?? "";
        const ipHashBuf = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(ipRaw + token),
        );
        const ipHash = Array.from(new Uint8Array(ipHashBuf))
          .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

        const { error } = await sb.from("indicator_collections").insert({
          indicator_id: ind.id,
          value: parsed.data.value,
          reference_period: parsed.data.reference_period ?? null,
          observation: parsed.data.observation ?? "",
          submitted_by_name: parsed.data.submitted_by_name ?? "",
          ip_hash: ipHash,
        });
        if (error) return new Response(error.message, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
