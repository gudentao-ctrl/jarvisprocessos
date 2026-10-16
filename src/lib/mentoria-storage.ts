import { supabase } from "@/integrations/supabase/client";
import type { Mentorado, MentoriaSessao, MentoriaDiagnostico, MentoriaAcao } from "./mentoria-types";

/**
 * Calcula os Big Numbers e KPIs do Mentorado
 */
export function enrichMentoradoKPIs(mentorado: Mentorado, sessoes: MentoriaSessao[]): Mentorado {
  const mSessoes = sessoes
    .filter((s) => s.mentoria_id === mentorado.id)
    .sort((a, b) => new Date(a.data_atendimento).getTime() - new Date(b.data_atendimento).getTime());

  const totalAtendimentos = mSessoes.length;
  const totalHoras = mSessoes.reduce((acc, s) => acc + Number(s.horas || 0), 0);

  let totalAcoes = 0;
  let acoesConcluidas = 0;
  mSessoes.forEach((s) => {
    (s.acoes || []).forEach((ac) => {
      totalAcoes++;
      if (ac.concluida) acoesConcluidas++;
    });
  });

  const sparklineNotas = mSessoes.map((s) => Number(s.diagnostico?.media_nota || 0));
  const somaNotas = sparklineNotas.reduce((acc, n) => acc + n, 0);
  const mediaAvanco = sparklineNotas.length > 0 ? Math.round((somaNotas / sparklineNotas.length) * 10) / 10 : 0;

  return {
    ...mentorado,
    sessoes: mSessoes,
    totalAtendimentos,
    totalHoras: Math.round(totalHoras * 10) / 10,
    totalAcoes,
    acoesConcluidas,
    mediaAvanco,
    sparklineNotas: sparklineNotas.length > 0 ? sparklineNotas : [0],
  };
}

/**
 * Lista todos os mentorados com seus KPIs calculados
 */
export async function getMentoradosList(companyId?: string | null): Promise<Mentorado[]> {
  let query = supabase.from("mentorias").select("*, sessoes:mentoria_sessoes(*)").order("created_at", { ascending: false });
  if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as mentorias.");
  return (data || []).map((row) => enrichMentoradoKPIs(row as unknown as Mentorado, row.sessoes as unknown as MentoriaSessao[]));
}
export async function getMentoradoById(id: string): Promise<Mentorado | null> {
  const { data, error } = await supabase.from("mentorias").select("*, sessoes:mentoria_sessoes(*)").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar a mentoria.");
  return data ? enrichMentoradoKPIs(data as unknown as Mentorado, data.sessoes as unknown as MentoriaSessao[]) : null;
}
function mentorFields(payload: Partial<Mentorado>) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => ["company_id","candidate_id","nome","cargo","idade","formacao","telefone","email","status","behavioral_profile","parecer_final","relatorio_final_url","finalizada_em"].includes(key)));
}
export async function createMentorado(payload: Omit<Mentorado, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<Mentorado> {
  if (!payload.company_id) throw new Error("Selecione a empresa da mentoria.");
  const { data, error } = await supabase.from("mentorias").insert({ ...mentorFields(payload), company_id: payload.company_id, nome: payload.nome } as any).select("id").single();
  if (error || !data) throw new Error("Não foi possível cadastrar a mentoria. Verifique a empresa e a avaliação vinculada.");
  const row = await getMentoradoById(data.id);
  if (!row) throw new Error("Mentoria salva, mas não disponível para leitura.");
  return row;
}
export async function updateMentorado(id: string, updates: Partial<Mentorado>): Promise<Mentorado | null> {
  const { data, error } = await supabase.from("mentorias").update({ ...mentorFields(updates), updated_at: new Date().toISOString() }).eq("id", id).select("id").single();
  if (error || !data) throw new Error("Não foi possível atualizar a mentoria.");
  return getMentoradoById(id);
}
export async function saveMentoriaSessao(payload: Omit<MentoriaSessao, "id" | "created_at"> & { id?: string }): Promise<MentoriaSessao> {
  const { id, ...fields } = payload;
  const request = id ? supabase.from("mentoria_sessoes").update({ ...fields, updated_at: new Date().toISOString() } as any).eq("id", id) : supabase.from("mentoria_sessoes").insert(fields as any);
  const { data, error } = await request.select().single();
  if (error) throw new Error("Não foi possível salvar o atendimento.");
  return data as unknown as MentoriaSessao;
}
export async function deleteMentoriaSessao(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("mentoria_sessoes").delete().eq("id", id).select("id").single();
  if (error || !data) throw new Error("Não foi possível excluir o atendimento.");
  return true;
}

/**
 * Finaliza mentoria com parecer e gera status inativa
 */
export async function finalizarMentoria(
  id: string,
  parecerFinal: string,
  relatorioUrl?: string,
): Promise<Mentorado | null> {
  const updates: Partial<Mentorado> = {
    status: "inativa",
    parecer_final: parecerFinal,
    relatorio_final_url: relatorioUrl,
    finalizada_em: new Date().toISOString(),
  };
  return updateMentorado(id, updates);
}

/**
 * Reabre uma mentoria inativa
 */
export async function reabrirMentoria(id: string): Promise<Mentorado | null> {
  const updates: Partial<Mentorado> = {
    status: "ativa",
  };
  return updateMentorado(id, updates);
}

/**
 * Calcula a média das notas do diagnóstico (6 pilares oficiais, escala 1 a 5)
 */
export function calculateDiagnosticoMedia(diag: any): number {
  if (!diag) return 0;
  const values = [
    Number(diag.abertura_processo || 0),
    Number(diag.engajamento_processo ?? diag.engajamento ?? 0),
    Number(diag.autoconhecimento || 0),
    Number(diag.equilibrio_emocional ?? diag.nivel_estresse ?? 0),
    Number(diag.autoconfianca || 0),
    Number(diag.aplicacao_aprendizados || 0),
  ].filter((v) => v > 0);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
