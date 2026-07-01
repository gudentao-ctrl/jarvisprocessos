import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getInterview, updateTranscript, analyzeInterview,
  updateAnalysis, deleteInterview, transcribeInterview,
} from "@/lib/interviews.functions";
import { generateArtifactsFromInterview } from "@/lib/interview-pipeline.functions";
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
  const transcribe = useServerFn(transcribeInterview);
  const generateAll = useServerFn(generateArtifactsFromInterview);

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

  const runPipeline = useMutation({
    mutationFn: (force: boolean) => generateAll({ data: { interview_id: id, force } }),
    onSuccess: (r: any) => {
      if (r?.skipped) toast.info(r.reason ?? "Geração ignorada");
      else {
        const s = r?.stats ?? {};
        toast.success(
          `Gerado: ${s.processes ?? 0} processos · ${s.activities ?? 0} atividades · ${s.pains ?? 0} dores · ${s.indicators ?? 0} indicadores · ${s.opportunities ?? 0} oportunidades`,
        );
      }
      refetch();
    },
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
    mutationFn: async () => {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;
      const marginTop = 40;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let y = marginTop;
      const write = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
        const size = opts.size ?? 10;
        doc.setFont("helvetica", opts.bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...(opts.color ?? [30, 30, 40]));
        const lines = doc.splitTextToSize(text || "—", pageW - marginX * 2) as string[];
        for (const line of lines) {
          if (y > pageH - 40) { doc.addPage(); y = marginTop; }
          doc.text(line, marginX, y);
          y += size + 3;
        }
      };
      // Header bar
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("JARVIS — Entrevista Operacional", marginX, 18);
      y = 50;
      write(interview.title, { size: 16, bold: true });
      const meta = [
        interview.companies?.name && `Empresa: ${interview.companies.name}`,
        interview.sectors?.name && `Setor: ${interview.sectors.name}`,
        interview.participant && `Participante: ${interview.participant}`,
        interview.interview_date && `Data: ${interview.interview_date}`,
      ].filter(Boolean).join("  •  ");
      write(meta, { size: 9, color: [100, 100, 110] });
      y += 6;
      if (analysisDraft?.summary) { write("RESUMO EXECUTIVO", { size: 11, bold: true, color: [249, 115, 22] }); write(analysisDraft.summary); y += 4; }
      if (interview.minutes_md) { write("ATA DA REUNIÃO", { size: 11, bold: true, color: [249, 115, 22] }); write(interview.minutes_md); y += 4; }
      const sections: Array<[string, string[] | undefined]> = [
        ["Insights", analysisDraft?.insights],
        ["Pontos críticos", analysisDraft?.critical_points],
        ["Dores", analysisDraft?.pains],
        ["Problemas", analysisDraft?.problems],
        ["Decisões", analysisDraft?.decisions],
        ["Fluxos", analysisDraft?.flows],
        ["Sistemas", analysisDraft?.systems],
      ];
      for (const [title, items] of sections) {
        if (!items || items.length === 0) continue;
        write(title.toUpperCase(), { size: 11, bold: true, color: [249, 115, 22] });
        for (const it of items) write(`• ${it}`);
        y += 4;
      }
      if (transcript.trim()) {
        write("TRANSCRIÇÃO", { size: 11, bold: true, color: [249, 115, 22] });
        write(transcript, { size: 9, color: [70, 70, 80] });
      }
      const safe = (interview.title || "entrevista").replace(/[^\w\-]+/g, "_").slice(0, 60);
      doc.save(`${safe}.pdf`);
      return { ok: true };
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar PDF"),
    onSuccess: () => toast.success("PDF gerado"),
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

      {/* PIPELINE COMPLETO */}
      <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">⚡ Gerar entregáveis com IA</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Em uma única ação, a IA produz a <strong>ata da reunião</strong>, os <strong>processos mapeados (BPM)</strong>, dores, indicadores sugeridos, oportunidades e mapas de informação e decisão a partir desta entrevista.
            Itens que você já validou são preservados.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => runPipeline.mutate(false)}
            disabled={!hasTranscript || runPipeline.isPending}
            className="h-12 w-full"
          >
            {runPipeline.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
              : <><Sparkles className="mr-2 h-4 w-4" /> {interview.generation_status === "done" ? "Atualizar" : "Gerar tudo"}</>}
          </Button>
          <Button
            onClick={() => runPipeline.mutate(true)}
            disabled={!hasTranscript || runPipeline.isPending}
            variant="outline"
            className="h-12 w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Forçar regeneração
          </Button>
        </div>
        {interview.generation_status === "done" && interview.generated_at && (
          <p className="text-xs text-muted-foreground">
            Última geração: {new Date(interview.generated_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* ATA DA REUNIÃO */}
      {interview.minutes_md && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ata da reunião</h2>
          <Card className="p-4">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{interview.minutes_md}</pre>
          </Card>
        </section>
      )}

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
