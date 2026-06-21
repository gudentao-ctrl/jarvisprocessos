import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Check } from "lucide-react";
import { suggestProcessFromInterview, applyProcessSuggestion, type ProcessSuggestion } from "@/lib/processes.functions";
import { getInterview, listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/processos/sugerir/$interviewId")({
  component: SugerirPage,
});

function SugerirPage() {
  const { interviewId } = Route.useParams();
  const router = useRouter();
  const [interview, setInterview] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [level, setLevel] = useState<"0" | "1" | "2">("1");
  const [suggestion, setSuggestion] = useState<ProcessSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    Promise.all([getInterview({ data: { id: interviewId } }), listCompanies()]).then(([i, c]) => {
      setInterview(i);
      setCompanies(c);
      if (i.interview?.company_id) setCompanyId(i.interview.company_id);
    });
  }, [interviewId]);

  async function generate() {
    setLoading(true);
    try {
      const s = await suggestProcessFromInterview({ data: { interview_id: interviewId } });
      setSuggestion(s);
      toast.success("Sugestão gerada. Revise antes de aplicar.");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setLoading(false); }
  }

  async function apply() {
    if (!suggestion || !companyId) return toast.error("Selecione a empresa");
    setApplying(true);
    try {
      const { process_id } = await applyProcessSuggestion({
        data: { interview_id: interviewId, company_id: companyId, level, suggestion },
      });
      toast.success("Processo criado");
      router.navigate({ to: "/processos/$id", params: { id: process_id } });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setApplying(false); }
  }

  function patch(path: string, value: any) {
    if (!suggestion) return;
    const copy = JSON.parse(JSON.stringify(suggestion));
    const parts = path.split(".");
    let cur: any = copy;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
    setSuggestion(copy);
  }
  function removeFrom(key: keyof ProcessSuggestion, idx: number) {
    if (!suggestion) return;
    const copy: any = JSON.parse(JSON.stringify(suggestion));
    copy[key].splice(idx, 1);
    setSuggestion(copy);
  }

  return (
    <div className="space-y-4">
      <Link to="/entrevistas/$id" params={{ id: interviewId }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à entrevista
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sugerir processo a partir da entrevista</h1>
        <p className="text-sm text-muted-foreground">{interview?.interview?.title}</p>
      </div>

      <Card className="p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <Label>Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nível</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">N0</SelectItem>
              <SelectItem value="1">N1</SelectItem>
              <SelectItem value="2">N2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Gerar com IA
        </Button>
      </Card>

      {suggestion && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>Nome do processo</Label>
              <Input value={suggestion.process_name} onChange={(e) => patch("process_name", e.target.value)} />
            </div>
            <div>
              <Label>Objetivo</Label>
              <Input value={suggestion.process_objective} onChange={(e) => patch("process_objective", e.target.value)} />
            </div>
          </Card>

          <Section title={`Atividades (${suggestion.activities.length})`}>
            {suggestion.activities.map((a, i) => (
              <Card key={i} className="p-3 grid sm:grid-cols-4 gap-2 text-sm">
                <Input value={a.title} onChange={(e) => patch(`activities.${i}.title`, e.target.value)} placeholder="Atividade" />
                <select className="border rounded px-2 py-1.5 bg-background text-sm" value={a.type} onChange={(e) => patch(`activities.${i}.type`, e.target.value)}>
                  {["start", "task", "decision", "wait", "approval", "end", "info_in", "info_out"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Input value={a.responsible} onChange={(e) => patch(`activities.${i}.responsible`, e.target.value)} placeholder="Responsável" />
                <div className="flex gap-2">
                  <Input type="number" value={a.time_minutes} onChange={(e) => patch(`activities.${i}.time_minutes`, Number(e.target.value))} placeholder="min" />
                  <Button size="icon" variant="ghost" onClick={() => removeFrom("activities", i)}>✕</Button>
                </div>
              </Card>
            ))}
          </Section>

          <Section title={`Mapa de informação (${suggestion.information_map.length})`}>
            {suggestion.information_map.map((it, i) => (
              <Card key={i} className="p-3 grid sm:grid-cols-3 gap-2 text-sm">
                <Input value={it.origin} onChange={(e) => patch(`information_map.${i}.origin`, e.target.value)} placeholder="Origem" />
                <Input value={it.destination} onChange={(e) => patch(`information_map.${i}.destination`, e.target.value)} placeholder="Destino" />
                <div className="flex gap-2">
                  <Input value={it.medium} onChange={(e) => patch(`information_map.${i}.medium`, e.target.value)} placeholder="Meio" />
                  <Button size="icon" variant="ghost" onClick={() => removeFrom("information_map", i)}>✕</Button>
                </div>
              </Card>
            ))}
          </Section>

          <Section title={`Mapa de decisão (${suggestion.decision_map.length})`}>
            {suggestion.decision_map.map((it, i) => (
              <Card key={i} className="p-3 grid sm:grid-cols-3 gap-2 text-sm">
                <Input value={it.decider} onChange={(e) => patch(`decision_map.${i}.decider`, e.target.value)} placeholder="Decisor" />
                <Input value={it.decision} onChange={(e) => patch(`decision_map.${i}.decision`, e.target.value)} placeholder="Decisão" />
                <div className="flex gap-2">
                  <Input value={it.reported_delay} onChange={(e) => patch(`decision_map.${i}.reported_delay`, e.target.value)} placeholder="Atraso" />
                  <Button size="icon" variant="ghost" onClick={() => removeFrom("decision_map", i)}>✕</Button>
                </div>
              </Card>
            ))}
          </Section>

          <Section title={`Dores (${suggestion.pains.length})`}>
            {suggestion.pains.map((p, i) => (
              <Card key={i} className="p-3 grid sm:grid-cols-3 gap-2 text-sm">
                <Input className="sm:col-span-2" value={p.description} onChange={(e) => patch(`pains.${i}.description`, e.target.value)} placeholder="Descrição" />
                <div className="flex gap-2">
                  <select className="border rounded px-2 py-1.5 bg-background flex-1" value={p.category} onChange={(e) => patch(`pains.${i}.category`, e.target.value)}>
                    {["processo", "informacao", "governanca", "pessoas", "tecnologia", "planejamento", "qualidade", "producao", "compras", "logistica"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button size="icon" variant="ghost" onClick={() => removeFrom("pains", i)}>✕</Button>
                </div>
              </Card>
            ))}
          </Section>

          <div className="sticky bottom-4">
            <Button size="lg" className="w-full" onClick={apply} disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Aplicar sugestão e criar processo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
