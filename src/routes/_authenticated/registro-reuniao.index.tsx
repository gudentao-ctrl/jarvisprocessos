import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, FileText, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MeetingReportView } from "@/components/meeting/MeetingReportView";
import { buildMeetingReport, type MeetingReport } from "@/lib/meeting-report";
import { transcribeLocally } from "@/lib/local-transcriber";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/registro-reuniao/")({
  head: () => ({
    meta: [
      { title: "Registro de Reunião · Jarvis Processos" },
      { name: "description", content: "Transcrição e relatório pessoal das suas reuniões: pontos, ações, prazos, pendências e validações." },
      { property: "og:title", content: "Registro de Reunião · Jarvis Processos" },
      { property: "og:description", content: "Transcrição e relatório pessoal das suas reuniões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistroReuniaoPage,
});

type Row = { id: string; title: string; meeting_date: string; participants: string; transcript: string; report: any; status: string };

function RegistroReuniaoPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["meeting-records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meeting_records")
        .select("id, title, meeting_date, participants, transcript, report, status")
        .order("meeting_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Row[];
    },
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [parts, setParts] = useState<Blob[]>([]);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("");

  const run = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe um título");
      if (!parts.length) throw new Error("Grave ou envie um áudio");
      const { data: u } = await supabase.auth.getUser();
      const { data: rec, error } = await supabase.from("meeting_records").insert({
        user_id: u.user!.id, title: title.trim(), participants: participants.trim(), meeting_date: date, duration_sec: Math.round(duration),
      }).select("id").single();
      if (error) throw error;
      const texts: string[] = [];
      await transcribeLocally(parts, setStatus, async (t, i) => {
        texts[i] = t;
        // Save after each block so nothing is lost if the screen closes.
        await supabase.from("meeting_records").update({ transcript: texts.filter(Boolean).join("\n\n") }).eq("id", rec.id);
      });
      const transcript = texts.filter(Boolean).join("\n\n");
      if (transcript.length < 10) throw new Error("Não foi possível reconhecer fala neste áudio.");
      setStatus("Gerando relatório...");
      const report = buildMeetingReport(transcript, participants);
      await supabase.from("meeting_records").update({ transcript, report: report as any, status: "reported" }).eq("id", rec.id);
      return rec.id;
    },
    onSuccess: (id) => {
      setStatus(""); setTitle(""); setParticipants(""); setParts([]);
      qc.invalidateQueries({ queryKey: ["meeting-records"] });
      setOpenId(id);
      toast.success("Reunião transcrita e relatório gerado.");
    },
    onError: (e: any) => { setStatus(""); qc.invalidateQueries({ queryKey: ["meeting-records"] }); toast.error(e.message ?? "Erro ao processar"); },
  });

  const save = useMutation({
    mutationFn: async (r: Row) => {
      const report = buildMeetingReport(r.transcript, r.participants);
      const { error } = await supabase.from("meeting_records").update({ transcript: r.transcript, report: report as any, status: "reported" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meeting-records"] }); toast.success("Relatório atualizado."); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("meeting_records").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { setOpenId(null); qc.invalidateQueries({ queryKey: ["meeting-records"] }); },
  });

  const open = rows.find((r) => r.id === openId);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Execução</p>
        <h1 className="text-2xl font-bold">Registro de Reunião</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Somente você vê seus registros. A transcrição é feita no seu aparelho, sem custo e sem limite de duração.
        </p>
      </header>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Título *</Label><Input className="mt-1.5 h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Alinhamento semanal" /></div>
          <div><Label>Participantes</Label><Input className="mt-1.5 h-11" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Nomes separados por vírgula" /></div>
          <div><Label>Data</Label><Input className="mt-1.5 h-11" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <AudioRecorder onAudioReady={(p, d) => { setParts(p); setDuration(d); }} disabled={run.isPending} />
        <Button className="h-12 w-full" disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{status || "Processando..."}</> : "Transcrever e gerar relatório"}
        </Button>
        {run.isPending && <p className="text-center text-xs text-muted-foreground">Mantenha esta tela aberta até terminar.</p>}
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-bold">Meus registros ({rows.length})</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reunião registrada ainda.</p>}
        {rows.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpenId(r.id === openId ? null : r.id)}
            className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-secondary/50">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.meeting_date.split("-").reverse().join("/")} · {r.status === "reported" ? "Relatório pronto" : "Transcrição incompleta"}</p>
            </div>
          </button>
        ))}
      </div>

      {open && <RecordDetail key={open.id} row={open} onSave={(r) => save.mutate(r)} onDelete={() => { if (confirm("Excluir este registro?")) del.mutate(open.id); }} saving={save.isPending} />}
    </div>
  );
}

function RecordDetail({ row, onSave, onDelete, saving }: { row: Row; onSave: (r: Row) => void; onDelete: () => void; saving: boolean }) {
  const [text, setText] = useState(row.transcript);
  const report = row.report as MeetingReport;
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold">{row.title}</h2>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
      </div>
      {report?.actions ? <MeetingReportView report={report} /> : <p className="text-sm text-muted-foreground">Relatório ainda não gerado.</p>}
      <div>
        <Label>Transcrição (corrija e atualize o relatório)</Label>
        <Textarea className="mt-1.5 min-h-[200px]" value={text} onChange={(e) => setText(e.target.value)} />
        <Button className="mt-2 w-full" variant="outline" disabled={saving || text.trim().length < 10} onClick={() => onSave({ ...row, transcript: text })}>
          Atualizar relatório
        </Button>
      </div>
    </Card>
  );
}
