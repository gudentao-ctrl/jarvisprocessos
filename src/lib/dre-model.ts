// Modelo de DRE personalizável por cliente.
// Um DRE é uma lista ordenada de blocos: grupos (com linhas e valores) e subtotais.
// Cada grupo tem uma natureza contábil que define se soma ou subtrai do resultado,
// o que permite montar estruturas diferentes por cliente mantendo os indicadores comparáveis.

export type DreCategory =
  | "receita"
  | "deducao"
  | "custo_variavel"
  | "custo_fixo"
  | "outras_receitas"
  | "outras_despesas";

export interface DreLine {
  id: string;
  label: string;
  amount: number;
}

export interface DreGroupBlock {
  id: string;
  kind: "group";
  label: string;
  category: DreCategory;
  lines: DreLine[];
}

export interface DreSubtotalBlock {
  id: string;
  kind: "subtotal";
  label: string;
}

export type DreBlock = DreGroupBlock | DreSubtotalBlock;

export const DRE_CATEGORIES: Record<DreCategory, { label: string; sign: 1 | -1; short: string }> = {
  receita: { label: "Receita (soma)", sign: 1, short: "Receita" },
  deducao: { label: "Dedução / imposto sobre venda (subtrai)", sign: -1, short: "Dedução" },
  custo_variavel: { label: "Custo variável (subtrai)", sign: -1, short: "Custo variável" },
  custo_fixo: { label: "Custo / despesa fixa (subtrai)", sign: -1, short: "Custo fixo" },
  outras_receitas: { label: "Outras receitas / financeiras (soma)", sign: 1, short: "Outras receitas" },
  outras_despesas: { label: "Outras despesas / impostos s/ lucro (subtrai)", sign: -1, short: "Outras despesas" },
};

export const DRE_CATEGORY_ORDER: DreCategory[] = [
  "receita",
  "deducao",
  "custo_variavel",
  "custo_fixo",
  "outras_receitas",
  "outras_despesas",
];

export interface DreTotals {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosVariaveis: number;
  margemContribuicao: number;
  margemContribuicaoPct: number;
  custosFixos: number;
  outrasReceitas: number;
  outrasDespesas: number;
  resultado: number;
  resultadoPct: number;
}

export interface DreComputed {
  /** Valor de cada bloco: total do grupo (positivo) ou subtotal acumulado (com sinal). */
  blockValues: Record<string, number>;
  /** Percentual de cada bloco sobre a receita líquida (0 quando não há receita). */
  blockPct: Record<string, number>;
  totals: DreTotals;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export function groupTotal(block: DreGroupBlock): number {
  return round2(block.lines.reduce((acc, l) => acc + num(l.amount), 0));
}

export function computeDre(blocks: DreBlock[]): DreComputed {
  const byCat: Record<DreCategory, number> = {
    receita: 0,
    deducao: 0,
    custo_variavel: 0,
    custo_fixo: 0,
    outras_receitas: 0,
    outras_despesas: 0,
  };
  const blockValues: Record<string, number> = {};
  let running = 0;
  for (const b of blocks) {
    if (b.kind === "group") {
      const t = groupTotal(b);
      blockValues[b.id] = t;
      byCat[b.category] = round2(byCat[b.category] + t);
      running = round2(running + DRE_CATEGORIES[b.category].sign * t);
    } else {
      blockValues[b.id] = running;
    }
  }
  const receitaLiquida = round2(byCat.receita - byCat.deducao);
  const margemContribuicao = round2(receitaLiquida - byCat.custo_variavel);
  const resultado = running;
  const pct = (v: number) => (receitaLiquida > 0 ? round2((v / receitaLiquida) * 100) : 0);
  const blockPct: Record<string, number> = {};
  for (const id of Object.keys(blockValues)) blockPct[id] = pct(blockValues[id]);
  return {
    blockValues,
    blockPct,
    totals: {
      receitaBruta: byCat.receita,
      deducoes: byCat.deducao,
      receitaLiquida,
      custosVariaveis: byCat.custo_variavel,
      margemContribuicao,
      margemContribuicaoPct: pct(margemContribuicao),
      custosFixos: byCat.custo_fixo,
      outrasReceitas: byCat.outras_receitas,
      outrasDespesas: byCat.outras_despesas,
      resultado,
      resultadoPct: pct(resultado),
    },
  };
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/** Modelo sem valores (todas as linhas zeradas). */
export function stripAmounts(blocks: DreBlock[]): DreBlock[] {
  return blocks.map((b) =>
    b.kind === "group" ? { ...b, lines: b.lines.map((l) => ({ ...l, amount: 0 })) } : { ...b },
  );
}

/**
 * Reorganiza um DRE já preenchido conforme o modelo do cliente.
 * Valores de linhas com o mesmo identificador são mantidos; linhas com valor que não existem
 * no modelo vão para o primeiro grupo de mesma natureza (ou são acrescentadas a um novo grupo),
 * para que nenhum valor lançado se perca.
 */
export function applyTemplate(template: DreBlock[], filled: DreBlock[]): DreBlock[] {
  const amounts = new Map<string, number>();
  const orphanByCat = new Map<DreCategory, DreLine[]>();
  const templateLineIds = new Set<string>();
  for (const b of template) if (b.kind === "group") b.lines.forEach((l) => templateLineIds.add(l.id));
  for (const b of filled) {
    if (b.kind !== "group") continue;
    for (const l of b.lines) {
      if (templateLineIds.has(l.id)) amounts.set(l.id, num(l.amount));
      else if (num(l.amount) !== 0) {
        const list = orphanByCat.get(b.category) ?? [];
        list.push({ ...l, amount: num(l.amount) });
        orphanByCat.set(b.category, list);
      }
    }
  }
  const result: DreBlock[] = template.map((b) => {
    if (b.kind !== "group") return { ...b };
    const lines = b.lines.map((l) => ({ ...l, amount: amounts.get(l.id) ?? 0 }));
    const orphans = orphanByCat.get(b.category);
    if (orphans) {
      lines.push(...orphans);
      orphanByCat.delete(b.category);
    }
    return { ...b, lines };
  });
  for (const [category, lines] of orphanByCat) {
    result.push({ id: newId(), kind: "group", label: `${DRE_CATEGORIES[category].short} (linhas anteriores)`, category, lines });
  }
  return result;
}

/** Garante a forma dos blocos vindos do banco ou de versões antigas. */
export function sanitizeBlocks(raw: unknown): DreBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: DreBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const id = typeof b.id === "string" && b.id ? b.id : newId();
    const label = typeof b.label === "string" ? b.label.slice(0, 200) : "";
    if (b.kind === "subtotal") {
      out.push({ id, kind: "subtotal", label: label || "= Subtotal" });
    } else if (b.kind === "group") {
      const category = (DRE_CATEGORY_ORDER as string[]).includes(String(b.category))
        ? (b.category as DreCategory)
        : "custo_fixo";
      const lines = Array.isArray(b.lines)
        ? (b.lines as Record<string, unknown>[])
            .filter((l) => l && typeof l === "object")
            .map((l) => ({
              id: typeof l.id === "string" && l.id ? l.id : newId(),
              label: typeof l.label === "string" ? l.label.slice(0, 200) : "",
              amount: num(l.amount),
            }))
        : [];
      out.push({ id, kind: "group", label: label || "Grupo", category, lines });
    }
  }
  return out;
}

const L = (id: string, label: string): DreLine => ({ id, label, amount: 0 });

export interface DrePreset {
  key: string;
  label: string;
  description: string;
  blocks: () => DreBlock[];
}

/** Estrutura gerencial original (mesmos identificadores usados pela versão anterior da tela). */
export function standardDreBlocks(): DreBlock[] {
  return [
    {
      id: "g_receita",
      kind: "group",
      label: "(+) Receita Bruta",
      category: "receita",
      lines: [L("rb_1", "Venda de Mercadorias / Produtos"), L("rb_2", "Prestação de Serviços / Contratos")],
    },
    {
      id: "g_deducoes",
      kind: "group",
      label: "(–) Deduções e Impostos",
      category: "deducao",
      lines: [L("dd_1", "Impostos s/ Vendas (Simples / ICMS / ISS)"), L("dd_2", "Devoluções e Descontos Concedidos")],
    },
    { id: "s_rl", kind: "subtotal", label: "= Receita Líquida" },
    {
      id: "g_cv",
      kind: "group",
      label: "(–) Custos Variáveis / CMV",
      category: "custo_variavel",
      lines: [
        L("cv_1", "Custos com Matéria-Prima / Insumos (CMV)"),
        L("cv_2", "Comissões da Equipe Comercial"),
        L("cv_3", "Taxas de Cartão & Plataformas de Cobrança"),
        L("cv_4", "Fretes e Logística de Entrega"),
      ],
    },
    { id: "s_mc", kind: "subtotal", label: "= Margem de Contribuição" },
    {
      id: "g_cf",
      kind: "group",
      label: "(–) Custos Fixos e Pessoal",
      category: "custo_fixo",
      lines: [
        L("cf_1", "Folha de Pagamento & Encargos (Equipe)"),
        L("cf_2", "Pró-Labore dos Sócios / Diretoria"),
        L("cf_3", "Aluguel, Condomínio & Infraestrutura"),
        L("cf_4", "Sistemas, Licenças & Softwares"),
        L("cf_5", "Despesas Administrativas & Contabilidade"),
        L("cf_6", "Marketing, Tráfego & Publicidade"),
      ],
    },
    { id: "s_lo", kind: "subtotal", label: "= LUCRO OPERACIONAL" },
  ];
}

export const DRE_PRESETS: DrePreset[] = [
  {
    key: "gerencial",
    label: "Gerencial padrão",
    description: "Receita, deduções, custos variáveis, custos fixos e lucro operacional.",
    blocks: standardDreBlocks,
  },
  {
    key: "servicos",
    label: "Prestação de serviços",
    description: "Contratos e projetos, custo da equipe técnica, EBITDA e lucro líquido.",
    blocks: () => [
      { id: newId(), kind: "group", label: "(+) Receita de Serviços", category: "receita", lines: [L(newId(), "Contratos recorrentes"), L(newId(), "Projetos / serviços avulsos")] },
      { id: newId(), kind: "group", label: "(–) Impostos sobre Serviços", category: "deducao", lines: [L(newId(), "ISS / Simples Nacional"), L(newId(), "PIS / COFINS")] },
      { id: newId(), kind: "subtotal", label: "= Receita Líquida" },
      { id: newId(), kind: "group", label: "(–) Custo dos Serviços Prestados", category: "custo_variavel", lines: [L(newId(), "Equipe técnica / terceiros"), L(newId(), "Comissões"), L(newId(), "Deslocamentos e materiais")] },
      { id: newId(), kind: "subtotal", label: "= Margem de Contribuição" },
      { id: newId(), kind: "group", label: "(–) Despesas Operacionais", category: "custo_fixo", lines: [L(newId(), "Folha administrativa e encargos"), L(newId(), "Pró-labore"), L(newId(), "Aluguel e estrutura"), L(newId(), "Sistemas e softwares"), L(newId(), "Marketing")] },
      { id: newId(), kind: "subtotal", label: "= EBITDA" },
      { id: newId(), kind: "group", label: "(+/–) Resultado Financeiro", category: "outras_despesas", lines: [L(newId(), "Juros e tarifas bancárias"), L(newId(), "Depreciação / amortização")] },
      { id: newId(), kind: "subtotal", label: "= LUCRO LÍQUIDO" },
    ],
  },
  {
    key: "comercio",
    label: "Comércio / Indústria",
    description: "Vendas, CMV, despesas comerciais e administrativas, EBITDA, IR/CSLL e lucro líquido.",
    blocks: () => [
      { id: newId(), kind: "group", label: "(+) Receita Bruta de Vendas", category: "receita", lines: [L(newId(), "Vendas de produtos"), L(newId(), "Vendas de serviços")] },
      { id: newId(), kind: "group", label: "(–) Deduções da Receita", category: "deducao", lines: [L(newId(), "ICMS / IPI / Simples"), L(newId(), "PIS / COFINS"), L(newId(), "Devoluções e descontos")] },
      { id: newId(), kind: "subtotal", label: "= Receita Líquida" },
      { id: newId(), kind: "group", label: "(–) CMV / CPV", category: "custo_variavel", lines: [L(newId(), "Matéria-prima / mercadorias"), L(newId(), "Mão de obra direta"), L(newId(), "Fretes sobre compras")] },
      { id: newId(), kind: "group", label: "(–) Despesas Variáveis de Venda", category: "custo_variavel", lines: [L(newId(), "Comissões"), L(newId(), "Fretes de entrega"), L(newId(), "Taxas de cartão")] },
      { id: newId(), kind: "subtotal", label: "= Margem de Contribuição" },
      { id: newId(), kind: "group", label: "(–) Despesas Administrativas", category: "custo_fixo", lines: [L(newId(), "Folha administrativa e encargos"), L(newId(), "Pró-labore"), L(newId(), "Aluguel, energia e água"), L(newId(), "Contabilidade e sistemas")] },
      { id: newId(), kind: "group", label: "(–) Despesas Comerciais", category: "custo_fixo", lines: [L(newId(), "Equipe comercial fixa"), L(newId(), "Marketing e publicidade")] },
      { id: newId(), kind: "subtotal", label: "= EBITDA" },
      { id: newId(), kind: "group", label: "(+) Receitas Financeiras", category: "outras_receitas", lines: [L(newId(), "Rendimentos de aplicações")] },
      { id: newId(), kind: "group", label: "(–) Despesas Financeiras e Depreciação", category: "outras_despesas", lines: [L(newId(), "Juros e tarifas"), L(newId(), "Depreciação")] },
      { id: newId(), kind: "subtotal", label: "= Lucro Antes do IR" },
      { id: newId(), kind: "group", label: "(–) IR / CSLL", category: "outras_despesas", lines: [L(newId(), "IRPJ / CSLL")] },
      { id: newId(), kind: "subtotal", label: "= LUCRO LÍQUIDO" },
    ],
  },
];

/** Converte o formato da versão anterior (4 listas fixas) para blocos. */
export function legacyRecordToBlocks(rec: {
  receita_bruta_items?: DreLine[];
  deducoes_items?: DreLine[];
  custos_variaveis_items?: DreLine[];
  custos_fixos_items?: DreLine[];
}): DreBlock[] {
  const base = standardDreBlocks();
  const pick = (items?: DreLine[]) =>
    (items ?? []).map((i) => ({ id: String(i.id || newId()), label: String(i.label ?? ""), amount: num(i.amount) }));
  const map: Record<string, DreLine[]> = {
    g_receita: pick(rec.receita_bruta_items),
    g_deducoes: pick(rec.deducoes_items),
    g_cv: pick(rec.custos_variaveis_items),
    g_cf: pick(rec.custos_fixos_items),
  };
  return base.map((b) => (b.kind === "group" ? { ...b, lines: map[b.id] ?? [] } : b));
}

// Valores fictícios que a versão anterior preenchia sozinha; nunca devem ser recuperados como dados reais.
const LEGACY_DEMO: Record<string, number[]> = {
  rb_1: [145000, 160000, 185000],
  rb_2: [85000],
  dd_1: [18400],
  dd_2: [2600],
  cv_1: [62000, 64000, 68000],
  cv_2: [9200],
  cv_3: [4800],
  cv_4: [3500],
  cf_1: [52000, 51000, 49500],
  cf_2: [18000],
  cf_3: [8500],
  cf_4: [3200],
  cf_5: [4500],
  cf_6: [6000],
};

export function isLegacyDemoRecord(blocks: DreBlock[]): boolean {
  const lines = blocks.flatMap((b) => (b.kind === "group" ? b.lines : []));
  if (lines.length !== Object.keys(LEGACY_DEMO).length) return false;
  return lines.every((l) => LEGACY_DEMO[l.id]?.includes(num(l.amount)));
}
