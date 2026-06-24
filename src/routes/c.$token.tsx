import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

const getPublicIndicator = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row, error } = await sb
      .from("indicators")
      .select("id, name, description, unit, target, frequency, code, instructions")
      .eq("public_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row;
  });

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  loader: async ({ params }) => {
    const ind = await getPublicIndicator({ data: { token: params.token } });
    if (!ind) throw notFound();
    return { indicator: ind };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold mb-2">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Este link de coleta não foi encontrado ou foi desativado. Confira com quem enviou.
        </p>
      </div>
    </div>
  ),
  component: PublicCollect,
  head: () => ({ meta: [{ title: "Coleta de indicador — JARVIS" }] }),
});

function PublicCollect() {
  const { indicator } = Route.useLoaderData();
  const { token } = Route.useParams();
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 10));
  const [observation, setObservation] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/coletas/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: Number(value),
          reference_period: period,
          observation,
          submitted_by_name: name,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erro ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-md bg-background rounded-2xl border p-6 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center text-3xl">✓</div>
          <h1 className="text-xl font-bold">Valor enviado</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado! Sua coleta foi registrada para <strong>{indicator.name}</strong>.
          </p>
          <button
            onClick={() => { setDone(false); setValue(""); setObservation(""); }}
            className="text-sm text-primary underline min-h-11 px-4"
          >
            Enviar outro valor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-md bg-background rounded-2xl border shadow-sm p-6 space-y-5">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{indicator.code}</p>
          <h1 className="text-xl font-bold leading-tight">{indicator.name}</h1>
          {indicator.description && (
            <p className="text-sm text-muted-foreground">{indicator.description}</p>
          )}
        </header>

        <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-muted/40 p-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Meta</p>
            <p className="font-bold">{indicator.target ?? "—"} {indicator.unit}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Frequência</p>
            <p className="font-bold capitalize">{indicator.frequency || "—"}</p>
          </div>
        </div>

        {indicator.instructions && (
          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
            {indicator.instructions}
          </p>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Valor {indicator.unit && `(${indicator.unit})`} *
            </label>
            <input
              type="number"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 text-lg font-semibold min-h-12"
              placeholder="0"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Período de referência</label>
            <input
              type="date"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-12"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-12"
              placeholder="Quem está enviando?"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observação</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full border rounded-lg px-3 py-3 min-h-20"
              placeholder="Algo relevante sobre esta coleta?"
            />
          </div>

          {mut.error && (
            <p className="text-sm text-destructive">{(mut.error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={mut.isPending || !value}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-lg min-h-12 disabled:opacity-50"
          >
            {mut.isPending ? "Enviando…" : "Enviar coleta"}
          </button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground pt-2 border-t">
          JARVIS · Plataforma de consultoria operacional
        </p>
      </div>
    </div>
  );
}
