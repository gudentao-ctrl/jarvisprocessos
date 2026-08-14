import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AudioRecorder } from "@/components/AudioRecorder";
import {
  listCompanies, createInterview, transcribeInterview,
} from "@/lib/interviews.functions";
import { ArrowLeft, Loader2, Mic, ClipboardList, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entrevistas/nova")({
  component: NewInterview,
});

function SectionCard({
  step,
  title,
  description,
  icon: Icon,
  highlight,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  icon: typeof Mic;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden p-0 transition-colors",
        highlight ? "border-primary/50 shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-4 py-3">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            highlight ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            <span className="text-muted-foreground">{step}.</span> {title}
          </p>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

function NewInterview() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listCo = useServerFn(listCompanies);
  const create = useServerFn(createInterview);
  const transcribe = useServerFn(transcribeInterview);

  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: () => listCo() });

  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [sectorId, setSectorId] = useState<string>("");
  const [participant, setParticipant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [audioParts, setAudioParts] = useState<Blob[]>([]);
  const [audioDuration, setAudioDuration] = useState(0);
  const [progress, setProgress] = useState<string>("");

  const selectedCompany = companies?.find((c: any) => c.id === companyId);
  const sectors = selectedCompany?.sectors ?? [];

  const hasTitle = title.trim().length > 0;
  const hasAudio = audioParts.length > 0;
  const missing = [!hasTitle && "título", !hasAudio && "áudio"].filter(Boolean) as string[];


  const submitting = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe um título");
      if (!audioBlob || audioBlob.size < 1024) throw new Error("Grave ou envie um áudio");

      // 1) upload audio to storage
      const ext = audioMime.includes("mp4") ? "mp4" : audioMime.includes("mpeg") ? "mp3" : audioMime.includes("wav") ? "wav" : "webm";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("interview-audio")
        .upload(path, audioBlob, { contentType: audioMime || "audio/webm", upsert: false });
      if (up.error) throw new Error("Falha ao enviar áudio: " + up.error.message);

      // 2) create interview row
      const interview = await create({
        data: {
          title: title.trim(),
          company_id: companyId || null,
          sector_id: sectorId || null,
          participant: participant.trim(),
          interview_date: date,
          audio_path: path,
          audio_mime: audioMime || "audio/webm",
        },
      });

      // 3) kick off transcription (await — usually fast for short clips)
      try {
        await transcribe({ data: { interview_id: interview.id } });
      } catch (e: any) {
        toast.error("Áudio salvo, mas transcrição falhou: " + e.message);
      }

      return interview;
    },
    onSuccess: (interview) => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Entrevista criada!");
      navigate({ to: "/entrevistas/$id", params: { id: interview.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar entrevista"),
  });

  return (
    <div className="space-y-4">
      <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-transparent p-4 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 opacity-60 blur-3xl"
        />
        <div className="relative flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2">
            <Link to="/entrevistas"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight">Nova Entrevista</h1>
            <p className="truncate text-xs text-muted-foreground">
              Contexto + áudio — a IA transcreve em seguida
            </p>
          </div>
        </div>
      </header>

      <SectionCard
        step={1}
        title="Contexto"
        description="Identificação da entrevista"
        icon={ClipboardList}
        highlight={hasTitle}
      >
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Diagnóstico Comercial"
            className="mt-1.5 h-11"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setSectorId(""); }}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Setor</Label>
            <Select value={sectorId} onValueChange={setSectorId} disabled={!companyId || sectors.length === 0}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder={companyId ? "Selecione" : "—"} /></SelectTrigger>
              <SelectContent>
                {sectors.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {companies && companies.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma empresa cadastrada.{" "}
            <Link to="/empresas" className="text-primary underline">Cadastrar agora</Link>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="part">Participante</Label>
            <Input
              id="part" value={participant} onChange={(e) => setParticipant(e.target.value)}
              placeholder="Nome ou cargo" className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        step={2}
        title="Áudio"
        description={hasAudio ? "Áudio pronto para envio" : "Grave ou envie um arquivo"}
        icon={Mic}
        highlight={hasAudio}
      >
        <AudioRecorder
          onAudioReady={(b, m) => { setAudioBlob(b.size ? b : null); setAudioMime(m); }}
          disabled={submitting.isPending}
        />
        {hasAudio && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Áudio capturado
          </p>
        )}
      </SectionCard>

      <div className="space-y-2">
        <Button
          onClick={() => submitting.mutate()}
          disabled={submitting.isPending}
          className="h-14 w-full text-base font-semibold"
        >
          {submitting.isPending ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando e transcrevendo...</>
          ) : "Salvar e Transcrever"}
        </Button>
        {missing.length > 0 && !submitting.isPending && (
          <p className="text-center text-xs text-muted-foreground">
            Falta preencher: <strong>{missing.join(" e ")}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
