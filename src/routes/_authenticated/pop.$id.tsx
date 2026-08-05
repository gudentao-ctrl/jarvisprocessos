import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, Save, Sparkles, Trash2, Upload, Workflow, FileText } from "lucide-react";
import { toast } from "sonner";
import { generatePop, getPop, savePop, deletePop } from "@/lib/pop.functions";
import { listProcesses } from "@/lib/processes.functions";
import { useActiveCompany } from "@/lib/active-company";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_POP, normalizePop, type PopContent } from "@/lib/pop-types";
import { PopEditor } from "@/components/pop/PopEditor";
import { ExportPopPdfButton, ExportPopWordButton } from "@/components/pop/PopExportButtons";
import { PageHeader } from "@/components/mapping/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pop/$id")({
  head: () => ({
    meta: [
      { title: "Editor de POP | JARVIS" },
      { name: "description", content: "Gere e edite um Procedimento Operacional Padrão com IA e exporte em PDF ou Word." },
      { property: "og:title", content: "Editor de POP | JARVIS" },
      { property: "og:description", content: "Gere e edite um Procedimento Operacional Padrão com IA." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PopEditorPage,
});

const MAX_MB = 8;

function PopEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const router = useRouter();
  const { companyId, companies } = useActiveCompany();

  const get = useServerFn(getPop);
  const gen = useServerFn(generatePop);
  const save = useServerFn(savePop);
  const remove = useServerFn(deletePop);
  const procList = useServerFn(listProcesses);

  const [popId, setPopId] = useState<string | null>(isNew ? null : id);
  const [title, setTitle] = useState("Novo POP");
  const [status, setStatus] = useState<"rascunho" | "aprovado">("rascunho");
  const [selectedCompany, setSelectedCompany] = useState<string>(companyId ?? "");
  const [processId, setProcessId] = useState<string>("");
  const [sourceType, setSourceType] = useState<"texto" | "imagem" | "fluxo">("texto");
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<PopContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: existing } = useQuery({
    queryKey: ["pop", id],
    queryFn: () => get({ data: { id } }),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!existing) return;
    setPopId(existing.id);
    setTitle(existing.title);
    setStatus(existing.status === "aprovado" ? "aprovado" : "rascunho");
    setSelectedCompany(existing.company_id ?? "");
    setProcessId(existing.process_id ?? "");
    setSourceType((existing.source_type as any) ?? "texto");
    setSourcePath(existing.source_path ?? null);
    setContent(normalizePop(existing.content ?? {}));
  }, [existing]);

  useEffect(() => {
    if (isNew && companyId && !selectedCompany) setSelectedCompany(companyId);
  }, [isNew, companyId, selectedCompany]);

  const { data: processes = [] } = useQuery({
    queryKey: ["pop-processes", selectedCompany],
    queryFn: () => procList({ data: selectedCompany ? { company_id: selectedCompany } : {} }),
  });

  const companyName = useMemo(
    () => companies.find((c) => c.id === selectedCompany)?.name,
    [companies, selectedCompany],
  );

  async function toDataUrl(f: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
      r.readAsDataURL(f);
    });
  }

  async function handleGenerate(mode: "texto" | "imagem" | "fluxo") {
    setGenerating(true);
    try {
      let dataUrl: string | undefined;
      let path = sourcePath;
      if (mode === "imagem") {
        if (!file) throw new Error("Envie um arquivo PNG, JPG, JPEG ou PDF.");
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Arquivo maior que ${MAX_MB}MB.`);
        dataUrl = await toDataUrl(file);
        const key = `${selectedCompany || "sem-empresa"}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage.from("pop-sources").upload(key, file, { upsert: true });
        if (!upErr) { path = key; setSourcePath(key); }
      }
      const result = await gen({
        data: {
          mode,
          company_id: selectedCompany || null,
          process_id: processId || null,
          description: description || undefined,
          file_data_url: dataUrl,
          file_name: file?.name,
          current: content ?? undefined,
        },
      });
      setContent(result);
      setSourceType(mode);
      if (path) setSourcePath(path);
      if (title === "Novo POP" && result.identification.process_name) setTitle(`POP – ${result.identification.process_name}`);
      toast.success("POP gerado. Revise e edite antes de salvar.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar POP");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    try {
      const { id: savedId } = await save({
        data: {
          id: popId ?? undefined,
          company_id: selectedCompany || null,
          process_id: processId || null,
          title: title.trim() || "POP",
          status,
          source_type: sourceType,
          source_path: sourcePath,
          content: content as any,
        },
      });
      setPopId(savedId);
      toast.success("POP salvo");
      if (isNew) router.navigate({ to: "/pop/$id", params: { id: savedId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!popId) return;
    if (!confirm("Excluir este POP?")) return;
    await remove({ data: { id: popId } });
    toast.success("POP excluído");
    router.navigate({ to: "/pop" });
  }

  const hasProcess = Boolean(processId);

  return (
    <div className="space-y-4">
      <Link to="/pop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos POPs
      </Link>

      <PageHeader
        title="Procedimento Operacional Padrão (POP)"
        subtitle="Gere automaticamente um POP utilizando IA. O documento poderá ser editado antes de ser salvo."
        icon={ClipboardList}
        accent="process"
        actions={
          content ? (
            <>
              <ExportPopPdfButton pop={content} companyName={companyName} />
              <ExportPopWordButton pop={content} companyName={companyName} />
            </>
          ) : undefined
        }
      />

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <Label>Empresa</Label>
          <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setProcessId(""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Processo vinculado</Label>
          <Select value={processId} onValueChange={setProcessId}>
            <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
            <SelectContent>
              {processes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Título do documento</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold">1. Descrição do processo</h2>
          <Textarea
            rows={4}
            className="mt-2"
            placeholder="Descreva como o processo funciona…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold">2. Fluxograma (PNG, JPG, JPEG ou PDF)</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Selecionar arquivo
            </Button>
            <span className="text-xs text-muted-foreground">{file ? file.name : "Nenhum arquivo selecionado"}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">3. Fluxo mapeado no JARVIS</h2>
          <p className="text-xs text-muted-foreground">Selecione um processo acima para usar o fluxo já mapeado.</p>
          <Button
            variant="outline"
            className="mt-2"
            disabled={!hasProcess || generating}
            onClick={() => handleGenerate("fluxo")}
          >
            <Workflow className="mr-2 h-4 w-4" /> Gerar POP a partir do Fluxo
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button disabled={generating} onClick={() => handleGenerate(file ? "imagem" : "texto")}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {content ? "Atualizar com IA" : "Gerar POP com IA"}
          </Button>
          {content && (
            <>
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar POP
              </Button>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {popId && (
            <Button variant="ghost" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
            </Button>
          )}
        </div>
      </Card>

      {!content && !generating && (
        <Card className="flex items-center gap-3 border-dashed p-6 text-sm text-muted-foreground">
          <FileText className="h-5 w-5" />
          O documento gerado aparecerá aqui, com todos os campos editáveis antes de salvar.
        </Card>
      )}

      {content && (
        <>
          <PopQuality pop={content} />
          <PopEditor value={content} onChange={setContent} />
          <div className="sticky bottom-4 flex flex-wrap gap-2">
            <Button size="lg" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar POP
            </Button>
          </div>
        </>
      )}

    </div>
  );
}
