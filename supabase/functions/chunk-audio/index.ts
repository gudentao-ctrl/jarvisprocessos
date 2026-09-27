// Supabase Edge Function: chunk-audio
// Fatiamento programático de áudios longos (acima de 2 horas) em blocos de até 5 minutos
// para garantir alta disponibilidade e processamento contínuo no Whisper.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK_SECONDS = 300; // 5 minutos por bloco

/**
 * Divide um buffer WAV em múltiplos blobs WAV de até chunkSeconds cada.
 * Opera diretamente nos bytes do PCM sem decodificar em floating-point,
 * consumindo quase zero memória RAM mesmo para gravações de 2+ horas.
 */
function splitWavBuffer(buffer: Uint8Array, chunkSeconds = CHUNK_SECONDS): Uint8Array[] {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Validação básica do cabeçalho RIFF WAV
  const isRiff =
    String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]) === "RIFF";
  const isWave =
    String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]) === "WAVE";

  if (!isRiff || !isWave) {
    // Se não for WAV padrão, divide por tamanho de bloco seguro (<= 20 MB)
    const MAX_CHUNK_BYTES = 20 * 1024 * 1024;
    const parts: Uint8Array[] = [];
    for (let i = 0; i < buffer.byteLength; i += MAX_CHUNK_BYTES) {
      parts.push(buffer.subarray(i, Math.min(i + MAX_CHUNK_BYTES, buffer.byteLength)));
    }
    return parts;
  }

  // Leitura dos parâmetros de áudio no subchunk 'fmt '
  let offset = 12;
  let byteRate = 32000; // fallback padrão (16kHz 16-bit mono)
  let dataOffset = 44;
  let dataLength = buffer.byteLength - 44;

  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      buffer[offset],
      buffer[offset + 1],
      buffer[offset + 2],
      buffer[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      byteRate = view.getUint32(offset + 16, true);
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataLength = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  const chunkByteSize = chunkSeconds * byteRate;
  const parts: Uint8Array[] = [];

  for (let pos = 0; pos < dataLength; pos += chunkByteSize) {
    const curSize = Math.min(chunkByteSize, dataLength - pos);
    const partBuffer = new Uint8Array(44 + curSize);
    const partView = new DataView(partBuffer.buffer);

    // Copia os 44 bytes de cabeçalho base
    partBuffer.set(buffer.subarray(0, 44), 0);

    // Ajusta o tamanho total do RIFF (36 + data size)
    partView.setUint32(4, 36 + curSize, true);

    // Ajusta o tamanho do subchunk 'data'
    partView.setUint32(40, curSize, true);

    // Copia o bloco de amostras PCM
    partBuffer.set(buffer.subarray(dataOffset + pos, dataOffset + pos + curSize), 44);

    parts.push(partBuffer);
  }

  return parts.length ? parts : [buffer];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { storage_path, interview_id, chunk_duration_sec = CHUNK_SECONDS } = await req.json();

    if (!storage_path) {
      return new Response(JSON.stringify({ error: "storage_path obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baixa o áudio mestre do storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from("interview-audio")
      .download(storage_path);

    if (dlErr || !blob) {
      return new Response(JSON.stringify({ error: "Falha ao baixar áudio mestre: " + dlErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const rawBytes = new Uint8Array(arrayBuffer);

    // Se arquivo tem menos de 20 MB e não requer fatiamento forçado, mantém único
    const MAX_SINGLE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (rawBytes.byteLength <= MAX_SINGLE_SIZE && !storage_path.endsWith(".wav")) {
      return new Response(
        JSON.stringify({
          success: true,
          parts: [storage_path],
          total_chunks: 1,
          message: "Arquivo dentro do limite de 20 MB, fatiamento não necessário.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fatiamento programático em blocos de até 5 minutos
    const chunks = splitWavBuffer(rawBytes, chunk_duration_sec);
    const folder = storage_path.includes("/") ? storage_path.split("/")[0] : crypto.randomUUID();
    const isWav = storage_path.endsWith(".wav") || blob.type === "audio/wav";
    const ext = isWav ? "wav" : storage_path.split(".").pop() || "mp3";
    const contentType = isWav ? "audio/wav" : blob.type || "audio/mpeg";

    const partPaths: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const partPath = `${folder}/part-${String(i).padStart(3, "0")}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("interview-audio")
        .upload(partPath, chunks[i], {
          contentType,
          upsert: true,
        });

      if (upErr) {
        throw new Error(`Falha ao salvar bloco ${i + 1}: ${upErr.message}`);
      }
      partPaths.push(partPath);
    }

    // Se informado interview_id, atualiza a entrevista com a lista de partes
    if (interview_id) {
      await supabase
        .from("interviews")
        .update({ audio_parts: partPaths })
        .eq("id", interview_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        parts: partPaths,
        total_chunks: partPaths.length,
        chunk_duration_sec,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno no fatiamento" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
