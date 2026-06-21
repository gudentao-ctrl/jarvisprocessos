import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listRcas, saveRca, deleteRca } from "@/lib/analysis.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/causa-raiz/")({ component: Page });

function Page() {
  const listFn = useServerFn(listRcas);
  const saveFn = useServerFn(saveRca);
  const delFn = useServerFn(deleteRca);
  const companiesFn = useServerFn(listCompanies);
  const { data = [] } = useQuery({ queryKey: ["rcas"], queryFn: () => listFn() });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => companiesFn() });
  const qc = useQueryClient();

  const [form, setForm] = useState({ company_id: "", problem: "", method: "cinco_porques" as "cinco_porques" | "ishikawa" | "categoria" });
  async function create() {
    if (!form.company_id || !form.problem) { toast.error("Empresa e problema obrigatórios"); return; }
    try {
      await saveFn({ data: { ...form, data: {}, conclusion: "" } });
      toast.success("Criada");
      setForm({ ...form, problem: "" });
      qc.invalidateQueries({ queryKey: ["rcas"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Causa Raiz</h1>
        <p className="text-muted-foreground mt-1">5 Porquês, Ishikawa ou categorização. Vincule a problemas e ações.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Nova análise</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Empresa</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Método</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as "cinco_porques" | "ishikawa" | "categoria" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinco_porques">5 Porquês</SelectItem>
                  <SelectItem value="ishikawa">Ishikawa (6M)</SelectItem>
                  <SelectItem value="categoria">Categorização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Problema</Label><Input value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Descreva o problema central" /></div>
          <Button onClick={create}>Criar análise</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {data.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.problem}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">{r.method}</Badge>
                  {(r as { companies?: { name?: string } }).companies?.name && <span>{(r as { companies: { name: string } }).companies.name}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/causa-raiz/$id" params={{ id: r.id }}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                <Button size="sm" variant="ghost" onClick={async () => { await delFn({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["rcas"] }); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma análise.</p>}
      </div>
    </div>
  );
}
