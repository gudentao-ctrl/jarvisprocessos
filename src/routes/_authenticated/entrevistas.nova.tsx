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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entrevistas/nova")({
  component: NewInterview,
});

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState("");

  const selectedCompany = companies?.find((c: any) => c.id === companyId);
  const sectors = selectedCompany?.sectors ?? [];

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
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2">
          <Link to="/entrevistas"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Nova Entrevista</h1>
      </div>

      <Card className="space-y-4 p-4">
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
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Áudio</h2>
        <AudioRecorder
          onAudioReady={(b, m) => { setAudioBlob(b.size ? b : null); setAudioMime(m); }}
          disabled={submitting.isPending}
        />
      </div>

      <Button
        onClick={() => submitting.mutate()}
        disabled={submitting.isPending}
        className="h-14 w-full text-base font-semibold"
      >
        {submitting.isPending ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando e transcrevendo...</>
        ) : "Salvar e Transcrever"}
      </Button>
    </div>
  );
}
