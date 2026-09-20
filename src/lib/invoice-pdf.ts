import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY: [number, number, number] = [17, 39, 78];
const GREY: [number, number, number] = [110, 116, 128];
const EMERALD: [number, number, number] = [16, 120, 72];

const CHAR_MAP: Record<string, string> = {
  "\u2265": ">=", "\u2264": "<=", "\u2260": "!=", "\u2248": "~", "\u00b1": "+/-",
  "\u2192": "->", "\u2190": "<-", "\u2022": "-", "\u2011": "-", "\u2212": "-",
  "\u200b": "", "\u00a0": " ",
};

function sanitize(v?: string | null) {
  return (v ?? "").replace(
    /[\u2265\u2264\u2260\u2248\u00b1\u2192\u2190\u2022\u2011\u2212\u200b\u00a0\u2013\u2014\u2018\u2019\u201c\u201d]/g,
    (c) =>
      CHAR_MAP[c] ??
      (c === "\u2013" || c === "\u2014"
        ? "-"
        : c === "\u2018" || c === "\u2019"
          ? "'"
          : c === "\u201c" || c === "\u201d"
            ? '"'
            : c),
  );
}

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtHours = (h: number) => {
  const t = Math.round(Number(h ?? 0) * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const fmtDate = (d?: string | null) => (d ? String(d).split("-").reverse().join("/") : "-");

const sum = (rows: any[] | null | undefined, key: string) =>
  (rows ?? []).reduce((s: number, r: any) => s + Number(r?.[key] ?? 0), 0);

export type BilledReport = {
  company: {
    id: string;
    name: string;
    title?: string | null;
    company_logo?: string | null;
    consultancy_logo?: string | null;
  } | null;
  period: { from: string | null; to: string | null };
  rows: any[];
  invoices: any[];
  payments?: any[];
  previousBalance?: number;
  previousInvoiced?: number;
  previousPaid?: number;
  previousHours?: number;
};

export type BilledPdfMode = "consultor" | "resumido";

function imgFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "PNG";
}

function drawLogo(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: "left" | "right",
) {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / props.height;
    let h = maxH;
    let w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    const px = align === "right" ? x - w : x;
    doc.addImage(dataUrl, imgFormat(dataUrl), px, y + (maxH - h) / 2, w, h);
  } catch {
    /* logo indisponível */
  }
}

export function exportBilledPdf(data: BilledReport, mode: BilledPdfMode) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;

  const companyName = sanitize(data.company?.name ?? "Cliente");
  const headerTitle = sanitize(data.company?.title || companyName);
  const periodLabel =
    data.period.from || data.period.to
      ? `${fmtDate(data.period.from)} a ${fmtDate(data.period.to)}`
      : "Todo o período";

  // Cabeçalho institucional: fundo claro, logos nas extremidades, filete navy
  doc.setFillColor(248, 249, 251);
  doc.rect(0, 0, W, 30, "F");

  const logoTop = 7;
  const logoH = 16;
  let textX = M;
  if (data.company?.company_logo) {
    drawLogo(doc, data.company.company_logo, M, logoTop, 26, logoH, "left");
    textX = M + 30;
  }
  if (data.company?.consultancy_logo) {
    drawLogo(doc, data.company.consultancy_logo, W - M, logoTop, 34, logoH, "right");
  }

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(headerTitle, textX, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  doc.text(`Relatório de Faturamento  |  ${periodLabel}`, textX, 20.5);

  doc.setFillColor(...NAVY);
  doc.rect(0, 30, W, 1.4, "F");

  doc.setTextColor(0, 0, 0);
  let y = 40;

  const rows = data.rows ?? [];
  const rowValue = (r: any) => {
    const rate = Number(r.invoices?.hourly_rate ?? 0);
    const hoursAmount = Math.round(Number(r.hours ?? 0) * rate * 100) / 100;
    const exp = sum(r.work_hour_expenses, "amount");
    const tools = sum(r.work_hour_tools, "amount");

    // Detalhamento de despesas por categoria
    const expBreakdown = (r.work_hour_expenses ?? []).map((e: any) => {
      const cat = e.category ? `${e.category}: ` : "";
      return `${cat}${brl(e.amount)}`;
    }).join(", ");

    return { rate, hoursAmount, exp, tools, expBreakdown, total: hoursAmount + exp + tools };
  };

  const totalHours = rows.reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const totals = rows.reduce(
    (acc, r) => {
      const v = rowValue(r);
      acc.hoursAmount += v.hoursAmount;
      acc.exp += v.exp;
      acc.tools += v.tools;
      return acc;
    },
    { hoursAmount: 0, exp: 0, tools: 0 },
  );
  const grandTotal = totals.hoursAmount + totals.exp + totals.tools;

  // Totalizador de despesas por categoria
  const expensesByCategory: Record<string, number> = {};
  for (const r of rows) {
    for (const e of r.work_hour_expenses ?? []) {
      const cat = e.category || "deslocamento";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0);
    }
  }

  if (mode === "consultor") {
    const byConsultant: Record<string, any[]> = {};
    for (const r of rows) {
      const key = sanitize(r.responsible) || "Sem consultor";
      (byConsultant[key] ??= []).push(r);
    }

    for (const [name, list] of Object.entries(byConsultant)) {
      const cHours = list.reduce((s, r) => s + Number(r.hours ?? 0), 0);
      const cTotal = list.reduce((s, r) => s + rowValue(r).total, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(`${name}  -  ${fmtHours(cHours)}  -  ${brl(cTotal)}`, M, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [["Data", "Tipo", "Descrição / Despesas Detalhadas", "Horas", "Valor/h", "Desp.", "Ferr.", "Total"]],
        body: list.map((r) => {
          const v = rowValue(r);
          let descText = sanitize(r.description) || "-";
          if (v.expBreakdown) {
            descText += ` [Despesas: ${v.expBreakdown}]`;
          }
          return [
            fmtDate(r.work_date),
            sanitize(r.activity_type),
            descText,
            fmtHours(r.hours),
            brl(v.rate),
            v.exp ? brl(v.exp) : "-",
            v.tools ? brl(v.tools) : "-",
            brl(v.total),
          ];
        }),
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 17 },
          1: { cellWidth: 22 },
          2: { cellWidth: 50 },
          3: { cellWidth: 14, halign: "right" },
          4: { cellWidth: 18, halign: "right" },
          5: { cellWidth: 18, halign: "right" },
          6: { cellWidth: 16, halign: "right" },
          7: { cellWidth: 21, halign: "right" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
    }
  } else {
    // Modo Resumido
    const byConsultant: Record<string, { hours: number; total: number }> = {};
    for (const r of rows) {
      const key = sanitize(r.responsible) || "Sem consultor";
      const v = rowValue(r);
      byConsultant[key] ??= { hours: 0, total: 0 };
      byConsultant[key].hours += Number(r.hours ?? 0);
      byConsultant[key].total += v.total;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Item de Faturamento", "Valor"]],
      body: [
        ["Horas totais faturadas", fmtHours(totalHours)],
        ["Valor de horas", brl(totals.hoursAmount)],
        ["Despesas detalhadas", brl(totals.exp)],
        ...Object.entries(expensesByCategory).map(([cat, amt]) => [
          `  └ ${cat.toUpperCase()}`,
          brl(amt),
        ]),
        ["Ferramentas aplicadas", brl(totals.tools)],
        ["Total faturado no período", brl(grandTotal)],
      ],
      styles: { fontSize: 9.5, cellPadding: 2.2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Consultor", "Horas", "Total"]],
      body: Object.entries(byConsultant).map(([name, v]) => [
        name,
        fmtHours(v.hours),
        brl(v.total),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. Quadro de Resumo de Pagamentos já baixados
  const payments = data.payments ?? [];
  if (payments.length > 0) {
    if (y > 210) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Pagamentos Efetuados pelo Cliente (Baixados)", M, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Data", "Forma / Método", "Referência / Observações", "Valor Pago"]],
      body: payments.map((p: any) => [
        fmtDate(p.paid_at),
        sanitize(p.method?.toUpperCase() || "PIX"),
        sanitize(p.reference || p.notes || "-"),
        brl(p.amount),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: EMERALD, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 32 },
        2: { cellWidth: 84 },
        3: { cellWidth: 34, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. Tabela de Resumo de Saldos / Histórico (Saldo Anterior, Faturado/Pago Atual, Saldo Atual)
  const saldoAnterior = data.previousBalance || 0;
  const faturadoPeriodo = grandTotal;
  const pagoPeriodo = payments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
  const saldoAtual = Math.round((saldoAnterior + faturadoPeriodo - pagoPeriodo) * 100) / 100;

  if (y > 200) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Resumo de Saldos e Conta Corrente", M, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Histórico / Movimentação", "Horas", "Saldo (R$)"]],
    body: [
      ["Saldo Anterior (mês anterior)", fmtHours(data.previousHours || 0), brl(saldoAnterior)],
      ["Horas Faturadas (período atual)", fmtHours(totalHours), brl(faturadoPeriodo)],
      ["Pagamentos Efetuados / Baixados (período atual)", "-", `(-) ${brl(pagoPeriodo)}`],
      ["SALDO ATUAL CONSOLIDADO", fmtHours(totalHours), brl(saldoAtual)],
    ],
    styles: { fontSize: 9.5, cellPadding: 2.8 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 32, halign: "right" },
      2: { cellWidth: 39, halign: "right" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === 3) {
        hookData.cell.styles.fillColor = [238, 242, 255];
        hookData.cell.styles.textColor = NAVY;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Numeração de páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `JARVIS - gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      M,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(`${i}/${pages}`, W - M, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`faturamento-${slug || "cliente"}-${mode}.pdf`);
}
