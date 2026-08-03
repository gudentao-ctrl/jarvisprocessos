export const POP_UNKNOWN = "Informação não identificada. Validar durante o mapeamento do processo.";

export type PopStep = {
  title: string;
  description: string;
  responsible: string;
};

export type PopIndicator = {
  name: string;
  description: string;
};

export type PopContent = {
  process_name: string;
  objective: string;
  scope: string;
  responsibles: string[];
  inputs: string[];
  steps: PopStep[];
  outputs: string[];
  attention_points: string[];
  indicators: PopIndicator[];
};

export const EMPTY_POP: PopContent = {
  process_name: "",
  objective: "",
  scope: "",
  responsibles: [],
  inputs: [],
  steps: [],
  outputs: [],
  attention_points: [],
  indicators: [],
};

export function normalizePop(raw: any): PopContent {
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String(x?.title ?? x?.name ?? ""))).filter(Boolean) : [];
  return {
    process_name: String(raw?.process_name ?? raw?.nome_processo ?? ""),
    objective: String(raw?.objective ?? raw?.objetivo ?? ""),
    scope: String(raw?.scope ?? raw?.escopo ?? ""),
    responsibles: arr(raw?.responsibles ?? raw?.responsaveis),
    inputs: arr(raw?.inputs ?? raw?.entradas),
    steps: Array.isArray(raw?.steps ?? raw?.procedimento)
      ? (raw.steps ?? raw.procedimento).map((s: any) => ({
          title: String(s?.title ?? s?.etapa ?? s?.name ?? ""),
          description: String(s?.description ?? s?.descricao ?? ""),
          responsible: String(s?.responsible ?? s?.responsavel ?? ""),
        }))
      : [],
    outputs: arr(raw?.outputs ?? raw?.saidas),
    attention_points: arr(raw?.attention_points ?? raw?.pontos_atencao),
    indicators: Array.isArray(raw?.indicators ?? raw?.indicadores)
      ? (raw.indicators ?? raw.indicadores).map((i: any) => ({
          name: String(i?.name ?? i?.nome ?? (typeof i === "string" ? i : "")),
          description: String(i?.description ?? i?.descricao ?? ""),
        }))
      : [],
  };
}

export function isUnknown(value: string) {
  return value?.trim().toLowerCase().startsWith("informação não identificada");
}
