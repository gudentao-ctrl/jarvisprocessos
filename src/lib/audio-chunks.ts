// Client-side audio helpers: capture / convert audio into small WAV chunks so
// long recordings (up to 60+ minutes) can be transcribed piece by piece.

export const TARGET_SAMPLE_RATE = 16000;
export const CHUNK_SECONDS = 300; // 5 min per chunk (~9.6 MB WAV @16kHz mono)

export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function downsample(input: Float32Array, from: number, to = TARGET_SAMPLE_RATE): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const len = Math.floor(input.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

/** Split a mono 16kHz PCM buffer into WAV blobs of CHUNK_SECONDS each. */
export function splitToWavChunks(samples: Float32Array, chunkSeconds = CHUNK_SECONDS): Blob[] {
  const size = chunkSeconds * TARGET_SAMPLE_RATE;
  const parts: Blob[] = [];
  for (let i = 0; i < samples.length; i += size) {
    parts.push(encodeWav(samples.subarray(i, Math.min(i + size, samples.length))));
  }
  return parts.length ? parts : [encodeWav(samples)];
}

/** Decode any audio file (mp3/m4a/wav/webm) to mono 16kHz WAV chunks. */
export async function fileToWavChunks(
  file: Blob,
  onProgress?: (msg: string) => void,
): Promise<{ parts: Blob[]; durationSec: number }> {
  onProgress?.("Lendo arquivo...");
  const arrayBuffer = await file.arrayBuffer();
  const Ctx: typeof AudioContext =
    (window as any).AudioContext ?? (window as any).webkitAudioContext;
  const decodeCtx = new Ctx();
  onProgress?.("Decodificando áudio...");
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  const durationSec = decoded.duration;
  await decodeCtx.close();

  onProgress?.("Convertendo para 16 kHz...");
  const OfflineCtx: typeof OfflineAudioContext =
    (window as any).OfflineAudioContext ?? (window as any).webkitOfflineAudioContext;
  const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineCtx(1, frames, TARGET_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const mono = rendered.getChannelData(0);

  onProgress?.("Dividindo em blocos...");
  return { parts: splitToWavChunks(new Float32Array(mono)), durationSec };
}

/**
 * Streaming microphone recorder that emits complete WAV chunks while recording,
 * so memory stays flat regardless of how long the interview runs.
 */
export class ChunkedRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pending: Float32Array[] = [];
  private pendingLen = 0;
  readonly parts: Blob[] = [];
  durationSec = 0;

  constructor(private onChunk?: (index: number) => void) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    this.ctx = new Ctx();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    const rate = this.ctx.sampleRate;
    const limit = CHUNK_SECONDS * TARGET_SAMPLE_RATE;

    this.node.onaudioprocess = (e) => {
      const down = downsample(new Float32Array(e.inputBuffer.getChannelData(0)), rate);
      this.pending.push(down);
      this.pendingLen += down.length;
      this.durationSec += down.length / TARGET_SAMPLE_RATE;
      if (this.pendingLen >= limit) this.flush();
    };

    this.source.connect(this.node);
    this.node.connect(this.ctx.destination);
  }

  private flush() {
    if (!this.pendingLen) return;
    this.parts.push(encodeWav(concatFloat32(this.pending)));
    this.pending = [];
    this.pendingLen = 0;
    this.onChunk?.(this.parts.length);
  }

  async stop(): Promise<{ parts: Blob[]; durationSec: number }> {
    this.flush();
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    return { parts: this.parts.slice(), durationSec: this.durationSec };
  }
}
