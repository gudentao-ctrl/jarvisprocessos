import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const NAVY: [number, number, number] = [17, 39, 78];
const GREY: [number, number, number] = [110, 116, 128];
const EMERALD: [number, number, number] = [16, 120, 72];
const RED: [number, number, number] = [185, 28, 28];

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type MaiaDrePdfData = {
  monthYear: string;
  grossRevenue: number;
  totalPaymentsReceived?: number;
  taxes: any[];
  totalTaxRatePercent: number;
  taxesDeduction: number;
  netRevenue: number;
  teamLaborCost: number;
  expenseReimbursements: number;
  fixedCosts: any[];
  totalFixedCosts: number;
  variableCosts: any[];
  totalVariableCosts: number;
  operatingProfit: number;
};

export function exportMaiaDrePdf(data: MaiaDrePdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;

  const [year, month] = data.monthYear.split("-");
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const formattedPeriod = `${monthNames[Number(month) - 1]} de ${year}`;

  // Cabeçalho institucional
  doc.setFillColor(248, 249, 251);
  doc.rect(0, 0, W, 32, "F");

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("MAIA CONSULTORIA E GESTÃO", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(`Demonstrativo de Resultado do Exercício (DRE)  |  ${formattedPeriod}`, M, 22);

  doc.setFillColor(...NAVY);
  doc.rect(0, 32, W, 1.5, "F");

  let y = 42;

  const paymentsReceived = data.totalPaymentsReceived ?? 0;

  // Tabela DRE Estruturada
  const dreBody: any[] = [
    ["1. FATURAMENTO BRUTO DE SERVIÇOS", "", brl(data.grossRevenue)],
    [
      `  (-) Dedução de Impostos (${data.totalTaxRatePercent.toFixed(2)}%)`,
      data.taxes.map((t: any) => `${t.name}: ${t.rate_percent}%`).join(" · ") || "-",
      `(-) ${brl(data.taxesDeduction)}`,
    ],
    ["2. RECEITA OPERACIONAL LÍQUIDA", "", brl(data.netRevenue)],
    ["  Pagamentos Recebidos dos Clientes (período)", "Financeiro Cliente", brl(paymentsReceived)],
    ["", "", ""],
    ["3. CUSTOS OPERACIONAIS DA EQUIPE", "", `(-) ${brl(data.teamLaborCost + data.expenseReimbursements)}`],
    ["  (-) Honorários dos Consultores", "Fechamentos Aprovados", `(-) ${brl(data.teamLaborCost)}`],
    ["  (-) Reembolso de Despesas da Equipe", "Alimentação, Deslocamento, etc.", `(-) ${brl(data.expenseReimbursements)}`],
    ["", "", ""],
    ["4. DESPESAS FIXAS CORPORATIVAS", "", `(-) ${brl(data.totalFixedCosts)}`],
    ...data.fixedCosts.map((f: any) => [
      `  (-) ${f.description}`,
      "Custo Fixo",
      `(-) ${brl(f.amount)}`,
    ]),
    ["", "", ""],
    ["5. DESPESAS VARIÁVEIS CORPORATIVAS", "", `(-) ${brl(data.totalVariableCosts)}`],
    ...data.variableCosts.map((v: any) => [
      `  (-) ${v.description}`,
      "Custo Variável",
      `(-) ${brl(v.amount)}`,
    ]),
    ["", "", ""],
    [
      "LUCRO OPERACIONAL LÍQUIDO DO PERÍODO",
      data.operatingProfit >= 0 ? "RESULTADO POSITIVO" : "RESULTADO NEGATIVO",
      brl(data.operatingProfit),
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Linha do DRE / Descrição", "Detalhamento", "Valor (R$)"]],
    body: dreBody,
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 45 },
      2: { cellWidth: 38, halign: "right" },
    },
    didParseCell: (hookData) => {
      const idx = hookData.row.index;
      // Destaque nos totais principais (1, 2, Lucro final)
      if (hookData.section === "body") {
        if (idx === 0 || idx === 2) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [245, 247, 252];
        }
        if (idx === dreBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fontSize = 9.5;
          if (data.operatingProfit >= 0) {
            hookData.cell.styles.fillColor = [236, 253, 245];
            hookData.cell.styles.textColor = EMERALD;
          } else {
            hookData.cell.styles.fillColor = [254, 242, 242];
            hookData.cell.styles.textColor = RED;
          }
        }
      }
    },
  });

  // Rodapé com data de emissão e paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `JARVIS - Fechamento Maia emitido em ${new Date().toLocaleDateString("pt-BR")}`,
      M,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(`${i}/${pages}`, W - M, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  doc.save(`fechamento-maia-dre-${data.monthYear}.pdf`);
}
