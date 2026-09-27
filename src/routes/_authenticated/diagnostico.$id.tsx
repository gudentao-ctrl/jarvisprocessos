import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getDiagnostic, updateDiagnostic } from "@/lib/analysis.functions";
import { EXECUTIVE_PILLARS, type ExecutiveDiagnosticContent, type ExecutivePillarKey } from "@/lib/executive-diagnostic-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExportDiagnosticPdfButton } from "@/components/report/ExportDiagnosticPdfButton";

export const Route = createFileRoute("/_authenticated/diagnostico/$id")({
  component: Page,
  head: () => ({ meta: [
    { title: "Editar Diagnóstico Executivo — JARVIS" },
    { name: "description", content: "Edição e exportação do diagnóstico executivo por pilares." },
    { property: "og:title", content: "Editar Diagnóstico Executivo — JARVIS" },
    { property: "og:description", content: "Relatório executivo editável por pilares organizacionais." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const LEGACY_SECTIONS: Array<{ key: keyof ExecutiveDiagnosticContent; label: string }> = [
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
  const updateFn = useServerFn(updateDiagnostic);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["diag", id], queryFn: () => getFn({ data: { id } }) });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ExecutiveDiagnosticContent>({});

  useEffect(() => {
    if (!data) return;
    const next = (data.content ?? {}) as ExecutiveDiagnosticContent;
    if (next.pilares && !next.included_sections) next.included_sections = ["resumo", ...EXECUTIVE_PILLARS.map((pillar) => pillar.key)];
    setTitle(data.title);
    setContent(next);
  }, [data]);

  async function save() {
    try {
      await updateFn({ data: { id, title, content: content as Record<string, unknown> } });
      toast.success("Diagnóstico salvo");
      queryClient.invalidateQueries({ queryKey: ["diag", id] });
    } catch (error) { toast.error((error as Error).message); }
  }

  function setList(key: keyof ExecutiveDiagnosticContent, items: string[]) { setContent({ ...content, [key]: items }); }
  function setPillarList(key: ExecutivePillarKey, field: "positivos" | "problemas" | "intervencoes", items: string[]) {
    if (!content.pilares) return;
    setContent({ ...content, pilares: { ...content.pilares, [key]: { ...content.pilares[key], [field]: items } } });
  }
  function toggleSection(section: string, checked: boolean) {
    const current = new Set(content.included_sections ?? []);
    if (checked) current.add(section); else current.delete(section);
    setContent({ ...content, included_sections: [...current] });
  }

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  const companyName = (data as { companies?: { name?: string } }).companies?.name;
  const logos = (data as { report_logos?: { company?: string | null; consultancy?: string | null } }).report_logos;

  return <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-8">
    <Link to="/diagnostico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Voltar</Link>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Input className="min-w-[260px] flex-1 text-xl font-bold" value={title} onChange={(event) => setTitle(event.target.value)} />
      <div className="flex gap-2"><ExportDiagnosticPdfButton title={title} content={content} subtitle={companyName} logos={logos} /><Button onClick={save}><Save className="mr-1 h-4 w-4" />Salvar</Button></div>
    </div>

    {content.pilares ? <>
      <Card><CardHeader><CardTitle className="text-base">O que irá compor o PDF</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">
        <SectionToggle label="Resumo executivo" checked={(content.included_sections ?? []).includes("resumo")} onChange={(checked) => toggleSection("resumo", checked)} />
        {EXECUTIVE_PILLARS.map((pillar) => <SectionToggle key={pillar.key} label={pillar.label} checked={(content.included_sections ?? []).includes(pillar.key)} onChange={(checked) => toggleSection(pillar.key, checked)} />)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Resumo executivo</CardTitle></CardHeader><CardContent><Textarea rows={6} value={content.resumo ?? ""} onChange={(event) => setContent({ ...content, resumo: event.target.value })} /></CardContent></Card>
      {EXECUTIVE_PILLARS.map((pillar, index) => {
        const value = content.pilares?.[pillar.key];
        return <Card key={pillar.key}><CardHeader><CardTitle className="text-base">{index + 1}. {pillar.label}</CardTitle></CardHeader><CardContent className="space-y-5">
          <EditableList label="Características positivas" emptyLabel="Adicionar característica positiva" items={value?.positivos ?? []} onChange={(items) => setPillarList(pillar.key, "positivos", items)} />
          <EditableList label="Problemas identificados" emptyLabel="Adicionar problema identificado" items={value?.problemas ?? []} onChange={(items) => setPillarList(pillar.key, "problemas", items)} />
          <EditableList label="Propostas de intervenção" emptyLabel="Adicionar proposta de intervenção" items={value?.intervencoes ?? []} onChange={(items) => setPillarList(pillar.key, "intervencoes", items)} />
        </CardContent></Card>;
      })}
    </> : <>
      <Card><CardHeader><CardTitle className="text-base">Resumo executivo</CardTitle></CardHeader><CardContent><Textarea rows={5} value={content.resumo ?? ""} onChange={(event) => setContent({ ...content, resumo: event.target.value })} /></CardContent></Card>
      {LEGACY_SECTIONS.map(({ key, label }) => <EditableListCard key={key as string} label={label} items={(content[key] as string[]) ?? []} onChange={(items) => setList(key, items)} />)}
      <Card><CardHeader><CardTitle className="text-base">Projetos recomendados</CardTitle></CardHeader><CardContent className="space-y-2">
        {(content.projetos_recomendados ?? []).map((project, index) => <div key={index} className="space-y-2 rounded border p-3"><div className="flex gap-2"><Input className="flex-1" placeholder="Nome" value={project.nome} onChange={(event) => { const next = [...(content.projetos_recomendados ?? [])]; next[index] = { ...next[index], nome: event.target.value }; setContent({ ...content, projetos_recomendados: next }); }} /><select className="rounded border bg-background px-2 text-sm" value={project.prazo} onChange={(event) => { const next = [...(content.projetos_recomendados ?? [])]; next[index] = { ...next[index], prazo: event.target.value }; setContent({ ...content, projetos_recomendados: next }); }}><option value="curto">Curto</option><option value="medio">Médio</option><option value="longo">Longo</option></select><Button size="sm" variant="ghost" onClick={() => setContent({ ...content, projetos_recomendados: (content.projetos_recomendados ?? []).filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-3.5 w-3.5" /></Button></div><Textarea rows={2} placeholder="Descrição" value={project.descricao} onChange={(event) => { const next = [...(content.projetos_recomendados ?? [])]; next[index] = { ...next[index], descricao: event.target.value }; setContent({ ...content, projetos_recomendados: next }); }} /></div>)}
        <Button size="sm" variant="outline" onClick={() => setContent({ ...content, projetos_recomendados: [...(content.projetos_recomendados ?? []), { nome: "", descricao: "", prazo: "curto" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar projeto</Button>
      </CardContent></Card>
    </>}
    <div className="flex justify-end"><Button onClick={save}><Save className="mr-1 h-4 w-4" />Salvar alterações</Button></div>
  </div>;
}

function SectionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start gap-2 rounded border p-3"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span className="text-sm font-medium leading-tight">{label}</span></label>;
}

function EditableList({ label, emptyLabel, items, onChange }: { label: string; emptyLabel: string; items: string[]; onChange: (items: string[]) => void }) {
  return <section><h3 className="mb-2 text-sm font-semibold">{label}</h3><div className="space-y-2">{items.map((item, index) => <div key={index} className="flex gap-2"><Textarea rows={2} value={item} onChange={(event) => { const next = [...items]; next[index] = event.target.value; onChange(next); }} /><Button size="sm" variant="ghost" aria-label={`Remover item de ${label}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}<Button size="sm" variant="outline" onClick={() => onChange([...items, ""])}><Plus className="mr-1 h-3.5 w-3.5" />{emptyLabel}</Button></div></section>;
}

function EditableListCard({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return <Card><CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader><CardContent><EditableList label={label} emptyLabel="Adicionar" items={items} onChange={onChange} /></CardContent></Card>;
}