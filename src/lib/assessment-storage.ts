import { supabase } from "@/integrations/supabase/client";

export interface Candidate {
  id: string;
  full_name: string;
  cpf: string;
  birth_date?: string;
  current_role?: string;
  desired_role?: string;
  status: "aguardando" | "em_teste" | "concluido";
  external?: boolean;
  company_id?: string | null;
  company_name?: string | null;
  profile_data?: {
    radar?: Array<{
      name: string;
      factor?: "A" | "C" | "E" | "M" | "N";
      value: number;
      description?: string;
      classification?: string;
    }>;
    dominant_factor?: string;
    answers?: Record<number, number>;
  };
  ai_summary?: {
    natural?: string;
    strengths?: string;
    ideal_env?: string;
    blind_spots?: string;
  };
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = "jarvis_candidates_db_v2";

export const INITIAL_MOCK_CANDIDATES: Candidate[] = [
  {
    id: "demo-cand-1",
    full_name: "Mariana Souza",
    cpf: "12345678901",
    birth_date: "1992-05-14",
    current_role: "Gerente de Operações",
    desired_role: "Diretoria de Operações",
    status: "concluido",
    external: false,
    company_id: null,
    company_name: "Matriz Corporativa",
    profile_data: {
      radar: [
        { name: "Abertura à Experiência", factor: "A", value: 85, description: "Criatividade, flexibilidade mental e capacidade de inovação" },
        { name: "Conscienciosidade", factor: "C", value: 88, description: "Organização, disciplina, foco em metas e rigor metodológico" },
        { name: "Extroversão", factor: "E", value: 78, description: "Sociabilidade, assertividade, liderança e comunicação expressiva" },
        { name: "Amabilidade", factor: "M", value: 72, description: "Empatia, cooperação, confiança e facilidade em mediar consenso" },
        { name: "Estabilidade Emocional", factor: "N", value: 82, description: "Resiliência sob pressão, calma e serenidade em momentos de crise" },
      ],
      dominant_factor: "Conscienciosidade",
    },
    ai_summary: {
      natural: "Perfil executivo de alta performance com forte equilíbrio entre Conscienciosidade (88%) e Abertura à Experiência (85%). Foco contínuo em processos e inovação com disciplina.",
      strengths: "Capacidade de liderança transformadora, planejamento minucioso, visão sistêmica e facilidade de alinhamento com equipes multidisciplinares.",
      ideal_env: "Gestão estratégica, autonomia para reorganização de fluxos e metas claras com acompanhamento de KPIs.",
      blind_spots: "Risco de elevar excessivamente a cobrança sobre o ritmo da equipe em entregas sob pressão.",
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "demo-cand-2",
    full_name: "Lucas Ribeiro",
    cpf: "23456789012",
    birth_date: "1995-10-22",
    current_role: "Analista de Processos Sênior",
    desired_role: "Especialista BPM",
    status: "concluido",
    external: false,
    company_id: null,
    company_name: "Filial Operações",
    profile_data: {
      radar: [
        { name: "Abertura à Experiência", factor: "A", value: 75, description: "Criatividade, flexibilidade mental e capacidade de inovação" },
        { name: "Conscienciosidade", factor: "C", value: 92, description: "Organização, disciplina, foco em metas e rigor metodológico" },
        { name: "Extroversão", factor: "E", value: 52, description: "Sociabilidade, assertividade, liderança e comunicação expressiva" },
        { name: "Amabilidade", factor: "M", value: 80, description: "Empatia, cooperação, confiança e facilidade em mediar consenso" },
        { name: "Estabilidade Emocional", factor: "N", value: 85, description: "Resiliência sob pressão, calma e serenidade em momentos de crise" },
      ],
      dominant_factor: "Conscienciosidade",
    },
    ai_summary: {
      natural: "Perfil predominantemente analítico e meticuloso, com Conscienciosidade excepcional (92%) e alta Estabilidade Emocional (85%).",
      strengths: "Atenção a normas, rigor metodológico, lealdade com prazos e capacidade de auditoria técnica minuciosa.",
      ideal_env: "Ambientes estruturados com metodologia clara, foco em qualidade de dados e respeito a padrões operacionais.",
      blind_spots: "Pode despender excesso de tempo em refinamentos secundários antes de expor soluções parciais para o time.",
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-cand-3",
    full_name: "Camila Fernandes",
    cpf: "34567890123",
    birth_date: "1998-03-30",
    current_role: "Consultora de Negócios",
    desired_role: "Líder de Projetos",
    status: "aguardando",
    external: true,
    company_id: null,
    company_name: "Candidato Externo",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

function getStoredLocalCandidates(): Candidate[] {
  if (typeof window === "undefined") return INITIAL_MOCK_CANDIDATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_CANDIDATES));
      return INITIAL_MOCK_CANDIDATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MOCK_CANDIDATES;
  } catch (err) {
    console.error("Error reading localStorage candidates:", err);
    return INITIAL_MOCK_CANDIDATES;
  }
}

function setStoredLocalCandidates(candidates: Candidate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(candidates));
  } catch (err) {
    console.error("Error writing localStorage candidates:", err);
  }
}

/**
 * Carrega todos os candidatos unificando Supabase com localStorage,
 * garantindo que qualquer candidato recém-criado apareça imediatamente.
 */
export async function getCandidatesList(vinculoFilter: string = "todos"): Promise<Candidate[]> {
  const localList = getStoredLocalCandidates();
  let serverList: Candidate[] = [];

  try {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      serverList = data as Candidate[];
    }
  } catch (err) {
    console.warn("Supabase candidates fetch fallback to local storage:", err);
  }

  // Mescla lista do servidor e local, priorizando o item mais recente
  const mergedMap = new Map<string, Candidate>();

  localList.forEach((c) => mergedMap.set(c.id, c));
  serverList.forEach((c) => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));

  const allMerged = Array.from(mergedMap.values()).sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    return tB - tA;
  });

  // Atualiza cache local
  setStoredLocalCandidates(allMerged);

  // Aplicação do filtro independente de vínculo
  if (!vinculoFilter || vinculoFilter === "todos") {
    return allMerged;
  }

  if (vinculoFilter === "externo") {
    return allMerged.filter((c) => c.external === true || !c.company_id);
  }

  // Filtro por ID específico de empresa
  return allMerged.filter((c) => c.company_id === vinculoFilter);
}

/**
 * Salva um novo candidato no banco e no storage local.
 */
export async function createCandidate(payload: Omit<Candidate, "id"> & { id?: string }): Promise<Candidate> {
  const newId = payload.id || crypto.randomUUID();
  const candidate: Candidate = {
    ...payload,
    id: newId,
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Salva imediatamente no localStorage
  const current = getStoredLocalCandidates();
  const updated = [candidate, ...current.filter((c) => c.id !== newId)];
  setStoredLocalCandidates(updated);

  // 2. Tenta persistir no Supabase
  try {
    const dbPayload: any = {
      id: candidate.id,
      full_name: candidate.full_name,
      cpf: candidate.cpf,
      birth_date: candidate.birth_date || null,
      current_role: candidate.current_role || null,
      desired_role: candidate.desired_role || null,
      status: candidate.status || "aguardando",
      external: !!candidate.external,
      company_id: candidate.external ? null : candidate.company_id || null,
      profile_data: candidate.profile_data || {},
      ai_summary: candidate.ai_summary || {},
      created_at: candidate.created_at,
    };

    const { error } = await supabase.from("candidates").upsert([dbPayload]);
    if (error) {
      console.warn("Supabase candidates upsert warning (stored in local database):", error);
    }
  } catch (err) {
    console.warn("Supabase candidate insert error (safe local fallback active):", err);
  }

  return candidate;
}

/**
 * Atualiza um candidato existente
 */
export async function updateCandidateRecord(id: string, updates: Partial<Candidate>): Promise<Candidate | null> {
  const current = getStoredLocalCandidates();
  const existing = current.find((c) => c.id === id);
  if (!existing) return null;

  const merged: Candidate = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const updatedList = current.map((c) => (c.id === id ? merged : c));
  setStoredLocalCandidates(updatedList);

  try {
    await supabase.from("candidates").update(updates as any).eq("id", id);
  } catch (err) {
    console.warn("Supabase candidate update warning:", err);
  }

  return merged;
}

/**
 * Obtém os dados de um candidato pelo ID
 */
export async function getCandidateById(id: string): Promise<Candidate | null> {
  // 1. Tenta buscar no Supabase
  try {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as Candidate;
    }
  } catch (err) {
    console.warn("Supabase fetch candidate error:", err);
  }

  // 2. Busca no localStorage
  const localList = getStoredLocalCandidates();
  const found = localList.find((c) => c.id === id);
  if (found) return found;

  return null;
}
