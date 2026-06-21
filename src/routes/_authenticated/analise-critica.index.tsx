import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProcesses } from "@/lib/processes.functions";
import { analyzeProcessCritically } from "@/lib/analysis-ai.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analise-critica")({
  component: Page,
});

function Page() {
  const list = useServerFn(listProcesses);
  const analyze = useServerFn(analyzeProcessCritically);
  const { data: processes = [], isLoading } = useQuery({ queryKey: ["processes"], queryFn: () => list() });
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (id: string) => analyze({ data: { process_id: id } }),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (r) => {
      toast.success(`${r.count} oportunidades identificadas pela IA`);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Análise Crítica</h1>
        <p className="text-muted-foreground mt-1">A IA analisa cada processo e gera oportunidades de melhoria. Nada é aplicado automaticamente.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid gap-3">
        {processes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(p as { companies?: { name?: string } }).companies?.name ?? "—"} · Nível {p.level}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/processos/$id" params={{ id: p.id }}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
                <Button size="sm" onClick={() => mut.mutate(p.id)} disabled={busyId === p.id}>
                  {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-4 w-4" /> Analisar com IA</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && processes.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum processo mapeado ainda.</CardContent></Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Próximos passos</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Execute a análise IA em cada processo crítico.</p>
          <p>2. Revise as oportunidades na <Link to="/oportunidades" className="underline text-primary">Matriz de Oportunidades</Link>.</p>
          <p>3. Aprove, ajuste a prioridade e gere planos de ação.</p>
        </CardContent>
      </Card>
    </div>
  );
}
