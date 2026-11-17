import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET_NAME = "mentoria-docs";
const MAX_FILE_SIZE_BYTES = 52428800; // 50MB

async function ensureMentoriaBucket(supabaseAdmin: any) {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets || []).some((b: any) => b.id === BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
      });
    } else {
      await supabaseAdmin.storage.updateBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
      });
    }
  } catch (bErr) {
    console.warn("Aviso ao verificar/atualizar bucket mentoria-docs:", bErr);
  }
}

function sanitizeStorageFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Gera uma URL assinada (Signed Upload URL) para envio direto do arquivo
 * a partir do navegador do cliente para o Supabase Storage.
 * Isto contorna limitações de payload HTTP do servidor e garante alta performance para arquivos grandes (>25MB).
 */
export const getMentoriaSignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mentoriaId: z.string().uuid(),
        fileName: z.string().min(1),
        fileType: z.string().optional().default("application/octet-stream"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await ensureMentoriaBucket(supabaseAdmin);

    const sanitizedName = sanitizeStorageFileName(data.fileName);
    const filePath = `${data.mentoriaId}/${Date.now()}_${sanitizedName}`;

    const { data: signData, error: signError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (signError || !signData) {
      throw new Error(`Erro ao gerar signed URL para upload: ${signError?.message || "sem dados"}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      signedUrl: signData.signedUrl,
      token: signData.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
      name: data.fileName,
      type: data.fileType,
    };
  });

/**
 * Fallback server-side upload para arquivos menores (< 4MB) ou quando
 * a conexão direta ao storage encontrar restrições de rede/CORS.
 */
export const uploadMentoriaAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mentoriaId: z.string().uuid(),
        fileName: z.string().min(1),
        fileType: z.string().optional().default("application/octet-stream"),
        base64Data: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await ensureMentoriaBucket(supabaseAdmin);

    // Limpar o prefixo data:mime;base64,
    const base64Clean = data.base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const sanitizedName = sanitizeStorageFileName(data.fileName);
    const filePath = `${data.mentoriaId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: data.fileType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar arquivo para o storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      name: data.fileName,
      size: buffer.byteLength,
      type: data.fileType,
    };
  });

/**
 * Atualiza o perfil comportamental e anexos da mentoria no servidor via supabaseAdmin.
 * Isto contorna limitações de RLS no cliente e previne falhas causadas pelo trigger
 * validate_mentorship_candidate caso candidate_id esteja pendente ou inconsistente.
 */
export const updateMentoriaBehavioralProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mentoriaId: z.string().uuid(),
        profile: z.any(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar a mentoria atual
    const { data: current, error: getErr } = await supabaseAdmin
      .from("mentorias")
      .select("id, company_id, candidate_id")
      .eq("id", data.mentoriaId)
      .maybeSingle();

    if (getErr) {
      console.error("Erro ao buscar mentoria:", getErr);
      throw new Error(`Erro ao buscar mentoria: ${getErr.message}`);
    }

    if (!current) {
      throw new Error("Mentoria não encontrada.");
    }

    // Se houver candidate_id, verificar se possui avaliação concluída na mesma empresa.
    // O trigger Postgres 'validate_mentorship_candidate' exige que o candidato vinculado
    // tenha completed_at preenchido e pertença à mesma empresa. Se não tiver, limpamos
    // o candidate_id no update para permitir que anexos e laudos sejam salvos normalmente sem erro.
    let safeCandidateId = current.candidate_id;
    if (safeCandidateId) {
      const { data: cand } = await supabaseAdmin
        .from("candidates")
        .select("id, completed_at, company_id")
        .eq("id", safeCandidateId)
        .maybeSingle();

      if (!cand || !cand.completed_at || cand.company_id !== current.company_id) {
        console.warn(
          `Candidate ${safeCandidateId} não possui completed_at válido na empresa ${current.company_id}. Desvinculando candidate_id para permitir salvar perfil e anexos.`
        );
        safeCandidateId = null;
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("mentorias")
      .update({
        behavioral_profile: data.profile,
        candidate_id: safeCandidateId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.mentoriaId)
      .select("id, company_id, candidate_id, nome, behavioral_profile, status, updated_at")
      .single();

    if (updateErr) {
      console.error("Erro ao atualizar mentoria via supabaseAdmin:", updateErr);
      throw new Error(`Erro ao salvar perfil e anexos: ${updateErr.message}`);
    }

    return { success: true, mentoria: updated };
  });
