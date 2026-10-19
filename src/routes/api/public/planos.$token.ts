import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  status: z.enum(["aberto", "em_andamento", "concluido"]),
  comment: z.string().max(2000).optional(),
  submitted_by_name: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/public/planos/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) return new Response("Entre na sua conta", { status: 401 });
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;
        if (!url || !key) return new Response("Serviço indisponível", { status: 503 });
        const sb = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: authorization } },
        });
        const { data: identity, error: authError } = await sb.auth.getUser(authorization.slice(7));
        if (authError || !identity.user) return new Response("Sessão inválida", { status: 401 });
        const token = params.token;
        if (!token || token.length < 8) return new Response("Token inválido", { status: 400 });
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Body inválido", { status: 400 });
        }
        const parsed = Body.safeParse(payload);
        if (!parsed.success) return new Response("Dados inválidos", { status: 400 });

        const { data: plan, error: pe } = await sb
          .from("action_plans")
          .select("id, company_id, description, status")
          .eq("public_token", token)
          .maybeSingle();
        if (pe) return new Response("Não foi possível consultar o plano", { status: 500 });
        if (!plan) return new Response("Plano não encontrado", { status: 404 });
        const { data: allowed, error: permissionError } = await sb.rpc("has_company_permission", { _company_id: plan.company_id, _tool: "planos_acao", _action: "update" });
        if (permissionError || allowed !== true) return new Response("Acesso negado", { status: 403 });

        const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
        const who = identity.user.id;
        const note = parsed.data.comment
          ? `\n[${stamp}] ${who}: ${parsed.data.comment}`
          : `\n[${stamp}] ${who}: status → ${parsed.data.status}`;
        const newDesc = ((plan.description as string) ?? "") + note;
        if (newDesc.length > 50000) return new Response("Limite de comentários atingido", { status: 400 });

        const { error } = await sb
          .from("action_plans")
          .update({
            status: parsed.data.status,
            description: newDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id)
          .eq("description", plan.description ?? "")
          .select("id");
        if (error) return new Response("Não foi possível atualizar o plano", { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
