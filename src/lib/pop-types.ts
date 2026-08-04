export const POP_UNKNOWN = "Informação não identificada no processo. Recomenda-se validar durante o mapeamento.";

export type PopIdentification = {
  process_name: string;
  code: string;
  version: string;
  issue_date: string;
  last_revision: string;
  process_owner: string;
  area: string;
  prepared_by: string;
  approved_by: string;
};

export type PopDefinition = { term: string; definition: string };

export type PopResponsibility = { role: string; job_function: string; responsibility: string };

export type PopStep = {
  title: string;
  description: string;
  responsible: string;
  documents: string;
  system: string;
  decision_criteria: string;
  expected_result: string;
};

export type PopRisk = { description: string; impact: string; mitigation: string };

export type PopIndicator = { name: string; description: string; formula: string; goal: string };

export type PopContent = {
  identification: PopIdentification;
  objective: string;
  scope: string;
  definitions: PopDefinition[];
  responsibilities: PopResponsibility[];
  inputs: string[];
  steps: PopStep[];
  outputs: string[];
  business_rules: string[];
  control_points: string[];
  risks: PopRisk[];
  indicators: PopIndicator[];
  systems: string[];
  related_documents: string[];
  attention_points: string[];
  notes: string;
};

export const EMPTY_IDENTIFICATION: PopIdentification = {
  process_name: "",
  code: "",
  version: "1.0",
  issue_date: "",
  last_revision: "",
  process_owner: "",
  area: "",
  prepared_by: "",
  approved_by: "",
};

export const EMPTY_POP: PopContent = {
  identification: { ...EMPTY_IDENTIFICATION },
  objective: "",
  scope: "",
  definitions: [],
  responsibilities: [],
  inputs: [],
  steps: [],
  outputs: [],
  business_rules: [],
  control_points: [],
  risks: [],
  indicators: [],
  systems: [],
  related_documents: [],
  attention_points: [],
  notes: "",
};

const str = (v: any): string => (v == null ? "" : typeof v === "string" ? v : String(v));

const arr = (v: any): string[] =>
  Array.isArray(v)
    ? v
        .map((x) =>
          typeof x === "string"
            ? x
            : str(x?.title ?? x?.name ?? x?.nome ?? x?.description ?? x?.descricao ?? x?.documento ?? x?.sistema ?? ""),
        )
        .filter(Boolean)
    : [];

export function normalizePop(raw: any): PopContent {
  const id = raw?.identification ?? raw?.identificacao ?? {};
  return {
    identification: {
      process_name: str(id.process_name ?? id.nome_processo ?? raw?.process_name ?? raw?.nome_processo),
      code: str(id.code ?? id.codigo),
      version: str(id.version ?? id.versao) || "1.0",
      issue_date: str(id.issue_date ?? id.data_emissao),
      last_revision: str(id.last_revision ?? id.ultima_revisao),
      process_owner: str(id.process_owner ?? id.responsavel_processo),
      area: str(id.area ?? id.area_responsavel),
      prepared_by: str(id.prepared_by ?? id.elaborado_por),
      approved_by: str(id.approved_by ?? id.aprovado_por),
    },
    objective: str(raw?.objective ?? raw?.objetivo),
    scope: str(raw?.scope ?? raw?.escopo ?? raw?.aplicacao),
    definitions: Array.isArray(raw?.definitions ?? raw?.definicoes)
      ? (raw.definitions ?? raw.definicoes).map((d: any) => ({
          term: str(d?.term ?? d?.termo ?? (typeof d === "string" ? d : "")),
          definition: str(d?.definition ?? d?.definicao),
        }))
      : [],
    responsibilities: Array.isArray(raw?.responsibilities ?? raw?.responsabilidades)
      ? (raw.responsibilities ?? raw.responsabilidades).map((r: any) => ({
          role: str(r?.role ?? r?.responsavel ?? (typeof r === "string" ? r : "")),
          job_function: str(r?.job_function ?? r?.function ?? r?.funcao),
          responsibility: str(r?.responsibility ?? r?.responsabilidade),
        }))
      : arr(raw?.responsibles ?? raw?.responsaveis).map((role) => ({ role, job_function: "", responsibility: "" })),
    inputs: arr(raw?.inputs ?? raw?.entradas),
    steps: Array.isArray(raw?.steps ?? raw?.procedimento ?? raw?.procedimento_operacional)
      ? (raw.steps ?? raw.procedimento ?? raw.procedimento_operacional).map((s: any) => ({
          title: str(s?.title ?? s?.etapa ?? s?.nome_atividade ?? s?.name),
          description: str(s?.description ?? s?.descricao),
          responsible: str(s?.responsible ?? s?.responsavel),
          documents: Array.isArray(s?.documents ?? s?.documentos)
            ? arr(s.documents ?? s.documentos).join(", ")
            : str(s?.documents ?? s?.documentos),
          system: Array.isArray(s?.system ?? s?.sistema ?? s?.systems)
            ? arr(s.system ?? s.sistema ?? s.systems).join(", ")
            : str(s?.system ?? s?.sistema ?? s?.systems),
          decision_criteria: str(s?.decision_criteria ?? s?.criterios_decisao ?? s?.criterio_decisao),
          expected_result: str(s?.expected_result ?? s?.resultado_esperado),
        }))
      : [],
    outputs: arr(raw?.outputs ?? raw?.saidas),
    business_rules: arr(raw?.business_rules ?? raw?.regras_negocio),
    control_points: arr(raw?.control_points ?? raw?.pontos_controle),
    risks: Array.isArray(raw?.risks ?? raw?.riscos)
      ? (raw.risks ?? raw.riscos).map((r: any) => ({
          description: str(r?.description ?? r?.descricao ?? r?.risco ?? (typeof r === "string" ? r : "")),
          impact: str(r?.impact ?? r?.impacto),
          mitigation: str(r?.mitigation ?? r?.mitigacao ?? r?.tratamento),
        }))
      : [],
    indicators: Array.isArray(raw?.indicators ?? raw?.indicadores)
      ? (raw.indicators ?? raw.indicadores).map((i: any) => ({
          name: str(i?.name ?? i?.nome ?? (typeof i === "string" ? i : "")),
          description: str(i?.description ?? i?.descricao),
          formula: str(i?.formula ?? i?.calculo),
          goal: str(i?.goal ?? i?.meta),
        }))
      : [],
    systems: arr(raw?.systems ?? raw?.sistemas ?? raw?.sistemas_utilizados),
    related_documents: arr(raw?.related_documents ?? raw?.documentos_relacionados),
    attention_points: arr(raw?.attention_points ?? raw?.pontos_atencao),
    notes: str(raw?.notes ?? raw?.observacoes),
  };
}

export function isUnknown(value: string) {
  return value?.trim().toLowerCase().startsWith("informação não identificada");
}

export function popProcessName(pop: PopContent) {
  return pop.identification?.process_name || "";
}
