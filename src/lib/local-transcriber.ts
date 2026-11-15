// Transcribes audio on the user's own device (free, no credits). Library loads only when used.
import { TARGET_SAMPLE_RATE } from "@/lib/audio-chunks";

let pipePromise: Promise<any> | null = null;

async function getPipe(onStatus: (m: string) => void) {
  if (!pipePromise) {
    pipePromise = (async () => {
      onStatus("Baixando o transcritor (só na primeira vez, ~80 MB)...");
      const { pipeline } = await import("@huggingface/transformers");
      const webgpu = typeof navigator !== "undefined" && "gpu" in navigator;
      return pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
        device: webgpu ? "webgpu" : "wasm",
        dtype: webgpu ? "fp32" : "q8",
      });
    })().catch((e) => {
      pipePromise = null;
      throw e;
    });
  }
  return pipePromise;
}

async function blobToPcm(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: TARGET_SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(buf);
    if (decoded.sampleRate === TARGET_SAMPLE_RATE) return new Float32Array(decoded.getChannelData(0));
    const OC: typeof OfflineAudioContext = (window as any).OfflineAudioContext ?? (window as any).webkitOfflineAudioContext;
    const off = new OC(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start(0);
    return new Float32Array((await off.startRendering()).getChannelData(0));
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Transcribes each block in turn and reports text as it is produced, so any length works. */
export async function transcribeLocally(
  parts: Blob[],
  onStatus: (m: string) => void,
  onPart: (text: string, index: number) => void,
) {
  const asr = await getPipe(onStatus);
  for (let i = 0; i < parts.length; i++) {
    onStatus(`Transcrevendo bloco ${i + 1} de ${parts.length} no seu aparelho...`);
    const pcm = await blobToPcm(parts[i]);
    const out = await asr(pcm, { language: "portuguese", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
    const text = String((Array.isArray(out) ? out[0]?.text : out?.text) ?? "").trim();
    onPart(text, i);
  }
}
