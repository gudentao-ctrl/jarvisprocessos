import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.string().uuid();
const answersSchema = z.record(z.string(), z.number().int().min(1).max(5));
const identitySchema = z.object({
  token: tokenSchema,
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  cpf: z.string().regex(/^\d{11}$/),
  birthDate: z.string().date(),
  consentAccepted: z.literal(true),
});

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function findCandidate(token: string) {
  const admin = await getAdmin();
  let result = await admin.from("candidates").select("*").eq("public_token", token).maybeSingle();
  if (!result.data) result = await admin.from("candidates").select("*").eq("id", token).maybeSingle();
  if (result.error || !result.data) throw new Error("Convite inválido ou expirado");
  return { admin, candidate: result.data as any };
}

function publicCandidate(candidate: any) {
  return {
    id: candidate.id,
    full_name: candidate.full_name,
    email: candidate.email,
    birth_date: candidate.birth_date,
    current_role: candidate.current_role,
    desired_role: candidate.desired_role,
    status: candidate.status,
    started_at: candidate.started_at,
    completed_at: candidate.completed_at,
    answers: candidate.profile_data?.answers ?? {},
  };
}

export const getPublicAssessment = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => publicCandidate((await findCandidate(data.token)).candidate));

export const startPublicAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    const { admin, candidate } = await findCandidate(data.token);
    if (candidate.completed_at) throw new Error("Esta avaliação já foi concluída");
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      full_name: data.fullName,
      email: data.email.toLowerCase(),
      cpf: data.cpf,
      birth_date: data.birthDate,
      consent_version: "2026-10-02",
      privacy_consent_at: candidate.privacy_consent_at ?? now,
      started_at: candidate.started_at ?? now,
      status: "em_teste",
      updated_at: now,
    };
    const { data: row, error } = await admin.from("candidates").update(updates).eq("id", candidate.id).select().single();
    if (error) throw new Error("Não foi possível iniciar a avaliação");
    return publicCandidate(row);
  });

export const savePublicAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema, answers: answersSchema }).parse(input))
  .handler(async ({ data }) => {
    const { admin, candidate } = await findCandidate(data.token);
    if (!candidate.started_at || candidate.completed_at) throw new Error("Avaliação indisponível para alteração");
    const profileData = { ...(candidate.profile_data ?? {}), answers: data.answers };
    const { error } = await admin.from("candidates").update({ profile_data: profileData, updated_at: new Date().toISOString() }).eq("id", candidate.id);
    if (error) throw new Error("Não foi possível salvar o progresso");
    return { ok: true };
  });

export const completePublicAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema, answers: answersSchema, elapsedSeconds: z.number().int().min(60).max(172800) }).parse(input))
  .handler(async ({ data }) => {
    const { admin, candidate } = await findCandidate(data.token);
    if (!candidate.started_at || candidate.completed_at) throw new Error("Avaliação indisponível para conclusão");
    const { bancoQuestoes } = await import("@/data/bancoQuestoes");
    if (Object.keys(data.answers).length !== bancoQuestoes.length) throw new Error("Responda todas as afirmações antes de concluir");
    const { processAssessmentResults } = await import("@/utils/psychometrics");
    const birth = new Date(`${candidate.birth_date}T12:00:00Z`);
    const age = Math.max(0, new Date().getUTCFullYear() - birth.getUTCFullYear());
    const results = processAssessmentResults(data.answers as Record<number, number>, data.elapsedSeconds, {
      id: candidate.id,
      nome: candidate.full_name,
      idade: age,
      cargoPretendido: candidate.desired_role || candidate.current_role || "Não informado",
    });
    const profileData = {
      ...(candidate.profile_data ?? {}),
      psychometrics: results,
      answers: data.answers,
      radar: results.disc.adaptado.map((item) => ({ name: item.nome, value: item.valor, factor: item.fator })),
      dominant_factor: results.disc.estiloLideranca,
    };
    const now = new Date().toISOString();
    const { error } = await admin.from("candidates").update({
      profile_data: profileData,
      ai_summary: { natural: results.parecerConsultor.sinteseQualitativa },
      status: "concluido",
      completed_at: now,
      updated_at: now,
    }).eq("id", candidate.id);
    if (error) throw new Error("Não foi possível concluir a avaliação");
    return { ok: true };
  });