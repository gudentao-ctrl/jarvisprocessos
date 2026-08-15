"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Trash2, Loader2, AudioLines } from "lucide-react";
import { ChunkedRecorder, fileToWavChunks, CHUNK_SECONDS } from "@/lib/audio-chunks";

type Props = {
  /** Emits WAV chunks (5 min each) ready for upload + transcription. */
  onAudioReady: (parts: Blob[], durationSec: number) => void;
  disabled?: boolean;
};

// Sem limite de duração: a gravação é fatiada em blocos WAV enquanto acontece.

function fmt(total: number) {
  const s = Math.floor(total);
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function AudioRecorder({ onAudioReady, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [processing, setProcessing] = useState<string | null>(null);
  const [ready, setReady] = useState<{ parts: number; duration: number; url: string | null } | null>(null);
  const recRef = useRef<ChunkedRecorder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      recRef.current?.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  async function start() {
    try {
      const rec = new ChunkedRecorder((i) => setChunks(i));
      await rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      setChunks(0);
      intervalRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }

  async function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    const { parts, durationSec } = await rec.stop();
    if (!parts.length || durationSec < 1) {
      alert("Gravação muito curta. Tente novamente.");
      return;
    }
    setReady({ parts: parts.length, duration: durationSec, url: URL.createObjectURL(parts[0]) });
    onAudioReady(parts, durationSec);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setProcessing("Preparando áudio...");
      const { parts, durationSec } = await fileToWavChunks(f, (m) => setProcessing(m));
      setReady({ parts: parts.length, duration: durationSec, url: URL.createObjectURL(f) });
      onAudioReady(parts, durationSec);
    } catch {
      alert("Não foi possível ler este arquivo de áudio. Tente MP3, M4A ou WAV.");
    } finally {
      setProcessing(null);
    }
  }

  function clear() {
    if (ready?.url) URL.revokeObjectURL(ready.url);
    setReady(null);
    setElapsed(0);
    setChunks(0);
    onAudioReady([], 0);
  }

  

  return (
    <div className="rounded-xl border bg-card p-4">
      {processing && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {processing}
        </div>
      )}

      {!processing && !ready && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => (recording ? void stop() : void start())}
            disabled={disabled}
            className={`flex h-24 w-24 items-center justify-center rounded-full transition-all ${
              recording
                ? "animate-pulse bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            aria-label={recording ? "Parar gravação" : "Gravar"}
          >
            {recording ? <Square className="h-8 w-8" /> : <Mic className="h-10 w-10" />}
          </button>
          <div className="text-center">
            <div className="font-mono text-2xl font-semibold tabular-nums">{fmt(elapsed)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {recording
                ? `Gravando... ${chunks > 0 ? `${chunks} bloco(s) prontos · ` : ""}sem limite de duração`
                : "Toque para iniciar (qualquer duração)"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <label className="w-full">
            <input
              type="file"
              accept="audio/*,video/mp4,.m4a,.mp4,.mp3,.wav,.aac,.caf,.ogg,.opus,.amr,.webm"
              onChange={onFile}
              className="hidden"
              disabled={recording}
            />
            <Button type="button" variant="outline" className="h-11 w-full" asChild>
              <span className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Enviar arquivo de áudio (MP3, M4A/Apple, WAV — qualquer duração)
              </span>
            </Button>
          </label>
        </div>
      )}

      {!processing && ready && (
        <div className="space-y-3">
          {ready.url && <audio src={ready.url} controls className="w-full" />}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <AudioLines className="h-4 w-4 text-primary" />
            <span>
              {fmt(ready.duration)} · {ready.parts} bloco(s) de até {CHUNK_SECONDS / 60} min para transcrição
            </span>
          </div>
          <Button type="button" variant="ghost" onClick={clear} className="w-full text-muted-foreground">
            <Trash2 className="mr-2 h-4 w-4" /> Remover e gravar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
