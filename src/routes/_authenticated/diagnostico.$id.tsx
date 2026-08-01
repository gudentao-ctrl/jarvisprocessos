import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getDiagnostic, updateDiagnostic } from "@/lib/analysis.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diagnostico/$id")({ component: Page });

type Project = { nome: string; descricao: string; prazo: string };
type Content = {
  resumo?: string;
  principais_dores?: string[];
  causas_sistemicas?: string[];
  processos_criticos?: string[];
  gargalos?: string[];
  riscos?: string[];
  oportunidades?: string[];
  projetos_recomendados?: Project[];
};

const LIST_SECTIONS: Array<{ key: keyof Content; label: string }> = [
  { key: "principais_dores", label: "Principais dores" },
  { key: "causas_sistemicas", label: "Causas sistêmicas" },
  { key: "processos_criticos", label: "Processos críticos" },
  { key: "gargalos", label: "Gargalos" },
  { key: "riscos", label: "Riscos" },
  { key: "oportunidades", label: "Oportunidades" },
];

function Page() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getDiagnostic);
  const updFn = useServerFn(updateDiagnostic);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["diag", id], queryFn: () => getFn({ data: { id } }) });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<Content>({});

  useEffect(() => {
    if (data) { setTitle(data.title); setContent((data.content ?? {}) as Content); }
  }, [data]);

  async function save() {
    try {
      await updFn({ data: { id, title, content: content as Record<string, unknown> } });
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["diag", id] });
    } catch (e) { toast.error((e as Error).message); }
  }

  function setList(key: keyof Content, items: string[]) { setContent({ ...content, [key]: items }); }

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-4">
      <Link to="/diagnostico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Input className="text-xl font-bold flex-1 min-w-[260px]" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <ExportDiagnosticPdfButton
            title={title}
            content={content}
            subtitle={(data as { companies?: { name?: string } })?.companies?.name}
          />
          <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo executivo</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={5} value={content.resumo ?? ""} onChange={(e) => setContent({ ...content, resumo: e.target.value })} />
        </CardContent>
      </Card>

      {LIST_SECTIONS.map(({ key, label }) => (
        <ListSection key={key as string} label={label} items={(content[key] as string[]) ?? []} onChange={(items) => setList(key, items)} />
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Projetos recomendados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(content.projetos_recomendados ?? []).map((p, i) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="flex gap-2">
                <Input className="flex-1" placeholder="Nome" value={p.nome} onChange={(e) => {
                  const n = [...(content.projetos_recomendados ?? [])]; n[i] = { ...n[i], nome: e.target.value };
                  setContent({ ...content, projetos_recomendados: n });
                }} />
                <select className="border rounded px-2 text-sm bg-background" value={p.prazo} onChange={(e) => {
                  const n = [...(content.projetos_recomendados ?? [])]; n[i] = { ...n[i], prazo: e.target.value };
                  setContent({ ...content, projetos_recomendados: n });
                }}>
                  <option value="curto">Curto</option><option value="medio">Médio</option><option value="longo">Longo</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, projetos_recomendados: (content.projetos_recomendados ?? []).filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea rows={2} placeholder="Descrição" value={p.descricao} onChange={(e) => {
                const n = [...(content.projetos_recomendados ?? [])]; n[i] = { ...n[i], descricao: e.target.value };
                setContent({ ...content, projetos_recomendados: n });
              }} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setContent({ ...content, projetos_recomendados: [...(content.projetos_recomendados ?? []), { nome: "", descricao: "", prazo: "curto" }] })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Adicionar projeto
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button></div>
    </div>
  );
}

function ListSection({ label, items, onChange }: { label: string; items: string[]; onChange: (i: string[]) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Textarea rows={2} value={it} onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }} />
            <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange([...items, ""])}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
      </CardContent>
    </Card>
  );
}
