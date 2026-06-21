import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listCriteria, saveCriterion, deleteCriterion, recalcPriorities } from "@/lib/analysis.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/priorizacao")({ component: Page });

const KEYS = ["impacto", "urgencia", "esforco", "risco", "custo", "alinhamento"] as const;

function Page() {
  const listFn = useServerFn(listCriteria);
  const saveFn = useServerFn(saveCriterion);
  const delFn = useServerFn(deleteCriterion);
  const recalcFn = useServerFn(recalcPriorities);
  const companiesFn = useServerFn(listCompanies);
  const { data = [] } = useQuery({ queryKey: ["criteria"], queryFn: () => listFn() });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn() });
  const qc = useQueryClient();

  const [form, setForm] = useState<{ company_id: string; name: string; weights: Record<string, number>; is_default: boolean }>({
    company_id: "", name: "Padrão", is_default: true,
    weights: { impacto: 3, urgencia: 2, esforco: 2, risco: 2, custo: 1, alinhamento: 2 },
  });

  async function save() {
    if (!form.company_id || !form.name) { toast.error("Empresa e nome obrigatórios"); return; }
    try {
      await saveFn({ data: form });
      toast.success("Critério salvo");
      qc.invalidateQueries({ queryKey: ["criteria"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function recalc(criteria_id: string, company_id: string) {
    try {
      const r = await recalcFn({ data: { company_id, criteria_id } });
      toast.success(`${r.count} oportunidades reclassificadas`);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Priorização</h1>
        <p className="text-muted-foreground mt-1">Configure os pesos dos critérios. A IA usa esforço × impacto como base; pesos ajustam a fórmula final.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo critério</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Empresa</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {KEYS.map((k) => (
              <div key={k}>
                <Label className="capitalize">{k}</Label>
                <Input type="number" min={0} max={5} value={form.weights[k]}
                  onChange={(e) => setForm({ ...form, weights: { ...form.weights, [k]: Number(e.target.value) } })} />
              </div>
            ))}
          </div>
          <Button onClick={save}>Salvar critério</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="font-semibold">Critérios salvos</h2>
        {data.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{c.name} {c.is_default && <span className="text-xs text-primary ml-2">(padrão)</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {(c as { companies?: { name?: string } }).companies?.name} ·{" "}
                  {Object.entries(c.weights as Record<string, number>).map(([k, v]) => `${k}:${v}`).join(" · ")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => recalc(c.id, c.company_id)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Recalcular</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await delFn({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["criteria"] }); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum critério ainda.</p>}
      </div>
    </div>
  );
}
