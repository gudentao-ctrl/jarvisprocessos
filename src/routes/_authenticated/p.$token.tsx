import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const getPublicPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: row, error } = await sb
      .from("action_plans")
      .select("id, title, description, responsible, due_date, status, priority")
      .eq("public_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row;
  });

export const Route = createFileRoute("/_authenticated/p/$token")({
  ssr: false,
  loader: async ({ params }) => {
    const plan = await getPublicPlan({ data: { token: params.token } });
    if (!plan) throw notFound();
    return { plan };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold mb-2">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Este link não foi encontrado ou foi desativado.
        </p>
      </div>
    </div>
  ),
  component: PublicPlan,
  head: () => ({ meta: [{ title: "Plano de ação — JARVIS" }, { name: "description", content: "Acompanhamento autorizado de planos de ação JARVIS." }, { property: "og:title", content: "Plano de ação — JARVIS" }, { property: "og:description", content: "Acompanhamento autorizado de planos de ação JARVIS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

const STATUSES = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
] as const;

function PublicPlan() {
  const { plan } = Route.useLoaderData();
  const { token } = Route.useParams();
  const [status, setStatus] = useState(plan.status ?? "em_andamento");
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre na sua conta");
      const res = await fetch(`/api/public/planos/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ status, comment, submitted_by_name: name }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Erro ${res.status}`);
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-md bg-background rounded-2xl border p-6 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center text-3xl">
            ✓
          </div>
          <h1 className="text-xl font-bold">Atualização enviada</h1>
          <p className="text-sm text-muted-foreground">Obrigado! Sua atualização foi registrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-md bg-background rounded-2xl border shadow-sm p-6 space-y-5">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Plano de Ação
          </p>
          <h1 className="text-xl font-bold leading-tight">{plan.title}</h1>
          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
        </header>

        <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-muted/40 p-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Responsável</p>
            <p className="font-bold">{plan.responsible || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Prazo</p>
            <p className="font-bold">{plan.due_date || "—"}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-12 text-base bg-background"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-12 text-base"
              placeholder="Quem está enviando?"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Comentário</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-20 text-base"
              placeholder="O que aconteceu com esta ação?"
            />
          </div>

          {mut.error && <p className="text-sm text-destructive">{(mut.error as Error).message}</p>}

          <Button
            type="submit"
            disabled={mut.isPending}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-lg min-h-12 disabled:opacity-50"
          >
            {mut.isPending ? "Enviando…" : "Atualizar plano"}
          </Button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground pt-2 border-t">
          JARVIS · Plataforma de consultoria operacional
        </p>
      </div>
    </div>
  );
}
