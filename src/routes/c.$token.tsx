import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createCollectionByAccessToken, getIndicatorByAccessToken } from "@/lib/indicator-collections.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  loader: async ({ params }) => {
    const ind = await getIndicatorByAccessToken({ data: { token: params.token } });
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
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold">Acesso não liberado</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  component: PublicCollect,
  head: () => ({ meta: [
    { title: "Coleta de indicador | JARVIS" },
    { name: "description", content: "Coleta segura de indicadores para clientes autorizados no JARVIS." },
    { property: "og:title", content: "Coleta de indicador | JARVIS" },
    { property: "og:description", content: "Coleta segura de indicadores para clientes autorizados no JARVIS." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

function PublicCollect() {
  const { indicator } = Route.useLoaderData();
  const { token } = Route.useParams();
  const create = useServerFn(createCollectionByAccessToken);
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 10));
  const [observation, setObservation] = useState("");
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () => create({ data: {
      token,
      value: Number(value),
      reference_period: period,
      observation,
    } }),
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
          <Button
            variant="link"
            onClick={() => { setDone(false); setValue(""); setObservation(""); }}
            className="min-h-11 px-4 text-sm"
          >
            Enviar outro valor
          </Button>
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

          <Button
            type="submit"
            disabled={mut.isPending || !value}
            className="min-h-12 w-full font-semibold"
          >
            {mut.isPending ? "Enviando…" : "Enviar coleta"}
          </Button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground pt-2 border-t">
          JARVIS · Plataforma de consultoria operacional
        </p>
      </div>
    </div>
  );
}
