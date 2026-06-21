import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDiagnostics, deleteDiagnostic, getImplementationMetrics } from "@/lib/analysis.functions";
import { generateExecutiveDiagnostic } from "@/lib/analysis-ai.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diagnostico/")({ component: Page });

function Page() {
  const listFn = useServerFn(listDiagnostics);
  const delFn = useServerFn(deleteDiagnostic);
  const genFn = useServerFn(generateExecutiveDiagnostic);
  const metricsFn = useServerFn(getImplementationMetrics);
  const companiesFn = useServerFn(listCompanies);
  const { data = [] } = useQuery({ queryKey: ["diagnostics"], queryFn: () => listFn() });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn() });
  const { data: metrics } = useQuery({ queryKey: ["impl-metrics"], queryFn: () => metricsFn({ data: {} }) });
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!company) { toast.error("Selecione empresa"); return; }
    setBusy(true);
    try {
      const r = await genFn({ data: { company_id: company } });
      toast.success("Diagnóstico gerado");
      qc.invalidateQueries({ queryKey: ["diagnostics"] });
      window.location.href = `/diagnostico/${r.id}`;
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Diagnóstico Executivo</h1>
        <p className="text-muted-foreground mt-1">Consolidação automática de dores, causas, oportunidades e projetos recomendados.</p>
      </div>

      {metrics && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução da implementação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {(["sugerida", "aprovada", "em_andamento", "implementada", "rejeitada"] as const).map((s) => (
              <div key={s} className="border rounded p-3">
                <div className="text-2xl font-bold text-primary">{metrics[s] ?? 0}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.replace("_", " ")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Gerar novo diagnóstico</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-4 w-4" />Gerar com IA</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {data.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                  <Badge variant="outline">{(d as { companies?: { name?: string } }).companies?.name}</Badge>
                  <span>Gerado {new Date(d.generated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" asChild><Link to="/diagnostico/$id" params={{ id: d.id }}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                <Button size="sm" variant="ghost" onClick={async () => { await delFn({ data: { id: d.id } }); qc.invalidateQueries({ queryKey: ["diagnostics"] }); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum diagnóstico ainda.</p>}
      </div>
    </div>
  );
}
