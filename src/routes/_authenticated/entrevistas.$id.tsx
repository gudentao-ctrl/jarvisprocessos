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
import { PageHeader } from "@/components/mapping/PageHeader";
import { EmptyState, CardSkeleton } from "@/components/mapping/EmptyState";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Sparkles, Save, Trash2, Download, Plus, X, Loader2, RefreshCw, Workflow,
  Mic, FileText, ListChecks, Rocket, Building2, User, Calendar, Layers, Lightbulb,
  AlertTriangle, Frown, Wrench, GitBranch, Cpu, SearchX, ScrollText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entrevistas/$id")({
  component: InterviewDetail,
});

type ListKey = "insights" | "critical_points" | "pains" | "problems" | "decisions" | "flows" | "systems";

const CATEGORIES: { key: ListKey; label: string; icon: typeof Frown; tone: string; bar: string }[] = [
  { key: "pains", label: "Dores", icon: Frown, tone: "bg-acc-red/10 text-acc-red", bar: "bg-acc-red" },
  { key: "problems", label: "Problemas Operacionais", icon: Wrench, tone: "bg-acc-amber/10 text-acc-amber", bar: "bg-acc-amber" },
  { key: "decisions", label: "Decisões", icon: GitBranch, tone: "bg-acc-blue/10 text-acc-blue", bar: "bg-acc-blue" },
  { key: "flows", label: "Fluxos de Processo", icon: Workflow, tone: "bg-acc-emerald/10 text-acc-emerald", bar: "bg-acc-emerald" },
  { key: "systems", label: "Sistemas Citados", icon: Cpu, tone: "bg-acc-slate/10 text-acc-slate", bar: "bg-acc-slate" },
];

function MetaPill({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-2.5 py-1.5 text-xs backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{label}</span>
    </span>
  );
}

function SectionHead({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Mic;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="truncate text-sm font-bold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ProgressTrail({ steps }: { steps: { label: string; icon: typeof Mic; done: boolean }[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex min-w-0 flex-1 items-center gap-1">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors",
              s.done ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            <s.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-[11px] font-semibold">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("h-px w-2 shrink-0", s.done ? "bg-primary/40" : "bg-border")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl border border-border/60 bg-muted/50" />
        <CardSkeleton rows={4} />
      </div>
    );
  }
  if (!data) {
    return (
      <EmptyState
        icon={SearchX}
        title="Entrevista não encontrada"
        description="Ela pode ter sido excluída ou o link está incorreto."
        accent="info"
        action={
          <Button asChild variant="outline">
            <Link to="/entrevistas"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar às entrevistas</Link>
          </Button>
        }
      />
    );
  }

  const { interview, audio_url } = data;
  const hasTranscript = !!transcript.trim();
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

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
    <div className="space-y-5">
      <PageHeader
        title={interview.title}
        subtitle="Entrevista operacional"
        icon={Mic}
        accent="process"
        actions={
          <>
            <Button asChild variant="ghost" size="icon" className="h-10 w-10">
              <Link to="/entrevistas"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => confirm("Excluir esta entrevista?") && removing.mutate()}
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
        stats={
          <>
            {interview.companies?.name && <MetaPill icon={Building2} label={interview.companies.name} />}
            {interview.sectors?.name && <MetaPill icon={Layers} label={interview.sectors.name} />}
            {interview.participant && <MetaPill icon={User} label={interview.participant} />}
            <MetaPill icon={Calendar} label={String(interview.interview_date)} />
          </>
        }
      />

      <ProgressTrail
        steps={[
          { label: "Áudio", icon: Mic, done: !!audio_url },
          { label: "Transcrição", icon: FileText, done: hasTranscript },
          { label: "Análise", icon: ListChecks, done: !!data.analysis },
          { label: "Entregáveis", icon: Rocket, done: interview.generation_status === "done" },
        ]}
      />

      {/* AUDIO */}
      {audio_url && (
        <Card className="overflow-hidden p-0">
          <SectionHead icon={Mic} title="Áudio" />
          <div className="p-4">
            <audio src={audio_url} controls className="w-full" />
          </div>
        </Card>
      )}

      {/* TRANSCRIPT */}
      <Card className="overflow-hidden p-0">
        <SectionHead
          icon={FileText}
          title="Transcrição"
          action={
            <Button
              variant="ghost" size="sm" onClick={() => runTranscribe.mutate()}
              disabled={runTranscribe.isPending} className="h-9 shrink-0 text-xs"
            >
              {runTranscribe.isPending
                ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Gerando...</>
                : <><RefreshCw className="mr-1 h-3 w-3" /> Regerar</>}
            </Button>
          }
        />
        <div className="space-y-2 p-4">
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={10}
            placeholder="A transcrição aparecerá aqui — você pode editá-la livremente."
            className="min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {words} palavras · {transcript.length} caracteres
            </p>
            <Button
              onClick={() => saveTranscript.mutate()}
              disabled={saveTranscript.isPending}
              variant="outline"
              className="h-10 shrink-0"
            >
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
      </Card>

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
      <div className="relative space-y-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/20 opacity-60 blur-3xl"
        />
        <div className="relative flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wide text-primary">
              Gerar entregáveis com IA
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Em uma única ação, a IA produz a <strong>ata da reunião</strong>, os <strong>processos mapeados (BPM)</strong>, dores, indicadores sugeridos, oportunidades e mapas de informação e decisão a partir desta entrevista.
              Itens que você já validou são preservados.
            </p>
          </div>
        </div>
        <div className="relative grid gap-2 sm:grid-cols-2">
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
          <p className="relative text-xs text-muted-foreground">
            Última geração: {new Date(interview.generated_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* ATA DA REUNIÃO */}
      {interview.minutes_md && (
        <Card className="overflow-hidden p-0">
          <SectionHead icon={ScrollText} title="Ata da reunião" />
          <div className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{interview.minutes_md}</pre>
          </div>
        </Card>
      )}

      {/* ANALYSIS */}
      {analysisDraft && (
        <div className="space-y-4">
          {/* SUMMARY */}
          <Card className="overflow-hidden p-0">
            <SectionHead icon={Sparkles} title="Resumo Executivo" />
            <div className="p-4">
              <Textarea
                value={analysisDraft.summary ?? ""}
                onChange={(e) => setAnalysisDraft({ ...analysisDraft, summary: e.target.value })}
                rows={5} className="resize-y"
              />
            </div>
          </Card>

          <ListBlock
            title="Insights Principais" icon={Lightbulb}
            tone="bg-primary/10 text-primary" bar="bg-primary"
            items={analysisDraft.insights ?? []}
            onChange={(i, v) => updateListItem("insights", i, v)}
            onRemove={(i) => removeListItem("insights", i)}
            onAdd={() => addListItem("insights")}
          />
          <ListBlock
            title="Pontos Críticos" icon={AlertTriangle}
            tone="bg-destructive/10 text-destructive" bar="bg-destructive"
            items={analysisDraft.critical_points ?? []}
            onChange={(i, v) => updateListItem("critical_points", i, v)}
            onRemove={(i) => removeListItem("critical_points", i)}
            onAdd={() => addListItem("critical_points")}
          />

          {CATEGORIES.map((cat) => (
            <ListBlock
              key={cat.key}
              title={cat.label} icon={cat.icon} tone={cat.tone} bar={cat.bar}
              items={analysisDraft[cat.key] ?? []}
              onChange={(i, v) => updateListItem(cat.key, i, v)}
              onRemove={(i) => removeListItem(cat.key, i)}
              onAdd={() => addListItem(cat.key)}
            />
          ))}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => saveAnalysis.mutate()}
              disabled={saveAnalysis.isPending}
              variant="outline"
              className="h-12 w-full"
            >
              <Save className="mr-2 h-4 w-4" /> Salvar edições
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
          </div>

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
  title, icon: Icon, tone, bar, items, onChange, onRemove, onAdd,
}: {
  title: string; icon: typeof Frown; tone: string; bar: string; items: string[];
  onChange: (i: number, v: string) => void; onRemove: (i: number) => void; onAdd: () => void;
}) {
  return (
    <Card className="relative overflow-hidden p-0">
      <span className={cn("absolute inset-y-0 left-0 w-1", bar)} aria-hidden />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3 pl-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", tone)}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="truncate text-sm font-bold">{title}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="p-3 pl-4">
        {items.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Nada identificado.</p>
        )}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="group flex items-start gap-2">
              <Input
                value={item}
                onChange={(e) => onChange(i, e.target.value)}
                className="h-10"
              />
              <Button
                type="button" variant="ghost" size="icon"
                onClick={() => onRemove(i)}
                className="h-10 w-10 shrink-0 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label="Remover item"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button" variant="ghost" size="sm"
          onClick={onAdd}
          className="mt-2 h-9 text-xs text-muted-foreground"
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar item
        </Button>
      </div>
    </Card>
  );
}
