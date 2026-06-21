import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getRca, saveRca, addRcaAction, deleteRcaAction } from "@/lib/analysis.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/causa-raiz/$id")({ component: Page });

const ISHI_CATS = ["Método", "Máquina", "Material", "Mão de obra", "Medição", "Meio ambiente"];

function Page() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getRca);
  const saveFn = useServerFn(saveRca);
  const addAct = useServerFn(addRcaAction);
  const delAct = useServerFn(deleteRcaAction);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["rca", id], queryFn: () => getFn({ data: { id } }) });

  const [problem, setProblem] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [whys, setWhys] = useState<string[]>(["", "", "", "", ""]);
  const [ishi, setIshi] = useState<Record<string, string[]>>(Object.fromEntries(ISHI_CATS.map((c) => [c, []])));
  const [categorias, setCategorias] = useState<{ name: string; items: string[] }[]>([]);
  const [newAct, setNewAct] = useState<{ kind: "corretiva" | "preventiva"; description: string }>({ kind: "corretiva", description: "" });

  useEffect(() => {
    if (data) {
      setProblem(data.problem);
      setConclusion(data.conclusion);
      const d = (data.data ?? {}) as { whys?: string[]; ishikawa?: Record<string, string[]>; categorias?: { name: string; items: string[] }[] };
      if (d.whys) setWhys([...d.whys, "", "", "", "", ""].slice(0, 5));
      if (d.ishikawa) setIshi({ ...Object.fromEntries(ISHI_CATS.map((c) => [c, []])), ...d.ishikawa });
      if (d.categorias) setCategorias(d.categorias);
    }
  }, [data]);

  async function save() {
    if (!data) return;
    const payload = data.method === "cinco_porques" ? { whys } : data.method === "ishikawa" ? { ishikawa: ishi } : { categorias };
    try {
      await saveFn({ data: {
        id: data.id, company_id: data.company_id, problem, conclusion,
        method: data.method, data: payload,
        process_id: data.process_id, pain_point_id: data.pain_point_id,
      } });
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["rca", id] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function addAction() {
    if (!newAct.description) return;
    await addAct({ data: { analysis_id: id, ...newAct } });
    setNewAct({ kind: "corretiva", description: "" });
    qc.invalidateQueries({ queryKey: ["rca", id] });
  }

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-4">
      <Link to="/causa-raiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-1">{data.method}</Badge>
          <h1 className="text-2xl font-bold">{data.problem}</h1>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div><Label>Problema</Label><Input value={problem} onChange={(e) => setProblem(e.target.value)} /></div>
        </CardContent>
      </Card>

      {data.method === "cinco_porques" && (
        <Card>
          <CardHeader><CardTitle className="text-base">5 Porquês</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {whys.map((w, i) => (
              <div key={i}>
                <Label className="text-xs text-muted-foreground">Por quê {i + 1}?</Label>
                <Input value={w} onChange={(e) => { const n = [...whys]; n[i] = e.target.value; setWhys(n); }} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.method === "ishikawa" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ISHI_CATS.map((cat) => (
            <Card key={cat}>
              <CardHeader><CardTitle className="text-sm">{cat}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ishi[cat] ?? []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={item} onChange={(e) => { const n = [...(ishi[cat] ?? [])]; n[i] = e.target.value; setIshi({ ...ishi, [cat]: n }); }} />
                    <Button size="sm" variant="ghost" onClick={() => setIshi({ ...ishi, [cat]: ishi[cat].filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setIshi({ ...ishi, [cat]: [...(ishi[cat] ?? []), ""] })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.method === "categoria" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Categorias de causa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {categorias.map((c, i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <Input value={c.name} onChange={(e) => { const n = [...categorias]; n[i] = { ...n[i], name: e.target.value }; setCategorias(n); }} placeholder="Nome da categoria" />
                {c.items.map((it, j) => (
                  <Input key={j} value={it} onChange={(e) => { const n = [...categorias]; n[i].items[j] = e.target.value; setCategorias(n); }} />
                ))}
                <Button size="sm" variant="outline" onClick={() => { const n = [...categorias]; n[i].items.push(""); setCategorias(n); }}>+ Item</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setCategorias([...categorias, { name: "", items: [""] }])}>+ Categoria</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Conclusão</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3} placeholder="Causa raiz identificada" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data.actions ?? []).map((a) => (
            <div key={a.id} className="flex items-start gap-2 border-b pb-2">
              <Badge variant={a.kind === "corretiva" ? "default" : "secondary"}>{a.kind}</Badge>
              <span className="text-sm flex-1">{a.description}</span>
              <Button size="sm" variant="ghost" onClick={async () => { await delAct({ data: { id: a.id } }); qc.invalidateQueries({ queryKey: ["rca", id] }); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={newAct.kind} onValueChange={(v) => setNewAct({ ...newAct, kind: v as "corretiva" | "preventiva" })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="corretiva">Corretiva</SelectItem><SelectItem value="preventiva">Preventiva</SelectItem></SelectContent>
            </Select>
            <Input className="flex-1 min-w-[200px]" placeholder="Descrição da ação" value={newAct.description} onChange={(e) => setNewAct({ ...newAct, description: e.target.value })} />
            <Button onClick={addAction}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
