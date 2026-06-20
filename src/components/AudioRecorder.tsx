"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Trash2 } from "lucide-react";

type Props = {
  onAudioReady: (blob: Blob, mime: string) => void;
  disabled?: boolean;
};

export function AudioRecorder({ onAudioReady, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) {
          alert("Gravação muito curta. Tente novamente.");
          return;
        }
        setAudioUrl(URL.createObjectURL(blob));
        onAudioReady(blob, rec.mimeType || "audio/webm");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAudioUrl(URL.createObjectURL(f));
    onAudioReady(f, f.type || "audio/webm");
  }

  function clear() {
    setAudioUrl(null);
    chunksRef.current = [];
    onAudioReady(new Blob(), "");
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="rounded-xl border bg-card p-4">
      {!audioUrl && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={recording ? stop : start}
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
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {mm}:{ss}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {recording ? "Gravando..." : "Toque para iniciar a gravação"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <label className="w-full">
            <input type="file" accept="audio/*" onChange={onFile} className="hidden" />
            <Button type="button" variant="outline" className="h-11 w-full" asChild>
              <span className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Enviar arquivo de áudio
              </span>
            </Button>
          </label>
        </div>
      )}

      {audioUrl && (
        <div className="space-y-3">
          <audio src={audioUrl} controls className="w-full" />
          <Button type="button" variant="ghost" onClick={clear} className="w-full text-muted-foreground">
            <Trash2 className="mr-2 h-4 w-4" /> Remover e gravar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
