import { supabase } from "@/integrations/supabase/client";

export interface Candidate {
  id: string;
  full_name: string;
  email?: string;
  cpf: string;
  birth_date?: string;
  current_role?: string;
  desired_role?: string;
  status: "aguardando" | "em_teste" | "concluido";
  external?: boolean;
  company_id?: string | null;
  company_name?: string | null;
  profile_data?: {
    psychometrics?: unknown;
    radar?: Array<{
      name: string;
      factor?: "A" | "C" | "E" | "M" | "N" | "D" | "I" | "S";
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
  public_token?: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Carrega candidatos do banco protegido.
 */
export async function getCandidatesList(vinculoFilter: string = "todos"): Promise<Candidate[]> {
  const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as avaliações.");
  const allMerged = (data || []) as Candidate[];

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
 * Salva um novo candidato no banco protegido.
 */
export async function createCandidate(payload: Omit<Candidate, "id"> & { id?: string }): Promise<Candidate> {
  const newId = payload.id || crypto.randomUUID();
  const candidate: Candidate = {
    ...payload,
    id: newId,
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Persiste apenas no banco protegido; CPF e respostas não ficam no navegador.
  try {
    const dbPayload: any = {
      id: candidate.id,
      full_name: candidate.full_name,
      email: candidate.email,
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

    const database = supabase as any;
    const { error } = await database.from("candidates").upsert([dbPayload]);
    if (error) throw new Error(error.message);
  } catch (err) {
    throw err;
  }

  return candidate;
}

/**
 * Atualiza um candidato existente
 */
export async function updateCandidateRecord(id: string, updates: Partial<Candidate>): Promise<Candidate | null> {
  try {
    const database = supabase as any;
    const { data, error } = await database.from("candidates").update(updates).eq("id", id).select().maybeSingle();
    if (error) throw error;
    return data as Candidate | null;
  } catch (err) {
    console.warn("Candidate update warning:", err);
    return null;
  }
}

/**
 * Obtém os dados de um candidato pelo ID
 */
export async function getCandidateById(id: string): Promise<Candidate | null> {
  // 1. Tenta buscar no Supabase
  try {
    const database = supabase as any;
    const { data, error } = await database
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

  return null;
}
