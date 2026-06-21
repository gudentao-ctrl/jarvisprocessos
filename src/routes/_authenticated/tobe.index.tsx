import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProcesses } from "@/lib/processes.functions";
import { listTobeProcesses, cloneAsIsToTobe, compareAsIsTobe } from "@/lib/analysis.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, GitCompare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tobe/")({ component: Page });

function Page() {
  const listFn = useServerFn(listTobeProcesses);
  const procFn = useServerFn(listProcesses);
  const cloneFn = useServerFn(cloneAsIsToTobe);
  const compareFn = useServerFn(compareAsIsTobe);
  const { data = [] } = useQuery({ queryKey: ["tobe-list"], queryFn: () => listFn() });
  const { data: asis = [] } = useQuery({ queryKey: ["processes"], queryFn: () => procFn() });
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  const [name, setName] = useState("");

  const [compId, setCompId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof compareFn>> | null>(null);

  async function clone() {
    if (!src) return;
    try {
      const r = await cloneFn({ data: { process_id: src, name: name || undefined } });
      toast.success("TO BE criado");
      setOpen(false);
      setSrc(""); setName("");
      qc.invalidateQueries({ queryKey: ["tobe-list"] });
      window.location.href = `/processos/${r.id}`;
    } catch (e) { toast.error((e as Error).message); }
  }

  async function compare(id: string) {
    setCompId(id); setComparison(null);
    try { setComparison(await compareFn({ data: { tobe_id: id } })); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Processos TO BE</h1>
          <p className="text-muted-foreground mt-1">Desenhe o estado futuro a partir de um processo AS IS existente.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Criar TO BE de um AS IS</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar TO BE</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Processo AS IS de origem</Label>
                <Select value={src} onValueChange={setSrc}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{asis.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nome (opcional)</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Padrão: <nome> (TO BE)" /></div>
            </div>
            <DialogFooter><Button onClick={clone}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {data.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  {p.name} <Badge variant="outline">{p.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{(p as { companies?: { name?: string } }).companies?.name}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => compare(p.id)}><GitCompare className="h-3.5 w-3.5 mr-1" />Comparar</Button>
                <Button size="sm" asChild><Link to="/processos/$id" params={{ id: p.id }}>Editar <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum TO BE ainda.</p>}
      </div>

      {compId && comparison && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparação AS IS × TO BE</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-muted-foreground">Tempo AS IS:</span> <span className="font-semibold">{comparison.timeAsIs.toFixed(1)} min</span></div>
              <div><span className="text-muted-foreground">Tempo TO BE:</span> <span className="font-semibold text-primary">{comparison.timeToBe.toFixed(1)} min</span></div>
            </div>
            <DeltaList title="Atividades adicionadas" items={comparison.added.map((a) => a.title)} color="text-green-600" />
            <DeltaList title="Atividades eliminadas" items={comparison.removed.map((a) => a.title)} color="text-red-600" />
            <DeltaList title="Atividades modificadas (tempo)" items={comparison.modified.map((a) => a.title)} color="text-orange-600" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeltaList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${color}`}>{title}</div>
      <ul className="text-sm list-disc list-inside space-y-0.5">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
    </div>
  );
}
