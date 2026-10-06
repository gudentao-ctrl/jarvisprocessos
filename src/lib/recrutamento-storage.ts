// src/lib/recrutamento-storage.ts
// Camada de persistência híbrida (Supabase + localStorage fallback + dados mock de demonstração)

import { supabase } from "@/integrations/supabase/client";
import {
  Vaga,
  RecrutamentoCandidato,
  CandidaturaFunil,
  EtapaKanban,
  CandidatoMatchVaga,
} from "./recrutamento-types";

const LOCAL_STORAGE_VAGAS = "maia_recrutamento_vagas_v1";
const LOCAL_STORAGE_CANDIDATOS = "maia_recrutamento_candidatos_v1";
const LOCAL_STORAGE_CANDIDATURAS = "maia_recrutamento_candidaturas_v1";

// -------------------------------------------------------------
// DADOS MOCK INICIAIS
// -------------------------------------------------------------
const INITIAL_VAGAS: Vaga[] = [
  {
    id: "vaga-proc-01",
    empresa_id: "emp-demo-01",
    empresa_nome: "Grupo Solar Brasil",
    titulo: "Analista de Processos e Eficiência Operacional",
    departamento: "Operações & Qualidade",
    tipo_contratacao: "CLT",
    jornada: "Híbrido (3x presencial, 2x home-office) - 44h semanais",
    salario_min: 6500,
    salario_max: 8200,
    salario_combinar: false,
    beneficios: ["VR R$ 42,00/dia", "Plano de Saúde Bradesco Top", "Seguro de Vida", "Bônus por Metas (PPR)"],
    requisitos_formacao: "Graduação completa em Engenharia de Produção, Administração ou áreas correlatas.",
    experiencias_exigidas: "Mínimo de 3 anos mapeando fluxos AS-IS/TO-BE, elaboração de POPs e implementação de rotinas Kaizen/Lean.",
    ferramentas_obrigatorias: ["BPMN 2.0", "Bizagi", "Power BI", "Excel Avançado"],
    soft_skills: ["Comunicação Assertiva", "Resiliência a Mudanças", "Pensamento Crítico", "Liderança por Influência"],
    flyer_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80",
    status: "ABERTA",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "vaga-fin-02",
    empresa_id: "emp-demo-01",
    empresa_nome: "Grupo Solar Brasil",
    titulo: "Coordenador Financeiro e Controladoria",
    departamento: "Financeiro & Contábil",
    tipo_contratacao: "PJ",
    jornada: "Presencial - 40h semanais",
    salario_min: 9000,
    salario_max: 12000,
    salario_combinar: false,
    beneficios: ["Auxílio Combustível", "Notebook Corporativo", "PLR Semestral"],
    requisitos_formacao: "Pós-graduação em Finanças, Controladoria ou MBA executivo.",
    experiencias_exigidas: "Experiência sólida com gestão de fluxo de caixa direto e indireto, conciliação DRE e liderança de equipe fiscal.",
    ferramentas_obrigatorias: ["ERP Protheus / TOTVS", "Excel Avançado / VBA", "Power BI", "Sistemas Bancários CNAB"],
    soft_skills: ["Visão Estratégica", "Negociação", "Atenção a Detalhes", "Tomada de Decisão sob Pressão"],
    flyer_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
    status: "ABERTA",
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

const INITIAL_CANDIDATOS: RecrutamentoCandidato[] = [
  {
    id: "cand-01",
    nome: "Lucas Ferreira Albuquerque",
    cpf: "341.879.102-44",
    data_nascimento: "1994-05-18",
    email: "lucas.albuquerque@email.com",
    telefone: "(11) 98741-2365",
    formacao: "Engenharia de Produção - USP (2018)",
    experiencias: "5 anos atuando em melhoria contínua, modelagem BPMN de processos logísticos e cadeia de suprimentos.",
    ultimos_salarios: "R$ 6.800,00 (CLT)",
    pretensao_salarial: 7500,
    ferramentas: ["BPMN 2.0", "Bizagi", "Power BI", "Excel Avançado", "Jira", "Miro"],
    curriculo_nome: "Curriculo_Lucas_Albuquerque_2026.pdf",
    curriculo_texto: "Profissional com 5+ anos de vivência em consultoria interna de processos e operações industriais. Certificação Lean Six Sigma Green Belt. Liderança de projetos que reduziram o lead time em 32% no Grupo Votorantim.",
    status_global: "EM_PROCESSO",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "cand-02",
    nome: "Juliana Mendes da Silva",
    cpf: "452.991.338-09",
    data_nascimento: "1997-11-04",
    email: "juliana.mendes@email.com",
    telefone: "(11) 99312-8845",
    formacao: "Administração de Empresas com ênfase em Gestão da Qualidade - FAAP",
    experiencias: "Analista Jr em processos hospitalares e clínicas diagnósticas. Foco em acreditação ONA e revisão de POPs.",
    ultimos_salarios: "R$ 5.200,00 (CLT)",
    pretensao_salarial: 6800,
    ferramentas: ["BPMN 2.0", "Bizagi", "Excel Avançado"],
    curriculo_nome: "CV_Juliana_Mendes_Processos.pdf",
    curriculo_texto: "Experiência de 3 anos em mapeamento de fluxos de atendimento, gestão de riscos operacionais e auditorias internas de processos.",
    status_global: "EM_PROCESSO",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "cand-03",
    nome: "Rodrigo Toledo Brandão",
    cpf: "219.458.701-12",
    data_nascimento: "1991-03-22",
    email: "rodrigo.toledo@email.com",
    telefone: "(11) 97654-1120",
    formacao: "Ciências Contábeis e MBA em Controladoria - FGV",
    experiencias: "8 anos em auditoria e coordenação contábil-financeira em distribuidoras de médio e grande porte.",
    ultimos_salarios: "R$ 9.800,00 (PJ)",
    pretensao_salarial: 10500,
    ferramentas: ["ERP Protheus / TOTVS", "Excel Avançado / VBA", "Power BI", "Sistemas Bancários CNAB"],
    curriculo_nome: "Curriculo_Rodrigo_Toledo_Controladoria.pdf",
    curriculo_texto: "Especialista em fechamentos gerenciais mensais, implantação de DRE por centros de custo e renegociação de dívidas com instituições bancárias.",
    status_global: "EM_PROCESSO",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "cand-04",
    nome: "Mariana Vasconcelos Rios",
    cpf: "512.639.870-88",
    data_nascimento: "1993-08-30",
    email: "mariana.vasconcelos@email.com",
    telefone: "(11) 98112-9900",
    formacao: "Engenharia Química e Especialização em Gestão de Projetos - POLI/USP",
    experiencias: "Coordenação de projetos de transformação digital e redesenho de processos operacionais em indústria farmacêutica.",
    ultimos_salarios: "R$ 7.900,00 (CLT)",
    pretensao_salarial: 8000,
    ferramentas: ["BPMN 2.0", "Bizagi", "Power BI", "Excel Avançado", "SAP"],
    curriculo_nome: "Mariana_Vasconcelos_Curriculo.pdf",
    curriculo_texto: "Profissional sênior focada em eficiência operacional e lean manufacturing. Forte comunicação entre chão de fábrica e diretoria executiva.",
    status_global: "CONTRATADO",
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "cand-05",
    nome: "Thiago Prado Nogueira",
    cpf: "189.773.410-65",
    data_nascimento: "1999-01-14",
    email: "thiago.prado@email.com",
    telefone: "(11) 99876-5432",
    formacao: "Sistemas de Informação - Anhembi Morumbi",
    experiencias: "Suporte técnico e automação básica de processos em Python.",
    ultimos_salarios: "R$ 3.800,00 (CLT)",
    pretensao_salarial: 4500,
    ferramentas: ["Python", "SQL", "Excel Intermediário"],
    curriculo_nome: "CV_Thiago_Prado.pdf",
    curriculo_texto: "Focado em desenvolvimento e automação de planilhas. Deseja migrar para área de processos.",
    status_global: "BANCO_TALENTOS",
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
];

const INITIAL_CANDIDATURAS: CandidaturaFunil[] = [
  {
    id: "candf-01",
    vaga_id: "vaga-proc-01",
    candidato_id: "cand-01",
    etapa_kanban: "ENTREVISTA_CONSULTORIA",
    status: "ATIVO",
    historico_etapas: [
      { etapa: "TRIAGEM", data: new Date(Date.now() - 8 * 86400000).toISOString(), responsavel: "Maia Consultoria", observacao: "Triado com alta aderência técnica em BPMN e Bizagi." },
      { etapa: "ENTREVISTA_CONSULTORIA", data: new Date(Date.now() - 3 * 86400000).toISOString(), responsavel: "Consultor Maia", observacao: "Entrevista de alinhamento técnico e validação de cases reais." },
    ],
    parecer_consultoria: {
      experiencia: "Candidato demonstrou excelente domínio prático em modelagem de processos AS-IS e TO-BE. Apresentou cases bem estruturados de redução de custos e implementação de POPs.",
      perfil_comportamental: "Comunicação fluida, postura analítica e alta resiliência a feedbacks de clientes. Bom equilíbrio entre assertividade e escuta ativa.",
      nota_aderencia: 9.0,
      pontos_fortes: "Domínio avançado de Bizagi, certificação Lean e facilidade em negociação com gestores operacionais.",
      pontos_atencao: "Exigirá acompanhamento no alinhamento às metas de curto prazo da diretoria.",
      data_entrevista: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
      consultor_nome: "Equipe Maia Consultoria",
    },
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "candf-02",
    vaga_id: "vaga-proc-01",
    candidato_id: "cand-02",
    etapa_kanban: "TRIAGEM",
    status: "ATIVO",
    historico_etapas: [
      { etapa: "TRIAGEM", data: new Date(Date.now() - 4 * 86400000).toISOString(), responsavel: "Maia Consultoria", observacao: "Candidatura recebida pelo portal de vagas." },
    ],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "candf-03",
    vaga_id: "vaga-fin-02",
    candidato_id: "cand-03",
    etapa_kanban: "ALINHAMENTO_CONTRATANTE",
    status: "ATIVO",
    historico_etapas: [
      { etapa: "TRIAGEM", data: new Date(Date.now() - 14 * 86400000).toISOString(), responsavel: "Maia Consultoria", observacao: "Triagem concluída." },
      { etapa: "ENTREVISTA_CONSULTORIA", data: new Date(Date.now() - 10 * 86400000).toISOString(), responsavel: "Consultor Maia", observacao: "Entrevista aprovada com nota 8.8." },
      { etapa: "ANALISE_PERFIL", data: new Date(Date.now() - 6 * 86400000).toISOString(), responsavel: "Consultor Maia", observacao: "Assessment concluído com perfil DISC Conforme/Dominante." },
      { etapa: "ALINHAMENTO_CONTRATANTE", data: new Date(Date.now() - 2 * 86400000).toISOString(), responsavel: "Consultor Maia", observacao: "Elaborando minuta de proposta para apresentação à diretoria do cliente." },
    ],
    parecer_consultoria: {
      experiencia: "Ampla vivência em finanças corporativas, fechamento de balanço e domínio do ERP Protheus.",
      perfil_comportamental: "Perfil prudente, meticuloso e focado em governança contábil.",
      nota_aderencia: 8.8,
      data_entrevista: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0],
      consultor_nome: "Equipe Maia Consultoria",
    },
    analise_perfil: {
      status_teste: "RESPONDIDO",
      fator_dominante: "Conscienciosidade & Conformidade",
      disc_resumo: "Alta precisão técnica, cautela em decisões de risco e respeito a normas fiscais.",
      big_five_resumo: "Elevada Conscienciosidade (92%) e Baixo Neuroticismo (22%), conferindo estabilidade em fechamentos sob pressão.",
      recomendacao: "RECOMENDADO",
      faixa_remuneracao_sugerida: "R$ 10.000,00 a R$ 11.500,00 PJ",
      parecer_final_consultoria: "Candidato totalmente aderente às exigências fiscais e ao momento de auditoria do cliente.",
      data_analise: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
    },
    proposta_contratacao: {
      remuneracao_mensal: 10500,
      tipo_contrato: "PJ",
      jornada: "Presencial - 40h semanais",
      beneficios_acordados: ["Auxílio Combustível R$ 600,00", "Notebook Dell i7 Corporativo", "Bônus Semestral por Metas de Fechamento"],
      data_inicio_prevista: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      observacoes_contratante: "Proposta já aprovada pelo CFO. Aguardando alinhamento final da data com o gestor.",
      data_criacao_proposta: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    },
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "candf-04",
    vaga_id: "vaga-proc-01",
    candidato_id: "cand-04",
    etapa_kanban: "FINALIZACAO_CONTRATADO",
    status: "CONTRATADO",
    historico_etapas: [
      { etapa: "TRIAGEM", data: new Date(Date.now() - 32 * 86400000).toISOString(), responsavel: "Maia Consultoria" },
      { etapa: "ENTREVISTA_CONSULTORIA", data: new Date(Date.now() - 28 * 86400000).toISOString(), responsavel: "Consultor Maia" },
      { etapa: "ANALISE_PERFIL", data: new Date(Date.now() - 24 * 86400000).toISOString(), responsavel: "Consultor Maia" },
      { etapa: "ALINHAMENTO_CONTRATANTE", data: new Date(Date.now() - 20 * 86400000).toISOString(), responsavel: "Consultor Maia" },
      { etapa: "ENTREVISTA_CONTRATANTE", data: new Date(Date.now() - 16 * 86400000).toISOString(), responsavel: "Diretoria Cliente" },
      { etapa: "FINALIZACAO_CONTRATADO", data: new Date(Date.now() - 12 * 86400000).toISOString(), responsavel: "Maia Consultoria", observacao: "Proposta formal aceita e assinada. Admissão concluída com êxito!" },
    ],
    parecer_consultoria: {
      experiencia: "Histórico impecável em Lean e gestão da mudança em plantas farmacêuticas.",
      perfil_comportamental: "Liderança nata, pragmatismo e alta empatia corporativa.",
      nota_aderencia: 9.8,
      data_entrevista: new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0],
    },
    analise_perfil: {
      status_teste: "RESPONDIDO",
      fator_dominante: "Dominância & Conscienciosidade",
      recomendacao: "RECOMENDADO",
      faixa_remuneracao_sugerida: "R$ 8.000,00 CLT",
      parecer_final_consultoria: "Perfil excelente para reestruturação imediata dos POPs da operação.",
    },
    proposta_contratacao: {
      remuneracao_mensal: 8000,
      tipo_contrato: "CLT",
      jornada: "Híbrido (3x presencial, 2x home) - 44h",
      beneficios_acordados: ["VR R$ 42,00/dia", "Plano de Saúde Bradesco Top", "Seguro de Vida", "PPR Anual"],
      data_inicio_prevista: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0],
      observacoes_contratante: "Contratação homologada pela diretoria.",
    },
    avaliacao_cliente: {
      resultado: "APROVADO",
      feedback_cliente: "Candidata com perfeita aderência à cultura da empresa e pronta para iniciar os trabalhos.",
      proposta_aceita: true,
      data_entrevista: new Date(Date.now() - 16 * 86400000).toISOString().split("T")[0],
    },
    created_at: new Date(Date.now() - 32 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "candf-05",
    vaga_id: "vaga-proc-01",
    candidato_id: "cand-05",
    etapa_kanban: "BANCO_TALENTOS",
    status: "REPROVADO",
    motivo_reprovacao: "Requisitos de experiência prévia em modelagem BPMN sênior não atendidos no momento.",
    devolutiva_enviada: true,
    data_devolutiva: new Date(Date.now() - 38 * 86400000).toISOString(),
    historico_etapas: [
      { etapa: "TRIAGEM", data: new Date(Date.now() - 40 * 86400000).toISOString(), responsavel: "Maia Consultoria" },
      { etapa: "BANCO_TALENTOS", data: new Date(Date.now() - 38 * 86400000).toISOString(), responsavel: "Maia Consultoria", observacao: "Direcionado para o Banco de Talentos com devolutiva formal encaminhada." },
    ],
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 38 * 86400000).toISOString(),
  },
];

// -------------------------------------------------------------
// HELPERS LOCALSTORAGE
// -------------------------------------------------------------
function readStorage<T>(key: string, defaultData: T): T {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function writeStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Error writing to localStorage", key, err);
  }
}

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
  try {
    const database = supabase as any;
    let query = database.from("vagas").select("*").order("created_at", { ascending: false });
    if (companyId) {
      query = query.eq("empresa_id", companyId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as Vaga[];
    }
  } catch (err) {
    console.warn("Supabase vagas fetch fallback to localStorage:", err);
  }

  // Fallback localStorage
  const list = readStorage<Vaga[]>(LOCAL_STORAGE_VAGAS, INITIAL_VAGAS);
  if (companyId) {
    return list.filter((v) => !v.empresa_id || v.empresa_id === companyId);
  }
  return list;
}

export async function getVagaById(vagaId: string): Promise<Vaga | null> {
  const vagas = await getVagasList();
  return vagas.find((v) => v.id === vagaId) || null;
}

export async function createVaga(vagaData: Partial<Vaga>): Promise<Vaga> {
  const newVaga: Vaga = {
    id: `vaga-${Date.now()}`,
    empresa_id: vagaData.empresa_id || null,
    empresa_nome: vagaData.empresa_nome || "Empresa Cliente",
    titulo: vagaData.titulo || "Nova Vaga",
    descricao: vagaData.descricao || "",
    departamento: vagaData.departamento || "Geral",
    tipo_contratacao: vagaData.tipo_contratacao || "CLT",
    jornada: vagaData.jornada || "Presencial - 44h semanais",
    salario_min: vagaData.salario_min || 0,
    salario_max: vagaData.salario_max || 0,
    salario_combinar: vagaData.salario_combinar ?? false,
    beneficios: vagaData.beneficios || [],
    requisitos_formacao: vagaData.requisitos_formacao || "",
    experiencias_exigidas: vagaData.experiencias_exigidas || "",
    ferramentas_obrigatorias: vagaData.ferramentas_obrigatorias || [],
    soft_skills: vagaData.soft_skills || [],
    flyer_url: vagaData.flyer_url || "",
    status: vagaData.status || "ABERTA",
    created_at: new Date().toISOString(),
  };

  try {
    const database = supabase as any;
    const { data, error } = await database.from("vagas").insert(newVaga).select().single();
    if (!error && data) {
      return data as Vaga;
    }
  } catch (err) {
    console.warn("createVaga fallback to localStorage:", err);
  }

  const list = readStorage<Vaga[]>(LOCAL_STORAGE_VAGAS, INITIAL_VAGAS);
  const updated = [newVaga, ...list];
  writeStorage(LOCAL_STORAGE_VAGAS, updated);
  return newVaga;
}

export async function updateVaga(id: string, updates: Partial<Vaga>): Promise<Vaga> {
  try {
    const database = supabase as any;
    const { data, error } = await database
      .from("vagas")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) return data as Vaga;
  } catch (err) {
    console.warn("updateVaga fallback to localStorage:", err);
  }

  const list = readStorage<Vaga[]>(LOCAL_STORAGE_VAGAS, INITIAL_VAGAS);
  const idx = list.findIndex((v) => v.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    writeStorage(LOCAL_STORAGE_VAGAS, list);
    return list[idx];
  }
  throw new Error("Vaga não encontrada.");
}

// -------------------------------------------------------------
// CANDIDATOS CRUD
// -------------------------------------------------------------
export async function getCandidatosList(): Promise<RecrutamentoCandidato[]> {
  try {
    const database = supabase as any;
    const { data, error } = await database.from("recrutamento_candidatos").select("*").order("created_at", { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as RecrutamentoCandidato[];
    }
  } catch (err) {
    console.warn("getCandidatosList fallback to localStorage:", err);
  }
  return readStorage<RecrutamentoCandidato[]>(LOCAL_STORAGE_CANDIDATOS, INITIAL_CANDIDATOS);
}

export async function createCandidato(
  candData: Partial<RecrutamentoCandidato>,
  targetVagaId?: string,
): Promise<{ candidato: RecrutamentoCandidato; candidatura?: CandidaturaFunil }> {
  const newCand: RecrutamentoCandidato = {
    id: `cand-${Date.now()}`,
    nome: candData.nome || "Novo Candidato",
    cpf: candData.cpf || "",
    data_nascimento: candData.data_nascimento || "",
    email: candData.email || "",
    telefone: candData.telefone || "",
    formacao: candData.formacao || "",
    experiencias: candData.experiencias || "",
    ultimos_salarios: candData.ultimos_salarios || "",
    pretensao_salarial: candData.pretensao_salarial || 0,
    ferramentas: candData.ferramentas || [],
    curriculo_nome: candData.curriculo_nome || (candData.curriculo_url ? "Curriculo_Anexo.pdf" : ""),
    curriculo_url: candData.curriculo_url || "",
    curriculo_texto: candData.curriculo_texto || candData.experiencias || "",
    status_global: "EM_PROCESSO",
    created_at: new Date().toISOString(),
  };

  const candidatos = readStorage<RecrutamentoCandidato[]>(LOCAL_STORAGE_CANDIDATOS, INITIAL_CANDIDATOS);
  const updatedCandidatos = [newCand, ...candidatos];
  writeStorage(LOCAL_STORAGE_CANDIDATOS, updatedCandidatos);

  let novaCandidatura: CandidaturaFunil | undefined;
  if (targetVagaId) {
    novaCandidatura = {
      id: `candf-${Date.now()}`,
      vaga_id: targetVagaId,
      candidato_id: newCand.id,
      etapa_kanban: "TRIAGEM",
      status: "ATIVO",
      historico_etapas: [
        {
          etapa: "TRIAGEM",
          data: new Date().toISOString(),
          responsavel: "Consultoria Maia",
          observacao: "Cadastro inicial e triagem de currículo.",
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);
    writeStorage(LOCAL_STORAGE_CANDIDATURAS, [novaCandidatura, ...funis]);
  }

  return { candidato: newCand, candidatura: novaCandidatura };
}

// -------------------------------------------------------------
// FUNIL ATS CRUD E OPERAÇÕES KANBAN
// -------------------------------------------------------------
export async function getCandidaturasFunil(
  vagaId?: string | null,
  companyId?: string | null,
): Promise<CandidaturaFunil[]> {
  const [allCandidaturas, allCandidatos, allVagas] = await Promise.all([
    readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS),
    getCandidatosList(),
    getVagasList(),
  ]);

  // Enriquecer candidaturas com joins de candidato e vaga
  let list = allCandidaturas.map((cf) => {
    const cand = allCandidatos.find((c) => c.id === cf.candidato_id);
    const vg = allVagas.find((v) => v.id === cf.vaga_id);
    let matchScore = 50;
    if (cand && vg) {
      const match = calcularMatchVagas(cand, [vg]);
      if (match.length > 0) matchScore = match[0].score;
    }
    return {
      ...cf,
      candidato: cand,
      vaga: vg,
      matchScore,
    };
  });

  if (vagaId && vagaId !== "todas") {
    list = list.filter((cf) => cf.vaga_id === vagaId);
  }

  if (companyId) {
    list = list.filter((cf) => !cf.vaga?.empresa_id || cf.vaga?.empresa_id === companyId);
  }

  return list;
}

export async function avancarEtapaCandidatura(
  candidaturaId: string,
  novaEtapa: EtapaKanban,
  observacao?: string,
  extraData?: Partial<CandidaturaFunil>,
): Promise<CandidaturaFunil> {
  const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);
  const idx = funis.findIndex((f) => f.id === candidaturaId);

  if (idx < 0) throw new Error("Candidatura não encontrada.");

  const current = funis[idx];
  const historico = current.historico_etapas || [];
  const novoHistorico = [
    ...historico,
    {
      etapa: novaEtapa,
      data: new Date().toISOString(),
      responsavel: "Consultor Maia",
      observacao: observacao || `Avançou para ${novaEtapa}`,
    },
  ];

  const updated: CandidaturaFunil = {
    ...current,
    ...extraData,
    etapa_kanban: novaEtapa,
    status: novaEtapa === "FINALIZACAO_CONTRATADO" ? "CONTRATADO" : current.status,
    historico_etapas: novoHistorico,
    updated_at: new Date().toISOString(),
  };

  funis[idx] = updated;
  writeStorage(LOCAL_STORAGE_CANDIDATURAS, funis);

  // Se contratado, atualiza também o status_global do candidato
  if (novaEtapa === "FINALIZACAO_CONTRATADO") {
    const candidatos = readStorage<RecrutamentoCandidato[]>(LOCAL_STORAGE_CANDIDATOS, INITIAL_CANDIDATOS);
    const cIdx = candidatos.findIndex((c) => c.id === current.candidato_id);
    if (cIdx >= 0) {
      candidatos[cIdx].status_global = "CONTRATADO";
      writeStorage(LOCAL_STORAGE_CANDIDATOS, candidatos);
    }
  }

  return updated;
}

export async function reprovarCandidatura(
  candidaturaId: string,
  motivo: string,
  observacao?: string,
): Promise<CandidaturaFunil> {
  const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);
  const idx = funis.findIndex((f) => f.id === candidaturaId);
  if (idx < 0) throw new Error("Candidatura não encontrada.");

  const current = funis[idx];
  const historico = current.historico_etapas || [];
  const novoHistorico = [
    ...historico,
    {
      etapa: "BANCO_TALENTOS" as EtapaKanban,
      data: new Date().toISOString(),
      responsavel: "Consultor Maia",
      observacao: observacao || `Movido para Banco de Talentos. Motivo: ${motivo}`,
    },
  ];

  const updated: CandidaturaFunil = {
    ...current,
    etapa_kanban: "BANCO_TALENTOS",
    status: "REPROVADO",
    motivo_reprovacao: motivo,
    historico_etapas: novoHistorico,
    updated_at: new Date().toISOString(),
  };

  funis[idx] = updated;
  writeStorage(LOCAL_STORAGE_CANDIDATURAS, funis);

  // Atualiza status_global do candidato para BANCO_TALENTOS
  const candidatos = readStorage<RecrutamentoCandidato[]>(LOCAL_STORAGE_CANDIDATOS, INITIAL_CANDIDATOS);
  const cIdx = candidatos.findIndex((c) => c.id === current.candidato_id);
  if (cIdx >= 0) {
    candidatos[cIdx].status_global = "BANCO_TALENTOS";
    writeStorage(LOCAL_STORAGE_CANDIDATOS, candidatos);
  }

  return updated;
}

export async function marcarDevolutivaEnviada(
  candidaturaId: string,
  _meio: "whatsapp" | "email",
): Promise<CandidaturaFunil> {
  const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);
  const idx = funis.findIndex((f) => f.id === candidaturaId);
  if (idx < 0) throw new Error("Candidatura não encontrada.");

  funis[idx].devolutiva_enviada = true;
  funis[idx].data_devolutiva = new Date().toISOString();
  writeStorage(LOCAL_STORAGE_CANDIDATURAS, funis);

  return funis[idx];
}

// -------------------------------------------------------------
// BANCO DE TALENTOS & REATIVAÇÃO
// -------------------------------------------------------------
export async function getBancoTalentos(search?: string): Promise<RecrutamentoCandidato[]> {
  const candidatos = await getCandidatosList();
  const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);

  // Todos os candidatos que estão como BANCO_TALENTOS ou cuja última candidatura foi reprovada
  let banco = candidatos.filter((c) => {
    if (c.status_global === "BANCO_TALENTOS") return true;
    const cFunis = funis.filter((f) => f.candidato_id === c.id);
    if (cFunis.length > 0 && cFunis.every((f) => f.status === "REPROVADO" || f.etapa_kanban === "BANCO_TALENTOS")) {
      return true;
    }
    return false;
  });

  if (search) {
    const q = search.toLowerCase();
    banco = banco.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.formacao || "").toLowerCase().includes(q) ||
        (c.experiencias || "").toLowerCase().includes(q) ||
        (c.ferramentas || []).some((f) => f.toLowerCase().includes(q)),
    );
  }

  return banco;
}

export async function reativarCandidatoDoBanco(
  candidatoId: string,
  targetVagaId: string,
): Promise<CandidaturaFunil> {
  const novaCandidatura: CandidaturaFunil = {
    id: `candf-react-${Date.now()}`,
    vaga_id: targetVagaId,
    candidato_id: candidatoId,
    etapa_kanban: "TRIAGEM",
    status: "ATIVO",
    historico_etapas: [
      {
        etapa: "TRIAGEM",
        data: new Date().toISOString(),
        responsavel: "Consultor Maia",
        observacao: "Reativado do Banco de Talentos para nova oportunidade.",
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const funis = readStorage<CandidaturaFunil[]>(LOCAL_STORAGE_CANDIDATURAS, INITIAL_CANDIDATURAS);
  writeStorage(LOCAL_STORAGE_CANDIDATURAS, [novaCandidatura, ...funis]);

  // Atualiza status do candidato para EM_PROCESSO
  const candidatos = readStorage<RecrutamentoCandidato[]>(LOCAL_STORAGE_CANDIDATOS, INITIAL_CANDIDATOS);
  const cIdx = candidatos.findIndex((c) => c.id === candidatoId);
  if (cIdx >= 0) {
    candidatos[cIdx].status_global = "EM_PROCESSO";
    writeStorage(LOCAL_STORAGE_CANDIDATOS, candidatos);
  }

  return novaCandidatura;
}
