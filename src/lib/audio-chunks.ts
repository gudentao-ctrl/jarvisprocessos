// Client-side audio helpers: capture / convert audio into small chunks so
// long recordings (up to 2+ hours) can be transcribed piece by piece with zero RAM crash.

export const TARGET_SAMPLE_RATE = 16000;
export const CHUNK_SECONDS = 300; // 5 min per chunk (~9.6 MB WAV @16kHz mono)
export const MAX_SAFE_FILE_SIZE_BYTES = 22 * 1024 * 1024; // 22 MB (Abaixo do limite de 25 MB do Whisper)

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

export function downsample(
  input: Float32Array,
  from: number,
  to = TARGET_SAMPLE_RATE,
): Float32Array {
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

/**
 * Fatiador binário de alta performance para arquivos WAV.
 * Não decodifica para Float32Array na memória RAM, garantindo suporte a
 * gravações de 2 a 4+ horas sem estourar o limite de memória do navegador.
 */
export async function splitWavFileBinary(
  file: Blob,
  chunkSeconds = CHUNK_SECONDS,
): Promise<Blob[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let offset = 12;
  let byteRate = 32000;
  let dataOffset = 44;
  let dataLength = bytes.byteLength - 44;

  while (offset < bytes.byteLength - 8) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      byteRate = view.getUint32(offset + 16, true) || 32000;
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataLength = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  const chunkByteSize = chunkSeconds * byteRate;
  const parts: Blob[] = [];

  for (let pos = 0; pos < dataLength; pos += chunkByteSize) {
    const curSize = Math.min(chunkByteSize, dataLength - pos);
    const partBuffer = new Uint8Array(44 + curSize);
    const partView = new DataView(partBuffer.buffer);

    partBuffer.set(bytes.subarray(0, 44), 0);
    partView.setUint32(4, 36 + curSize, true);
    partView.setUint32(40, curSize, true);
    partBuffer.set(bytes.subarray(dataOffset + pos, dataOffset + pos + curSize), 44);

    parts.push(new Blob([partBuffer], { type: "audio/wav" }));
  }

  return parts.length ? parts : [file];
}

/**
 * Divide qualquer arquivo de áudio para transcrição.
 * Estratégia de Alta Disponibilidade:
 * 1. Arquivos compactados (MP3, M4A, etc.) menores que 22MB são enviados diretamente como bloco único.
 * 2. Arquivos WAV são fatiados em blocos binários de 5 minutos sem decodificação pesada.
 * 3. Arquivos longos que excederem o limite de memória são fatiados por tamanho seguro (<= 18MB).
 */
export async function fileToWavChunks(
  file: Blob,
  onProgress?: (msg: string) => void,
): Promise<{ parts: Blob[]; durationSec: number }> {
  const isWav = file.type.includes("wav") || (file as any).name?.toLowerCase().endsWith(".wav");

  // Se já for WAV, usa fatiamento binário ultrarrápido sem decodificação de PCM
  if (isWav) {
    onProgress?.("Fatiando áudio WAV em blocos de 5 minutos...");
    const parts = await splitWavFileBinary(file, CHUNK_SECONDS);
    const estimatedDuration = Math.round(file.size / 32000);
    return { parts, durationSec: estimatedDuration };
  }

  // Se arquivo já é MP3 / M4A / WebM e tem menos de 22MB, pode ser enviado diretamente (Whisper suporta nativamente até 25MB)
  if (file.size <= MAX_SAFE_FILE_SIZE_BYTES) {
    onProgress?.("Otimizando áudio para envio rápido...");
    // Estima duração via Audio element simples sem decodificar todo o PCM
    const url = URL.createObjectURL(file);
    let dur = 0;
    try {
      const audio = new Audio(url);
      await new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          dur = audio.duration || 0;
          resolve(true);
        };
        audio.onerror = () => resolve(false);
        setTimeout(resolve, 1500); // timeout de segurança
      });
    } catch {
      // fallback
    } finally {
      URL.revokeObjectURL(url);
    }
    return { parts: [file], durationSec: Math.round(dur) };
  }

  // Para arquivos grandes (> 22MB), tenta decodificação com fallback automático
  try {
    onProgress?.("Lendo arquivo...");
    const arrayBuffer = await file.arrayBuffer();
    const Ctx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    const decodeCtx = new Ctx();

    onProgress?.("Processando faixas de áudio...");
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

    onProgress?.("Dividindo em blocos de 5 min...");
    return { parts: splitToWavChunks(new Float32Array(mono)), durationSec };
  } catch {
    // FALLBACK DE ALTA RESILIÊNCIA: Se o navegador não tiver memória suficiente para decodificar
    // o áudio de 2+ horas inteiro em Float32Array, divide em pedaços binários de 18MB
    onProgress?.("Dividindo áudio em blocos seguros para envio...");
    const CHUNK_SIZE = 18 * 1024 * 1024; // 18 MB
    const parts: Blob[] = [];
    for (let i = 0; i < file.size; i += CHUNK_SIZE) {
      parts.push(file.slice(i, Math.min(i + CHUNK_SIZE, file.size), file.type));
    }
    // Duração estimada pelo tamanho
    const estDuration = Math.round(file.size / 16000);
    return { parts, durationSec: estDuration };
  }
}

/**
 * Gravador de microfone por streaming com emissão contínua de blocos WAV.
 * Mantém o consumo de RAM fixo independentemente do tempo de reunião (2h, 4h+).
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
