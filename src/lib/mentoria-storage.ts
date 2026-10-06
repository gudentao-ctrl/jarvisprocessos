import { supabase } from "@/integrations/supabase/client";
import type { Mentorado, MentoriaSessao, MentoriaDiagnostico, MentoriaAcao } from "./mentoria-types";

const LOCAL_STORAGE_MENTORADOS_KEY = "maia_hub_pessoas_mentorados_v1";
const LOCAL_STORAGE_SESSOES_KEY = "maia_hub_pessoas_mentoria_sessoes_v1";

export const INITIAL_MOCK_MENTORADOS: Mentorado[] = [
  {
    id: "mentorado-demo-1",
    company_id: null,
    candidate_id: "demo-cand-1",
    nome: "Mariana Souza",
    cargo: "Gerente de Operações",
    idade: 34,
    formacao: "Engenharia de Produção c/ MBA em Gestão Estratégica",
    telefone: "(11) 98765-4321",
    email: "mariana.souza@empresa.com.br",
    status: "ativa",
    behavioral_profile: {
      dominant_factor: "Conscienciosidade",
      candidate_id: "demo-cand-1",
      radar: [
        { factor: "A", name: "Abertura à Experiência", value: 85 },
        { factor: "C", name: "Conscienciosidade", value: 88 },
        { factor: "E", name: "Extroversão", value: 78 },
        { factor: "M", name: "Amabilidade", value: 72 },
        { factor: "N", name: "Estabilidade Emocional", value: 82 },
      ],
      ai_summary: {
        natural: "Perfil executivo de alta performance com forte equilíbrio entre Conscienciosidade (88%) e Abertura (85%).",
        strengths: "Liderança transformadora, planejamento minucioso e capacidade de alinhar equipes multidisciplinares.",
        ideal_env: "Gestão estratégica, autonomia para estruturação de fluxos operacionais e metas claras.",
        blind_spots: "Risco de elevar excessivamente a cobrança sobre o ritmo da equipe em entregas sob pressão.",
      },
    },
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mentorado-demo-2",
    company_id: null,
    candidate_id: "demo-cand-2",
    nome: "Lucas Ribeiro",
    cargo: "Analista de Processos Sênior",
    idade: 29,
    formacao: "Administração de Empresas c/ Especialização em BPM",
    telefone: "(11) 97654-3210",
    email: "lucas.ribeiro@empresa.com.br",
    status: "ativa",
    behavioral_profile: {
      dominant_factor: "Conscienciosidade",
      candidate_id: "demo-cand-2",
      radar: [
        { factor: "A", name: "Abertura à Experiência", value: 75 },
        { factor: "C", name: "Conscienciosidade", value: 92 },
        { factor: "E", name: "Extroversão", value: 52 },
        { factor: "M", name: "Amabilidade", value: 80 },
        { factor: "N", name: "Estabilidade Emocional", value: 85 },
      ],
      ai_summary: {
        natural: "Perfil analítico e meticuloso, com foco estrito em conformidade e qualidade de dados.",
        strengths: "Atenção a normas, rigor metodológico e capacidade de auditoria técnica minuciosa.",
        ideal_env: "Ambientes estruturados com metodologia clara e processos consolidados.",
        blind_spots: "Pode gastar tempo excessivo refinando detalhes secundários antes de expor soluções.",
      },
    },
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mentorado-demo-3",
    company_id: null,
    candidate_id: null,
    nome: "Fernanda Albuquerque",
    cargo: "Coordenadora de Vendas",
    idade: 37,
    formacao: "Marketing e Comunicação",
    telefone: "(11) 99123-4567",
    email: "fernanda.albuquerque@empresa.com.br",
    status: "inativa",
    parecer_final: "Ciclo de mentoria de 6 meses finalizado com pleno atingimento das metas de liderança de equipe comercial, estruturação do playbook de vendas e consolidação da rotina de feedbacks quinzenais.",
    finalizada_em: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 180).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const INITIAL_MOCK_SESSOES: MentoriaSessao[] = [
  {
    id: "sessao-demo-1",
    mentoria_id: "mentorado-demo-1",
    data_atendimento: new Date(Date.now() - 86400000 * 25).toISOString().slice(0, 10),
    horas: 1.5,
    resumo: "Sessão de alinhamento de expectativas e diagnóstico inicial. Discussão sobre desafios de transição para cargo executivo e gestão de conflitos na equipe operacional.",
    acoes: [
      { id: "ac-1", texto: "Mapear principais gargalos operacionais apontados pelos líderes de turno", concluida: true, prazo: "2026-09-15" },
      { id: "ac-2", texto: "Instituir reunião semanal de 30 min de priorização com coordenadores", concluida: true, prazo: "2026-09-20" },
    ],
    pontos_atencao: "Tendência a centralizar a tomada de decisão técnica em momentos de urgência.",
    pontos_informe: "Equipe reportou excelente clareza após a primeira rodada de alinhamentos.",
    diagnostico: {
      abertura_processo: 4,
      autoconhecimento: 3,
      autoconfianca: 4,
      nivel_estresse: 3,
      engajamento: 4,
      ansiedade: 3,
      aplicacao_aprendizados: 4,
      media_nota: 3.6,
    },
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "sessao-demo-2",
    mentoria_id: "mentorado-demo-1",
    data_atendimento: new Date(Date.now() - 86400000 * 15).toISOString().slice(0, 10),
    horas: 1.5,
    resumo: "Revisão dos fluxos de delegação e feedback estruturado. Aplicação do modelo de liderança situacional.",
    acoes: [
      { id: "ac-3", texto: "Elaborar matriz de competências dos 4 supervisores diretos", concluida: true, prazo: "2026-09-28" },
      { id: "ac-4", texto: "Delegar acompanhamento diário do indicador de refugo ao supervisor júnior", concluida: false, prazo: "2026-10-10" },
    ],
    pontos_atencao: "Acompanhar nível de ansiedade no fechamento mensal.",
    pontos_informe: "Supervisores demonstraram maior proatividade nas reuniões.",
    diagnostico: {
      abertura_processo: 5,
      autoconhecimento: 4,
      autoconfianca: 4,
      nivel_estresse: 2,
      engajamento: 5,
      ansiedade: 2,
      aplicacao_aprendizados: 4,
      media_nota: 3.7,
    },
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "sessao-demo-3",
    mentoria_id: "mentorado-demo-1",
    data_atendimento: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    horas: 2.0,
    resumo: "Avaliação do avanço da maturidade da equipe e construção do plano trimestral de melhoria contínua.",
    acoes: [
      { id: "ac-5", texto: "Apresentar plano de redução de paradas para a diretoria", concluida: false, prazo: "2026-10-25" },
      { id: "ac-6", texto: "Manter rotina de 1-on-1 quinzenal com os supervisores", concluida: true, prazo: "2026-10-30" },
    ],
    pontos_atencao: "Continuar monitorando equilíbrio de carga horária para evitar picos de sobrecarga.",
    pontos_informe: "Mentora com postura de comando serena e visão de longo prazo consolidada.",
    diagnostico: {
      abertura_processo: 5,
      autoconhecimento: 5,
      autoconfianca: 5,
      nivel_estresse: 2,
      engajamento: 5,
      ansiedade: 1,
      aplicacao_aprendizados: 5,
      media_nota: 4.0,
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "sessao-demo-4",
    mentoria_id: "mentorado-demo-2",
    data_atendimento: new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 10),
    horas: 1.0,
    resumo: "Sessão focada em comunicação executiva e simplificação de relatórios técnicos para a diretoria.",
    acoes: [
      { id: "ac-7", texto: "Criar sumário executivo de 1 página para os mapeamentos BPM", concluida: true, prazo: "2026-09-30" },
    ],
    pontos_atencao: "Evitar jargões técnicos excessivos nas apresentações para áreas de negócio.",
    pontos_informe: "Excelente receptividade aos feedbacks de comunicação.",
    diagnostico: {
      abertura_processo: 4,
      autoconhecimento: 4,
      autoconfianca: 3,
      nivel_estresse: 2,
      engajamento: 4,
      ansiedade: 2,
      aplicacao_aprendizados: 4,
      media_nota: 3.3,
    },
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "sessao-demo-5",
    mentoria_id: "mentorado-demo-3",
    data_atendimento: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    horas: 1.5,
    resumo: "Sessão final de encerramento do ciclo de mentoria de liderança comercial. Consolidação dos resultados e autoavaliação.",
    acoes: [
      { id: "ac-8", texto: "Playbook de vendas concluído e distribuído para o time", concluida: true, prazo: "2026-09-25" },
    ],
    pontos_atencao: "Meta atingida em sua totalidade.",
    pontos_informe: "Aumento de 24% na conversão da equipe sob nova coordenação.",
    diagnostico: {
      abertura_processo: 5,
      autoconhecimento: 5,
      autoconfianca: 5,
      nivel_estresse: 1,
      engajamento: 5,
      ansiedade: 1,
      aplicacao_aprendizados: 5,
      media_nota: 4.6,
    },
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

// Helper para ler do localStorage
function getLocalMentorados(): Mentorado[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MENTORADOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_MOCK_MENTORADOS;
}

function saveLocalMentorados(list: Mentorado[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MENTORADOS_KEY, JSON.stringify(list));
  } catch {}
}

function getLocalSessoes(): MentoriaSessao[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSOES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_MOCK_SESSOES;
}

function saveLocalSessoes(list: MentoriaSessao[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SESSOES_KEY, JSON.stringify(list));
  } catch {}
}

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
  let mentorados: Mentorado[] = [];
  let sessoes: MentoriaSessao[] = [];

  try {
    const db = supabase as any;
    // Tenta carregar do Supabase se a tabela existir
    const { data: dbMentorados, error: errM } = await db
      .from("mentorias")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: dbSessoes, error: errS } = await db
      .from("mentoria_sessoes")
      .select("*")
      .order("data_atendimento", { ascending: true });

    if (!errM && Array.isArray(dbMentorados) && dbMentorados.length > 0) {
      mentorados = dbMentorados;
    } else {
      mentorados = getLocalMentorados();
    }

    if (!errS && Array.isArray(dbSessoes) && dbSessoes.length > 0) {
      sessoes = dbSessoes;
    } else {
      sessoes = getLocalSessoes();
    }
  } catch (err) {
    mentorados = getLocalMentorados();
    sessoes = getLocalSessoes();
  }

  // Filtro por empresa se aplicável
  if (companyId) {
    mentorados = mentorados.filter((m) => m.company_id === companyId || !m.company_id);
  }

  return mentorados.map((m) => enrichMentoradoKPIs(m, sessoes));
}

/**
 * Busca mentorado individual por ID
 */
export async function getMentoradoById(id: string): Promise<Mentorado | null> {
  const list = await getMentoradosList();
  return list.find((m) => m.id === id) || null;
}

/**
 * Cria novo mentorado
 */
export async function createMentorado(
  payload: Omit<Mentorado, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<Mentorado> {
  const newId = payload.id || `mentorado-${Date.now()}`;
  const now = new Date().toISOString();
  const mentorado: Mentorado = {
    ...payload,
    id: newId,
    status: payload.status || "ativa",
    created_at: now,
    updated_at: now,
  };

  // Salva no Supabase se disponível
  try {
    const db = supabase as any;
    await db.from("mentorias").insert([
      {
        id: mentorado.id,
        company_id: mentorado.company_id || null,
        candidate_id: mentorado.candidate_id || null,
        nome: mentorado.nome,
        cargo: mentorado.cargo,
        idade: mentorado.idade,
        formacao: mentorado.formacao,
        telefone: mentorado.telefone,
        email: mentorado.email,
        status: mentorado.status,
        behavioral_profile: mentorado.behavioral_profile || {},
        created_at: mentorado.created_at,
        updated_at: mentorado.updated_at,
      },
    ]);
  } catch {}

  // Salva no local
  const current = getLocalMentorados();
  saveLocalMentorados([mentorado, ...current]);

  return enrichMentoradoKPIs(mentorado, getLocalSessoes());
}

/**
 * Atualiza dados do mentorado
 */
export async function updateMentorado(id: string, updates: Partial<Mentorado>): Promise<Mentorado | null> {
  const now = new Date().toISOString();
  try {
    const db = supabase as any;
    await db.from("mentorias").update({ ...updates, updated_at: now }).eq("id", id);
  } catch {}

  const current = getLocalMentorados();
  const idx = current.findIndex((m) => m.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updates, updated_at: now };
    saveLocalMentorados(current);
    return enrichMentoradoKPIs(current[idx], getLocalSessoes());
  }
  return null;
}

/**
 * Salva ou atualiza sessão de atendimento
 */
export async function saveMentoriaSessao(
  payload: Omit<MentoriaSessao, "id" | "created_at"> & { id?: string },
): Promise<MentoriaSessao> {
  const isNew = !payload.id;
  const newId = payload.id || `sessao-${Date.now()}`;
  const now = new Date().toISOString();

  const sessao: MentoriaSessao = {
    ...payload,
    id: newId,
    created_at: isNew ? now : (payload as any).created_at || now,
    updated_at: now,
  };

  try {
    const db = supabase as any;
    if (isNew) {
      await db.from("mentoria_sessoes").insert([sessao]);
    } else {
      await db.from("mentoria_sessoes").update(sessao).eq("id", sessao.id);
    }
  } catch {}

  const sessoes = getLocalSessoes();
  const idx = sessoes.findIndex((s) => s.id === sessao.id);
  if (idx >= 0) {
    sessoes[idx] = sessao;
  } else {
    sessoes.push(sessao);
  }
  saveLocalSessoes(sessoes);

  return sessao;
}

/**
 * Exclui sessão de atendimento
 */
export async function deleteMentoriaSessao(id: string): Promise<boolean> {
  try {
    const db = supabase as any;
    await db.from("mentoria_sessoes").delete().eq("id", id);
  } catch {}

  const sessoes = getLocalSessoes().filter((s) => s.id !== id);
  saveLocalSessoes(sessoes);
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
 * Calcula a média das notas do diagnóstico
 */
export function calculateDiagnosticoMedia(diag: Omit<MentoriaDiagnostico, "media_nota">): number {
  const values = [
    Number(diag.abertura_processo || 0),
    Number(diag.autoconhecimento || 0),
    Number(diag.autoconfianca || 0),
    Number(diag.nivel_estresse || 0),
    Number(diag.engajamento || 0),
    Number(diag.ansiedade || 0),
    Number(diag.aplicacao_aprendizados || 0),
  ];
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
