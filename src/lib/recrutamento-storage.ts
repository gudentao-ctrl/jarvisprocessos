// src/lib/recrutamento-storage.ts
// Persistência protegida por empresa e ação; nunca usar dados locais ou de demonstração.

import { supabase } from "@/integrations/supabase/client";
import {
  Vaga,
  RecrutamentoCandidato,
  CandidaturaFunil,
  EtapaKanban,
  CandidatoMatchVaga,
} from "./recrutamento-types";

// -------------------------------------------------------------
// MATCH AUTOMÁTICO DE VAGAS PARA O CANDIDATO
// -------------------------------------------------------------
export function calcularMatchVagas(
  candidato: Partial<RecrutamentoCandidato>,
  vagas: Vaga[],
): CandidatoMatchVaga[] {
  if (!vagas || vagas.length === 0) return [];

  const candFerramentas = (candidato.ferramentas || []).map((f) => f.toLowerCase().trim());
  const candExp = (candidato.experiencias || "").toLowerCase();
  const candForm = (candidato.formacao || "").toLowerCase();

  return vagas
    .map((vaga) => {
      let score = 30; // Pontuação base por interesse
      const motivos: string[] = [];

      // 1. Aderência por ferramentas requeridas (até +45 pts)
      const reqFerramentas = vaga.ferramentas_obrigatorias || [];
      if (reqFerramentas.length > 0) {
        let hits = 0;
        reqFerramentas.forEach((rf) => {
          const rfClean = rf.toLowerCase().trim();
          if (candFerramentas.some((cf) => cf.includes(rfClean) || rfClean.includes(cf))) {
            hits++;
          }
        });
        const pctHits = hits / reqFerramentas.length;
        score += Math.round(pctHits * 45);
        if (hits > 0) {
          motivos.push(`Domina ${hits} de ${reqFerramentas.length} ferramentas da vaga.`);
        }
      } else {
        score += 20;
      }

      // 2. Aderência por título do cargo ou área (até +20 pts)
      const titulos = vaga.titulo.toLowerCase().split(/\s+/);
      let matchTitulo = false;
      titulos.forEach((word) => {
        if (word.length > 3 && (candExp.includes(word) || candForm.includes(word))) {
          matchTitulo = true;
        }
      });
      if (matchTitulo) {
        score += 20;
        motivos.push("Experiência ou formação com palavras-chave aderentes ao cargo.");
      }

      // 3. Pretensão salarial dentro da faixa (até +15 pts)
      if (candidato.pretensao_salarial && vaga.salario_max > 0) {
        if (candidato.pretensao_salarial <= vaga.salario_max * 1.1) {
          score += 15;
          motivos.push("Pretensão salarial compatível com o budget da vaga.");
        }
      }

      const finalScore = Math.min(100, Math.max(15, score));
      return { vaga, score: finalScore, motivos };
    })
    .sort((a, b) => b.score - a.score);
}

// -------------------------------------------------------------
// VAGAS CRUD
// -------------------------------------------------------------
export async function getVagasList(companyId?: string | null): Promise<Vaga[]> {
  let query = supabase.from("vagas").select("*").order("created_at", { ascending: false });
  if (companyId) query = query.eq("empresa_id", companyId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as vagas.");
  return (data || []) as Vaga[];
}

export async function getVagaById(id: string): Promise<Vaga | null> {
  const { data, error } = await supabase.from("vagas").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar a vaga.");
  return data as Vaga | null;
}

export async function createVaga(payload: Partial<Vaga>): Promise<Vaga> {
  if (!payload.empresa_id) throw new Error("Selecione a empresa da vaga.");
  const { id: _id, ...fields } = payload;
  const { data, error } = await supabase.from("vagas").insert({ ...fields, titulo: payload.titulo || "Nova vaga", empresa_id: payload.empresa_id }).select().single();
  if (error) throw new Error("Não foi possível salvar a vaga. Verifique suas permissões.");
  return data as Vaga;
}

export async function updateVaga(id: string, updates: Partial<Vaga>): Promise<Vaga> {
  const { id: _id, ...fields } = updates;
  const { data, error } = await supabase.from("vagas").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw new Error("Não foi possível atualizar a vaga.");
  return data as Vaga;
}

export async function getCandidatosList(): Promise<RecrutamentoCandidato[]> {
  const { data, error } = await supabase.from("recrutamento_candidatos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os candidatos.");
  return (data || []) as RecrutamentoCandidato[];
}

export async function createCandidato(candData: Partial<RecrutamentoCandidato>, targetVagaId?: string): Promise<{ candidato: RecrutamentoCandidato; candidatura?: CandidaturaFunil }> {
  if (!targetVagaId) throw new Error("Selecione a vaga e sua empresa.");
  const { data, error } = await supabase.rpc("create_recruitment_candidate", { _candidate: candData as any, _vaga_id: targetVagaId });
  if (error) throw new Error("Não foi possível cadastrar o candidato nesta vaga.");
  return data as unknown as { candidato: RecrutamentoCandidato; candidatura: CandidaturaFunil };
}

export async function getCandidaturasFunil(vagaId?: string | null, companyId?: string | null): Promise<CandidaturaFunil[]> {
  let query = supabase.from("candidaturas_funil").select("*, candidato:recrutamento_candidatos(*), vaga:vagas(*)");
  if (vagaId && vagaId !== "todas") query = query.eq("vaga_id", vagaId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as candidaturas.");
  return (data || []).filter((row) => !companyId || row.vaga?.empresa_id === companyId).map((row) => ({ ...row, matchScore: row.candidato && row.vaga ? calcularMatchVagas(row.candidato as RecrutamentoCandidato, [row.vaga as Vaga])[0]?.score : undefined })) as unknown as CandidaturaFunil[];
}

async function readApplication(id: string): Promise<CandidaturaFunil> {
  const { data, error } = await supabase.from("candidaturas_funil").select("*").eq("id", id).single();
  if (error) throw new Error("Candidatura não encontrada ou sem acesso.");
  return data as unknown as CandidaturaFunil;
}
async function updateApplication(id: string, fields: Partial<CandidaturaFunil>): Promise<CandidaturaFunil> {
  const { id: _id, candidato: _candidate, vaga: _vaga, matchScore: _score, ...payload } = fields;
  const { data, error } = await supabase.from("candidaturas_funil").update({ ...payload, updated_at: new Date().toISOString() } as any).eq("id", id).select().single();
  if (error) throw new Error("Não foi possível atualizar a candidatura.");
  return data as unknown as CandidaturaFunil;
}
async function candidateStatus(id: string, status: string) {
  const { error } = await supabase.from("recrutamento_candidatos").update({ status_global: status }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar o status do candidato.");
}
export async function avancarEtapaCandidatura(id: string, etapa: EtapaKanban, observacao?: string, extraData?: Partial<CandidaturaFunil>): Promise<CandidaturaFunil> {
  const row = await readApplication(id);
  const updated = await updateApplication(id, { ...extraData, etapa_kanban: etapa, status: etapa === "FINALIZACAO_CONTRATADO" ? "CONTRATADO" : row.status, historico_etapas: [...(row.historico_etapas || []), { etapa, data: new Date().toISOString(), responsavel: "Consultoria", observacao: observacao || `Avançou para ${etapa}` }] });
  if (etapa === "FINALIZACAO_CONTRATADO") await candidateStatus(row.candidato_id, "CONTRATADO");
  return updated;
}
export async function reprovarCandidatura(id: string, motivo: string, observacao?: string): Promise<CandidaturaFunil> {
  const row = await readApplication(id);
  const updated = await updateApplication(id, { etapa_kanban: "BANCO_TALENTOS", status: "REPROVADO", motivo_reprovacao: motivo, historico_etapas: [...(row.historico_etapas || []), { etapa: "BANCO_TALENTOS", data: new Date().toISOString(), responsavel: "Consultoria", observacao: observacao || motivo }] });
  await candidateStatus(row.candidato_id, "BANCO_TALENTOS");
  return updated;
}
export async function marcarDevolutivaEnviada(id: string, _meio: "whatsapp" | "email"): Promise<CandidaturaFunil> {
  return updateApplication(id, { devolutiva_enviada: true, data_devolutiva: new Date().toISOString() });
}
export async function getBancoTalentos(search?: string): Promise<RecrutamentoCandidato[]> {
  const [candidates, applications] = await Promise.all([getCandidatosList(), getCandidaturasFunil()]);
  return candidates.filter((candidate) => candidate.status_global === "BANCO_TALENTOS" || applications.filter((a) => a.candidato_id === candidate.id).length > 0 && applications.filter((a) => a.candidato_id === candidate.id).every((a) => a.status === "REPROVADO")).filter((candidate) => !search || [candidate.nome, candidate.formacao, candidate.experiencias, ...candidate.ferramentas].some((value) => value?.toLowerCase().includes(search.toLowerCase())));
}
export async function reativarCandidatoDoBanco(candidatoId: string, targetVagaId: string): Promise<CandidaturaFunil> {
  const { data, error } = await supabase.from("candidaturas_funil").insert({ vaga_id: targetVagaId, candidato_id: candidatoId, historico_etapas: [{ etapa: "TRIAGEM", data: new Date().toISOString(), responsavel: "Consultoria", observacao: "Reativado do Banco de Talentos" }] }).select().single();
  if (error) throw new Error("Não foi possível reativar nesta vaga. Confira a empresa e suas permissões.");
  await candidateStatus(candidatoId, "EM_PROCESSO");
  return data as unknown as CandidaturaFunil;
}
