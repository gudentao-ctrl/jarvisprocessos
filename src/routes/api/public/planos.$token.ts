import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  status: z.string().max(40),
  comment: z.string().max(2000).optional(),
  submitted_by_name: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/public/planos/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const token = params.token;
        if (!token || token.length < 8) return new Response("Token inválido", { status: 400 });
        let payload: unknown;
        try { payload = await request.json(); }
        catch { return new Response("Body inválido", { status: 400 }); }
        const parsed = Body.safeParse(payload);
        if (!parsed.success) return new Response("Dados inválidos", { status: 400 });

        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: plan, error: pe } = await sb
          .from("action_plans").select("id, description, status").eq("public_token", token).maybeSingle();
        if (pe) return new Response(pe.message, { status: 500 });
        if (!plan) return new Response("Plano não encontrado", { status: 404 });

        const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
        const who = parsed.data.submitted_by_name || "Externo";
        const note = parsed.data.comment ? `\n[${stamp}] ${who}: ${parsed.data.comment}` : `\n[${stamp}] ${who}: status → ${parsed.data.status}`;
        const newDesc = ((plan.description as string) ?? "") + note;

        const { error } = await sb.from("action_plans").update({
          status: parsed.data.status,
          description: newDesc,
          updated_at: new Date().toISOString(),
        }).eq("id", plan.id);
        if (error) return new Response(error.message, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
