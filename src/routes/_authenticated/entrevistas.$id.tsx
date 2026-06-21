import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getInterview, updateTranscript, analyzeInterview,
  updateAnalysis, deleteInterview, exportInterviewPdf, transcribeInterview,
} from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Sparkles, Save, Trash2, Download, Plus, X, Loader2, RefreshCw, Workflow,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entrevistas/$id")({
  component: InterviewDetail,
});

type ListKey = "insights" | "critical_points" | "pains" | "problems" | "decisions" | "flows" | "systems";

const CATEGORIES: { key: ListKey; label: string; emoji: string; color: string }[] = [
  { key: "pains", label: "Dores", emoji: "🟥", color: "border-l-red-500" },
  { key: "problems", label: "Problemas Operacionais", emoji: "🟨", color: "border-l-amber-500" },
  { key: "decisions", label: "Decisões", emoji: "🔵", color: "border-l-blue-500" },
  { key: "flows", label: "Fluxos de Processo", emoji: "🟢", color: "border-l-emerald-500" },
  { key: "systems", label: "Sistemas Citados", emoji: "⚙️", color: "border-l-slate-500" },
];

function InterviewDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getInterview);
  const updateT = useServerFn(updateTranscript);
  const analyze = useServerFn(analyzeInterview);
  const updateA = useServerFn(updateAnalysis);
  const del = useServerFn(deleteInterview);
  const exportPdf = useServerFn(exportInterviewPdf);
  const transcribe = useServerFn(transcribeInterview);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["interview", id],
    queryFn: () => get({ data: { id } }),
  });

  const [transcript, setTranscript] = useState("");
  const [analysisDraft, setAnalysisDraft] = useState<any>(null);

  useEffect(() => {
    if (data?.transcript) setTranscript(data.transcript.content);
    if (data?.analysis) setAnalysisDraft(data.analysis);
  }, [data?.transcript?.id, data?.analysis?.id]);

  const saveTranscript = useMutation({
    mutationFn: () => updateT({ data: { interview_id: id, content: transcript } }),
    onSuccess: () => { toast.success("Transcrição salva"); qc.invalidateQueries({ queryKey: ["interview", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const runAnalyze = useMutation({
    mutationFn: () => analyze({ data: { interview_id: id } }),
    onSuccess: () => { toast.success("Análise concluída"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const runTranscribe = useMutation({
    mutationFn: () => transcribe({ data: { interview_id: id } }),
    onSuccess: () => { toast.success("Transcrição gerada"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAnalysis = useMutation({
    mutationFn: () => updateA({
      data: {
        interview_id: id,
        summary: analysisDraft?.summary ?? "",
        insights: analysisDraft?.insights ?? [],
        critical_points: analysisDraft?.critical_points ?? [],
        pains: analysisDraft?.pains ?? [],
        problems: analysisDraft?.problems ?? [],
        decisions: analysisDraft?.decisions ?? [],
        flows: analysisDraft?.flows ?? [],
        systems: analysisDraft?.systems ?? [],
      },
    }),
    onSuccess: () => { toast.success("Análise salva"); qc.invalidateQueries({ queryKey: ["interview", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removing = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Entrevista excluída"); window.location.href = "/entrevistas"; },
    onError: (e: any) => toast.error(e.message),
  });

  const downloading = useMutation({
    mutationFn: () => exportPdf({ data: { interview_id: id } }),
    onSuccess: (result) => {
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="py-10 text-center text-muted-foreground">Entrevista não encontrada</p>;

  const { interview, audio_url } = data;
  const hasTranscript = !!transcript.trim();

  function updateListItem(key: ListKey, idx: number, value: string) {
    setAnalysisDraft((d: any) => {
      const arr = [...(d?.[key] ?? [])];
      arr[idx] = value;
      return { ...d, [key]: arr };
    });
  }
  function removeListItem(key: ListKey, idx: number) {
    setAnalysisDraft((d: any) => ({ ...d, [key]: (d?.[key] ?? []).filter((_: any, i: number) => i !== idx) }));
  }
  function addListItem(key: ListKey) {
    setAnalysisDraft((d: any) => ({ ...d, [key]: [...(d?.[key] ?? []), ""] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2 shrink-0">
            <Link to="/entrevistas"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="truncate text-xl font-bold">{interview.title}</h1>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={() => confirm("Excluir esta entrevista?") && removing.mutate()}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* META */}
      <Card className="p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {interview.companies?.name && <div><span className="text-muted-foreground">Empresa:</span> <strong>{interview.companies.name}</strong></div>}
          {interview.sectors?.name && <div><span className="text-muted-foreground">Setor:</span> <strong>{interview.sectors.name}</strong></div>}
          {interview.participant && <div><span className="text-muted-foreground">Participante:</span> <strong>{interview.participant}</strong></div>}
          <div><span className="text-muted-foreground">Data:</span> <strong>{interview.interview_date}</strong></div>
        </div>
      </Card>

      {/* AUDIO */}
      {audio_url && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Áudio</h2>
          <audio src={audio_url} controls className="w-full" />
        </section>
      )}

      {/* TRANSCRIPT */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Transcrição</h2>
          <Button
            variant="ghost" size="sm" onClick={() => runTranscribe.mutate()}
            disabled={runTranscribe.isPending} className="h-8 text-xs"
          >
            {runTranscribe.isPending
              ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Gerando...</>
              : <><RefreshCw className="mr-1 h-3 w-3" /> Regerar</>}
          </Button>
        </div>
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={10}
          placeholder="A transcrição aparecerá aqui — você pode editá-la livremente."
          className="min-h-[200px] resize-y font-mono text-sm leading-relaxed"
        />
        <Button
          onClick={() => saveTranscript.mutate()}
          disabled={saveTranscript.isPending}
          variant="outline"
          className="mt-2 h-10 w-full"
        >
          <Save className="mr-2 h-4 w-4" /> Salvar transcrição
        </Button>
      </section>

      {/* ANALYZE BUTTON */}
      <Button
        onClick={() => runAnalyze.mutate()}
        disabled={!hasTranscript || runAnalyze.isPending}
        className="h-14 w-full text-base font-semibold"
      >
        {runAnalyze.isPending
          ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando...</>
          : <><Sparkles className="mr-2 h-5 w-5" /> {data.analysis ? "Reanalisar com IA" : "Analisar com IA"}</>}
      </Button>

      {/* ANALYSIS */}
      {analysisDraft && (
        <div className="space-y-5">
          {/* SUMMARY */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo Executivo</h2>
            <Textarea
              value={analysisDraft.summary ?? ""}
              onChange={(e) => setAnalysisDraft({ ...analysisDraft, summary: e.target.value })}
              rows={5} className="resize-y"
            />
          </section>

          <ListBlock
            title="Insights Principais" emoji="💡" colorClass="border-l-primary"
            items={analysisDraft.insights ?? []}
            onChange={(i, v) => updateListItem("insights", i, v)}
            onRemove={(i) => removeListItem("insights", i)}
            onAdd={() => addListItem("insights")}
          />
          <ListBlock
            title="Pontos Críticos" emoji="⚠️" colorClass="border-l-destructive"
            items={analysisDraft.critical_points ?? []}
            onChange={(i, v) => updateListItem("critical_points", i, v)}
            onRemove={(i) => removeListItem("critical_points", i)}
            onAdd={() => addListItem("critical_points")}
          />

          {CATEGORIES.map((cat) => (
            <ListBlock
              key={cat.key}
              title={cat.label} emoji={cat.emoji} colorClass={cat.color}
              items={analysisDraft[cat.key] ?? []}
              onChange={(i, v) => updateListItem(cat.key, i, v)}
              onRemove={(i) => removeListItem(cat.key, i)}
              onAdd={() => addListItem(cat.key)}
            />
          ))}

          <Button
            onClick={() => saveAnalysis.mutate()}
            disabled={saveAnalysis.isPending}
            variant="outline"
            className="h-11 w-full"
          >
            <Save className="mr-2 h-4 w-4" /> Salvar edições da análise
          </Button>

          <Button
            onClick={() => downloading.mutate()}
            disabled={downloading.isPending}
            className="h-12 w-full"
          >
            {downloading.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando PDF...</>
              : <><Download className="mr-2 h-4 w-4" /> Exportar PDF</>}
          </Button>

          <Link
            to="/processos/sugerir/$interviewId"
            params={{ interviewId: id }}
            className="block"
          >
            <Button variant="outline" className="h-12 w-full">
              <Workflow className="mr-2 h-4 w-4" /> Sugerir processo com IA
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ListBlock({
  title, emoji, colorClass, items, onChange, onRemove, onAdd,
}: {
  title: string; emoji: string; colorClass: string; items: string[];
  onChange: (i: number, v: string) => void; onRemove: (i: number) => void; onAdd: () => void;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{emoji}</span> {title}
      </h2>
      <Card className={`border-l-4 p-3 ${colorClass}`}>
        {items.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Nada identificado.</p>
        )}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                value={item}
                onChange={(e) => onChange(i, e.target.value)}
                className="h-10"
              />
              <Button
                type="button" variant="ghost" size="icon"
                onClick={() => onRemove(i)}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button" variant="ghost" size="sm"
          onClick={onAdd}
          className="mt-2 h-8 text-xs text-muted-foreground"
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar item
        </Button>
      </Card>
    </section>
  );
}
