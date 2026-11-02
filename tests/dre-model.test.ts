import { describe, expect, it } from "vitest";
import { applyTemplate, computeDre, isLegacyDemoRecord, stripAmounts, type DreBlock } from "@/lib/dre-model";

const blocks: DreBlock[] = [
  { id: "r", kind: "group", label: "Receita", category: "receita", lines: [{ id: "r1", label: "Vendas", amount: 100000 }] },
  { id: "d", kind: "group", label: "Impostos", category: "deducao", lines: [{ id: "d1", label: "Simples", amount: 10000 }] },
  { id: "s1", kind: "subtotal", label: "= Receita Líquida" },
  { id: "cv", kind: "group", label: "CMV", category: "custo_variavel", lines: [{ id: "cv1", label: "Insumos", amount: 30000 }] },
  { id: "s2", kind: "subtotal", label: "= Margem" },
  { id: "cf", kind: "group", label: "Fixos", category: "custo_fixo", lines: [{ id: "cf1", label: "Folha", amount: 40000 }] },
  { id: "or", kind: "group", label: "Financeiras", category: "outras_receitas", lines: [{ id: "or1", label: "Rendimentos", amount: 5000 }] },
  { id: "od", kind: "group", label: "IR", category: "outras_despesas", lines: [{ id: "od1", label: "IRPJ", amount: 3000 }] },
  { id: "s3", kind: "subtotal", label: "= Lucro" },
];

describe("DRE personalizado por cliente", () => {
  it("subtotais acumulam somando receitas e subtraindo deduções e custos", () => {
    const { blockValues, totals } = computeDre(blocks);
    expect(blockValues.s1).toBe(90000);
    expect(blockValues.s2).toBe(60000);
    expect(blockValues.s3).toBe(22000);
    expect(totals.resultado).toBe(22000);
  });

  it("margens são calculadas sobre a receita líquida", () => {
    const { totals } = computeDre(blocks);
    expect(totals.margemContribuicaoPct).toBe(66.67);
    expect(totals.resultadoPct).toBe(24.44);
  });

  it("sem receita, percentuais ficam em zero", () => {
    expect(computeDre(stripAmounts(blocks)).totals.resultadoPct).toBe(0);
  });

  it("trocar o modelo do cliente não perde valores já lançados", () => {
    const template: DreBlock[] = [
      { id: "r", kind: "group", label: "Receita", category: "receita", lines: [{ id: "r1", label: "Vendas", amount: 0 }] },
      { id: "x", kind: "group", label: "Custos", category: "custo_fixo", lines: [] },
    ];
    const next = applyTemplate(template, blocks);
    const all = next.flatMap((b) => (b.kind === "group" ? b.lines : []));
    const sum = all.reduce((a, l) => a + l.amount, 0);
    expect(sum).toBe(100000 + 10000 + 30000 + 40000 + 5000 + 3000);
    expect(all.find((l) => l.id === "cf1")?.amount).toBe(40000);
  });

  it("valores fictícios da versão antiga não são tratados como dados reais", () => {
    expect(isLegacyDemoRecord(blocks)).toBe(false);
  });
});
