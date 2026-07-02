import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { getIndicator, createCollection, listCollections, deleteCollection } from "@/lib/indicator-collections.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/indicadores/$id/coletar")({
  component: ColetarPage,
});

function ColetarPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getIndicator);
  const listF = useServerFn(listCollections);
  const create = useServerFn(createCollection);
  const del = useServerFn(deleteCollection);

  const { data: ind } = useQuery({ queryKey: ["indicator", id], queryFn: () => get({ data: { id } }) });
  const { data: cols = [] } = useQuery({ queryKey: ["collections", id], queryFn: () => listF({ data: { indicator_id: id } }) });

  const [value, setValue] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 10));
  const [who, setWho] = useState("");
  const [obs, setObs] = useState("");

  const save = useMutation({
    mutationFn: (d: any) => create({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections", id] });
      qc.invalidateQueries({ queryKey: ["indicator-status"] });
      setValue(""); setObs("");
      toast.success("Coleta registrada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registrar"),
  });

  const remove = useMutation({
    mutationFn: (cid: string) => del({ data: { id: cid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections", id] });
      qc.invalidateQueries({ queryKey: ["indicator-status"] });
      toast.success("Removida");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  function submit() {
    const n = Number(value.replace(",", "."));
    if (!isFinite(n)) return toast.error("Valor inválido");
    save.mutate({
      indicator_id: id,
      value: n,
      reference_period: period,
      submitted_by_name: who,
      observation: obs,
    });
  }

  if (!ind) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button onClick={() => nav({ to: "/indicadores" })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{ind.name}</h1>
        <p className="text-xs text-muted-foreground">
          {ind.companies?.name} {ind.processes?.name && `· ${ind.processes.name}`} · Meta: {ind.target ?? "—"} {ind.unit}
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold">Registrar valor</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Valor *</Label>
            <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={`ex. 100 ${ind.unit ?? ""}`} />
          </div>
          <div>
            <Label>Período</Label>
            <Input type="date" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Quem registrou</Label>
          <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <Label>Observação</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
        </div>
        <Button className="w-full min-h-11" onClick={submit} disabled={save.isPending}>
          <Check className="mr-1 h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar coleta"}
        </Button>
        {ind.instructions && (
          <p className="rounded bg-secondary p-2 text-xs text-muted-foreground">{ind.instructions}</p>
        )}
      </Card>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
        {cols.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Sem coletas ainda.</Card>
        ) : (
          <div className="space-y-2">
            {(cols as any[]).map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="font-semibold tabular-nums">{c.value} {ind.unit}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.submitted_at).toLocaleDateString("pt-BR")}
                    {c.submitted_by_name && ` · ${c.submitted_by_name}`}
                    {c.observation && ` · ${c.observation}`}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  c.evaluation === "ok" ? "bg-emerald-100 text-emerald-800"
                  : c.evaluation === "critico" ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"}`}>{c.evaluation}</span>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir coleta?")) remove.mutate(c.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card className="p-3 text-xs text-muted-foreground">
        Também é possível compartilhar o link público{" "}
        <Link to="/indicadores" className="text-primary underline">/c/{ind.public_token}</Link>{" "}
        para coleta sem login.
      </Card>
    </div>
  );
}
