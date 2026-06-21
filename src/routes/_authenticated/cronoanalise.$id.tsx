import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Play, Pause, Plus, Trash2, Square } from "lucide-react";
import { getCronoSession, saveCronoObservation, deleteCronoObservation, computeCronoMetrics, saveActionPlan } from "@/lib/processes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cronoanalise/$id")({
  component: CronoDetail,
});

function CronoDetail() {
  const { id } = Route.useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof getCronoSession>> | null>(null);
  const [loading, setLoading] = useState(true);

  // Cronômetro
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // segundos
  const [activity, setActivity] = useState("");
  const [classification, setClassification] = useState<"VA" | "NVA" | "NNVA">("VA");
  const startRef = useRef<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getCronoSession({ data: { id } }).then((d) => { setData(d); setLoading(false); });
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => {
      if (startRef.current != null) setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
    return () => clearInterval(i);
  }, [running]);

  function start() {
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  }
  function pause() { setRunning(false); }
  function reset() { setRunning(false); setElapsed(0); startRef.current = null; }

  async function recordObservation() {
    if (!activity.trim()) return toast.error("Informe a atividade");
    const minutes = Number((elapsed / 60).toFixed(2));
    if (minutes <= 0) return toast.error("Tempo zerado");
    try {
      await saveCronoObservation({
        data: {
          session_id: id, ordering: data?.observations.length ?? 0,
          activity, time_minutes: minutes, classification,
        },
      });
      reset(); setActivity("");
      toast.success("Observação registrada");
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function manualAdd() {
    const name = prompt("Atividade:");
    if (!name) return;
    const t = prompt("Tempo em minutos:");
    if (!t) return;
    const c = prompt("Classificação (VA/NVA/NNVA):", "VA") as any;
    if (!["VA", "NVA", "NNVA"].includes(c)) return toast.error("Classificação inválida");
    try {
      await saveCronoObservation({
        data: { session_id: id, ordering: data?.observations.length ?? 0, activity: name, time_minutes: Number(t), classification: c },
      });
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function remove(obsId: string) {
    await deleteCronoObservation({ data: { id: obsId } });
    reload();
  }

  if (loading || !data) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const metrics = computeCronoMetrics(data.observations as any, data.session.takt_time);

  return (
    <div className="space-y-4">
      <Link to="/cronoanalise" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>

      <Card className="p-4">
        <h1 className="text-xl font-bold">{data.session.product} <span className="text-muted-foreground font-normal">· {data.session.production_line}</span></h1>
        <p className="text-sm text-muted-foreground">{data.session.companies?.name} · {data.session.observation_date} · {data.session.machine}</p>
        {data.session.processes && (
          <Link to="/processos/$id" params={{ id: data.session.processes.id }} className="text-xs text-primary hover:underline">
            Processo vinculado: {data.session.processes.name}
          </Link>
        )}
      </Card>

      {/* Cronômetro */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Cronômetro</p>
        <div className="text-center font-mono text-5xl font-bold tracking-tight tabular-nums">
          {formatTime(elapsed)}
        </div>
        <div className="flex gap-2 justify-center">
          {!running ? (
            <Button onClick={start} size="lg"><Play className="h-4 w-4 mr-1" /> Iniciar</Button>
          ) : (
            <Button onClick={pause} size="lg" variant="secondary"><Pause className="h-4 w-4 mr-1" /> Pausar</Button>
          )}
          <Button onClick={reset} variant="outline" size="lg"><Square className="h-4 w-4" /></Button>
        </div>
        <Input placeholder="Atividade observada" value={activity} onChange={(e) => setActivity(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          {(["VA", "NVA", "NNVA"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setClassification(c)}
              className={`rounded-md py-3 text-sm font-semibold border transition ${
                classification === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"
              }`}
            >{c}</button>
          ))}
        </div>
        <Button className="w-full" size="lg" onClick={recordObservation}>Registrar observação</Button>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Tempo total" value={`${metrics.total.toFixed(2)} min`} />
        <Stat label="% VA" value={`${metrics.pctVA.toFixed(0)}%`} good />
        <Stat label="% NVA" value={`${metrics.pctNVA.toFixed(0)}%`} bad />
        <Stat label="% NNVA" value={`${metrics.pctNNVA.toFixed(0)}%`} />
        <Stat label="Capacidade (peças/h)" value={metrics.capacityPerHour.toFixed(1)} />
        {metrics.taktGap != null && <Stat label="Gap takt" value={`${metrics.taktGap.toFixed(2)} min`} bad={metrics.taktGap > 0} />}
      </div>

      {/* Top gargalos */}
      {metrics.topBottlenecks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Maiores gargalos</p>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await saveActionPlan({
                  data: {
                    title: `Reduzir gargalo: ${metrics.topBottlenecks[0].activity}`,
                    description: `Identificado na cronoanálise (${metrics.topBottlenecks[0].time_minutes} min, ${metrics.topBottlenecks[0].classification})`,
                    company_id: data.session.company_id,
                    process_id: data.session.process_id,
                    cronoanalysis_id: id,
                    priority: "alta",
                  },
                });
                toast.success("Plano de ação criado");
              } catch (e: any) { toast.error(e?.message); }
            }}>Gerar plano</Button>
          </div>
          <div className="space-y-1">{metrics.topBottlenecks.map((b, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{b.activity}</span>
              <span className="text-muted-foreground">{Number(b.time_minutes).toFixed(2)} min · {b.classification}</span>
            </div>
          ))}</div>
        </Card>
      )}

      {/* Observações */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Observações ({data.observations.length})</p>
          <Button size="sm" variant="ghost" onClick={manualAdd}><Plus className="h-4 w-4 mr-1" /> Adicionar manualmente</Button>
        </div>
        {data.observations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem observações ainda.</p>
        ) : (
          <div className="divide-y">{data.observations.map((o: any) => (
            <div key={o.id} className="flex items-center gap-2 py-2 text-sm">
              <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${o.classification === "VA" ? "bg-emerald-100 text-emerald-800" : o.classification === "NVA" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{o.classification}</span>
              <span className="flex-1">{o.activity}</span>
              <span className="text-muted-foreground tabular-nums">{Number(o.time_minutes).toFixed(2)} min</span>
              <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ds = Math.floor((s * 10) % 10);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${ds}`;
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${good ? "text-emerald-600" : bad ? "text-rose-600" : ""}`}>{value}</p>
    </Card>
  );
}
