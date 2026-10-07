import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PaymentMethodMaia {
  id?: string;
  tipoChave: "CNPJ" | "TELEFONE" | "EMAIL" | "ALEATORIA" | "DADOS_BANCARIOS";
  chavePix: string;
  banco: string;
  favorecido: string;
  qrCodeUrl?: string; // Imagem em base64 ou URL
  isDefault?: boolean;
}

export interface InvoiceDRECalculation {
  saldoAnteriorFaturado: number;
  saldoAnteriorPago: number;
  saldoAnteriorPendente: number;
  faturadoAtual: number;
  pagoNoCicloAtual: number;
  saldoAtualPendente: number;
  totalLiquidoAPagar: number;
  isQuitadoAnterior: boolean;
  alertaQuitacaoParcial?: string | null;
}

export interface InvoiceReportData {
  company: {
    id?: string;
    name: string;
    title?: string | null;
    company_logo?: string | null;
    consultancy_logo?: string | null;
    cnpj?: string | null;
  } | null;
  period: {
    from: string | null;
    to: string | null;
  };
  invoiceId?: string;
  invoiceNumber?: string;
  invoicedAt?: string;
  hourlyRate: number;
  totalHours: number;
  totalHorasR$: number;
  totalDespesasR$: number;
  totalFerramentasR$: number;
  expensesBreakdown?: Record<string, number>;
  rows?: any[]; // Itens detalhados por consultor
  dre: InvoiceDRECalculation;
  notes?: string;
}

const BRAND = {
  vinho: "#3E100C",
  vinhoRGB: [62, 16, 12] as [number, number, number],
  laranja: "#E05A10",
  laranjaRGB: [224, 90, 16] as [number, number, number],
  bgCreme: "#FFF8F5",
  bgCremeRGB: [255, 248, 245] as [number, number, number],
  texto: "#2B1B17",
  textoRGB: [43, 27, 23] as [number, number, number],
  bordaSuave: "#E5D5CE",
  bordaSuaveRGB: [229, 213, 206] as [number, number, number],
  cinzaSuave: "#7A6863",
  cinzaSuaveRGB: [122, 104, 99] as [number, number, number],
};

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtHours = (h: number) => {
  const t = Math.round(Number(h ?? 0) * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const fmtDate = (d?: string | null) => (d ? String(d).split("-").reverse().join("/") : "-");

function sanitize(v?: string | null) {
  return (v ?? "").replace(
    /[\u2265\u2264\u2260\u2248\u00b1\u2192\u2190\u2022\u2011\u2212\u200b\u00a0\u2013\u2014\u2018\u2019\u201c\u201d]/g,
    (c) =>
      c === "\u2013" || c === "\u2014" || c === "\u2212"
        ? "-"
        : c === "\u2018" || c === "\u2019"
          ? "'"
          : c === "\u201c" || c === "\u201d"
            ? '"'
            : " ",
  );
}

function drawLogoSafe(
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
    const format = /^data:image\/jpe?g/i.test(dataUrl) ? "JPEG" : "PNG";
    doc.addImage(dataUrl, format, px, y + (maxH - h) / 2, w, h);
  } catch {
    /* Logo não disponível ou formato inválido */
  }
}

/**
 * Calcula a DRE de Conciliação Financeira
 */
export function calculateInvoiceDRE(params: {
  saldoAnteriorFaturado: number;
  saldoAnteriorPago: number;
  faturadoAtual: number;
  pagoNoCicloAtual?: number;
  pastInvoices?: unknown[];
}): InvoiceDRECalculation {
  const faturadoAnt = Math.round(Number(params.saldoAnteriorFaturado || 0) * 100) / 100;
  const pagoAnt = Math.round(Number(params.saldoAnteriorPago || 0) * 100) / 100;
  const saldoAnt = Math.round((faturadoAnt - pagoAnt) * 100) / 100;

  const fatAtual = Math.round(Number(params.faturadoAtual || 0) * 100) / 100;
  const pagoCiclo = Math.round(Number(params.pagoNoCicloAtual || 0) * 100) / 100;
  const saldoAtual = Math.round((fatAtual - pagoCiclo) * 100) / 100;

  const totalLiquido = Math.round((saldoAnt + saldoAtual) * 100) / 100;
  const isQuitadoAnterior = saldoAnt <= 0.01;

  let alertaQuitacaoParcial: string | null = null;
  if (saldoAnt > 0.01 && pagoAnt > 0) {
    alertaQuitacaoParcial = `Atenção: Identificamos um saldo remanescente de ${brl(
      saldoAnt,
    )} do período anterior inserido nesta fatura.`;
  }

  return {
    saldoAnteriorFaturado: faturadoAnt,
    saldoAnteriorPago: pagoAnt,
    saldoAnteriorPendente: saldoAnt,
    faturadoAtual: fatAtual,
    pagoNoCicloAtual: pagoCiclo,
    saldoAtualPendente: saldoAtual,
    totalLiquidoAPagar: totalLiquido,
    isQuitadoAnterior,
    alertaQuitacaoParcial,
  };
}

/**
 * Renderiza o cabeçalho oficial Maia Consultoria no topo da página
 */
function renderHeader(doc: jsPDF, data: InvoiceReportData, pageW: number, margin: number, pageTitle: string) {
  const headerHeight = 34;

  // Faixa superior Vinho / Bordô Principal #3E100C
  doc.setFillColor(...BRAND.vinhoRGB);
  doc.rect(0, 0, pageW, headerHeight, "F");

  // Barra de realce Laranja Vibrante #E05A10
  doc.setFillColor(...BRAND.laranjaRGB);
  doc.rect(0, headerHeight, pageW, 1.8, "F");

  const logoH = 20;
  const logoTop = 7;
  let textLeft = margin;

  // Logo Maia Consultoria (lado esquerdo ou padrão)
  if (data.company?.consultancy_logo) {
    drawLogoSafe(doc, data.company.consultancy_logo, margin, logoTop, 36, logoH, "left");
    textLeft = margin + 40;
  }

  // Logo do Cliente (lado direito)
  if (data.company?.company_logo) {
    drawLogoSafe(doc, data.company.company_logo, pageW - margin, logoTop, 32, logoH, "right");
  }

  // Título e dados da consultoria
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(pageTitle.toUpperCase(), textLeft, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(245, 230, 226);
  const companyName = sanitize(data.company?.name ?? "Cliente");
  const periodText =
    data.period.from || data.period.to
      ? `Período: ${fmtDate(data.period.from)} a ${fmtDate(data.period.to)}`
      : "Período: Todo o ciclo";
  doc.text(`Cliente: ${companyName}  |  ${periodText}`, textLeft, 20.5);

  if (data.invoiceNumber || data.invoiceId) {
    const invLabel = data.invoiceNumber ? `Fatura #${data.invoiceNumber}` : `Fatura ID: ${data.invoiceId?.slice(0, 8)}`;
    doc.text(`${invLabel}  |  Emissão: ${data.invoicedAt ? fmtDate(data.invoicedAt) : new Date().toLocaleDateString("pt-BR")}`, textLeft, 26.5);
  }
}

/**
 * Renderiza a Tabela de DRE de Conciliação Financeira
 */
function renderDRETable(doc: jsPDF, dre: InvoiceDRECalculation, startY: number, pageW: number, margin: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.vinhoRGB);
  doc.text("1. Demonstrativo de Conciliação Financeira (DRE)", margin, startY);

  let currentY = startY + 3;

  // Alerta de Quitação Parcial se houver saldo anterior remanescente
  if (dre.alertaQuitacaoParcial) {
    const boxW = pageW - margin * 2;
    doc.setFillColor(254, 243, 199); // Amarelo/laranja suave
    doc.setDrawColor(...BRAND.laranjaRGB);
    doc.roundedRect(margin, currentY, boxW, 8.5, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text(dre.alertaQuitacaoParcial, margin + 3.5, currentY + 5.5);
    currentY += 12;
  }

  const tableBody = [
    [
      "(+) Faturamentos Anteriores Pendentes",
      "Saldo acumulado de faturas passadas não quitadas integralmente",
      brl(dre.saldoAnteriorFaturado),
    ],
    [
      "(-) Pagamentos Efetuados em Faturas Anteriores",
      "Baixas e quitações parciais já consolidadas",
      `(-) ${brl(dre.saldoAnteriorPago)}`,
    ],
    [
      "(=) SALDO ANTERIOR RECLUSO/EM ABERTO",
      dre.isQuitadoAnterior ? "[QUITADO] - Nenhum débito pendente anterior" : "[DÉBITO PENDENTE] - Saldo remanescente anterior",
      brl(dre.saldoAnteriorPendente),
    ],
    [
      "(+) Faturamento do Período Atual",
      "Serviços prestados no ciclo atual (Horas + Ferramentas + Despesas)",
      brl(dre.faturadoAtual),
    ],
    [
      "(-) Pagamentos / Adiantamentos no Mês",
      "Entradas efetuadas no ciclo atual / adiantamentos recebidos",
      `(-) ${brl(dre.pagoNoCicloAtual)}`,
    ],
    [
      "(=) SALDO ATUAL DO PERÍODO",
      "Valor referente exclusivamente ao ciclo atual",
      brl(dre.saldoAtualPendente),
    ],
    [
      "(=) TOTAL LÍQUIDO A PAGAR HOJE",
      "TOTAL CONSOLIDADO PARA QUITAÇÃO (Saldo Anterior + Saldo Atual)",
      brl(dre.totalLiquidoAPagar),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Linha do Demonstrativo", "Composição / Status", "Valor (R$)"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.3,
      textColor: BRAND.textoRGB,
      lineColor: BRAND.bordaSuaveRGB,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.vinhoRGB,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: BRAND.bgCremeRGB,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: "bold" },
      1: { cellWidth: 75 },
      2: { cellWidth: 33, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Destaque da Linha 3 (Saldo Anterior)
      if (data.section === "body" && data.row.index === 2) {
        data.cell.styles.fillColor = dre.isQuitadoAnterior ? [240, 253, 244] : [254, 242, 242];
        data.cell.styles.textColor = dre.isQuitadoAnterior ? [22, 101, 52] : [153, 27, 27];
        data.cell.styles.fontStyle = "bold";
      }
      // Destaque da Linha 6 (Saldo Atual)
      if (data.section === "body" && data.row.index === 5) {
        data.cell.styles.fillColor = [248, 249, 250];
        data.cell.styles.fontStyle = "bold";
      }
      // Destaque Especial da Linha 7 (TOTAL LÍQUIDO A PAGAR HOJE - Laranja Vibrante #E05A10)
      if (data.section === "body" && data.row.index === 6) {
        data.cell.styles.fillColor = BRAND.laranjaRGB;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9.5;
      }
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

/**
 * Renderiza o Rodapé com Dados Bancários / Chave PIX e QR Code da Maia
 */
function renderPaymentFooter(
  doc: jsPDF,
  paymentMethod: PaymentMethodMaia,
  startY: number,
  pageW: number,
  pageH: number,
  margin: number,
) {
  const boxH = 34;
  let y = startY;

  // Se não couber na página, adiciona nova página
  if (y + boxH > pageH - 18) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.vinhoRGB);
  doc.text("Dados para Pagamento (Maia Consultoria)", margin, y);
  y += 3;

  const boxW = pageW - margin * 2;
  // Caixa de dados bancários com borda Vinho e fundo Creme
  doc.setFillColor(...BRAND.bgCremeRGB);
  doc.setDrawColor(...BRAND.vinhoRGB);
  doc.roundedRect(margin, y, boxW, boxH, 2, 2, "FD");

  // Faixa de destaque lateral laranja
  doc.setFillColor(...BRAND.laranjaRGB);
  doc.roundedRect(margin, y, 2.5, boxH, 1, 1, "F");

  // Informações de pagamento
  const infoX = margin + 6;
  let textY = y + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.vinhoRGB);
  doc.text(`Favorecido: ${paymentMethod.favorecido || "Maia Consultoria Empresarial LTDA"}`, infoX, textY);
  textY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.textoRGB);
  doc.text(`Banco: ${paymentMethod.banco || "Itaú Unibanco"}`, infoX, textY);
  textY += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.laranjaRGB);
  doc.text(`Chave PIX (${paymentMethod.tipoChave || "CNPJ"}): ${paymentMethod.chavePix || "58.291.890/0001-34"}`, infoX, textY);
  textY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.cinzaSuaveRGB);
  doc.text("Favor enviar o comprovante após a transferência para conciliação bancária.", infoX, textY);

  // QR Code PIX (se fornecido)
  const qrSize = 26;
  const qrX = pageW - margin - qrSize - 4;
  const qrY = y + (boxH - qrSize) / 2;

  if (paymentMethod.qrCodeUrl) {
    try {
      const format = /^data:image\/jpe?g/i.test(paymentMethod.qrCodeUrl) ? "JPEG" : "PNG";
      doc.addImage(paymentMethod.qrCodeUrl, format, qrX, qrY, qrSize, qrSize);
    } catch {
      // Placeholder se falhar
      drawQrPlaceholder(doc, qrX, qrY, qrSize);
    }
  } else {
    drawQrPlaceholder(doc, qrX, qrY, qrSize);
  }
}

function drawQrPlaceholder(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND.bordaSuaveRGB);
  doc.roundedRect(x, y, size, size, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.laranjaRGB);
  doc.text("PIX QR", x + size / 2, y + size / 2 - 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.cinzaSuaveRGB);
  doc.text("Pague pelo App", x + size / 2, y + size / 2 + 3.5, { align: "center" });
}

function renderPageNumbers(doc: jsPDF, pageW: number, pageH: number, margin: number) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.cinzaSuaveRGB);
    doc.text(
      `Maia Consultoria Empresarial · Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
      margin,
      pageH - 6.5,
    );
    doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 6.5, { align: "right" });
  }
}

/**
 * Função principal exportada: Gera os PDFs Resumido e Detalhado
 */
export async function generateMaiaInvoicePDFs(
  invoiceData: InvoiceReportData,
  paymentMethod: PaymentMethodMaia,
  _portalConfig?: any,
): Promise<{
  docResumido: jsPDF;
  docDetalhado: jsPDF;
  pdfResumidoBlob: Blob;
  pdfDetalhadoBlob: Blob;
  downloadResumido: (filename?: string) => void;
  downloadDetalhado: (filename?: string) => void;
}> {
  const pageW = 210;
  const pageH = 297;
  const margin = 14;

  const docResumido = new jsPDF({ unit: "mm", format: "a4" });
  const docDetalhado = new jsPDF({ unit: "mm", format: "a4" });

  const companySlug = (invoiceData.company?.name ?? "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // =========================================================================
  // 1. CONSTRUÇÃO DO PDF RESUMIDO
  // =========================================================================
  renderHeader(docResumido, invoiceData, pageW, margin, "Fatura & Demonstrativo Resumido");
  let yRes = 42;

  // Quadro de Resumo Operacional do Período Atual
  docResumido.setFont("helvetica", "bold");
  docResumido.setFontSize(10.5);
  docResumido.setTextColor(...BRAND.vinhoRGB);
  docResumido.text("Composição dos Serviços do Período", margin, yRes);
  yRes += 3;

  const expensesByCat = invoiceData.expensesBreakdown ?? {};
  const expRows = Object.entries(expensesByCat).map(([cat, val]) => [
    `  └ Despesa: ${cat.toUpperCase()}`,
    brl(val),
  ]);

  autoTable(docResumido, {
    startY: yRes,
    margin: { left: margin, right: margin },
    head: [["Item de Faturamento", "Total"]],
    body: [
      ["Horas Totais Faturadas", `${fmtHours(invoiceData.totalHours)} (${brl(invoiceData.totalHorasR$)})`],
      ["Despesas Operacionais", brl(invoiceData.totalDespesasR$)],
      ...expRows,
      ["Ferramentas Aplicadas", brl(invoiceData.totalFerramentasR$)],
      ["TOTAL FATURADO NO CICLO ATUAL", brl(invoiceData.dre.faturadoAtual)],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2, textColor: BRAND.textoRGB, lineColor: BRAND.bordaSuaveRGB, lineWidth: 0.2 },
    headStyles: { fillColor: BRAND.vinhoRGB, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BRAND.bgCremeRGB },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === 3 + expRows.length) {
        hook.cell.styles.fillColor = [240, 245, 255];
        hook.cell.styles.textColor = BRAND.vinhoRGB;
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });

  yRes = (docResumido as any).lastAutoTable.finalY + 8;

  // DRE de Conciliação
  yRes = renderDRETable(docResumido, invoiceData.dre, yRes, pageW, margin);

  // Rodapé com Dados Bancários e QR Code
  renderPaymentFooter(docResumido, paymentMethod, yRes, pageW, pageH, margin);
  renderPageNumbers(docResumido, pageW, pageH, margin);

  // =========================================================================
  // 2. CONSTRUÇÃO DO PDF DETALHADO (POR CONSULTOR E ATIVIDADES)
  // =========================================================================
  renderHeader(docDetalhado, invoiceData, pageW, margin, "Fatura & Relatório Detalhado por Consultor");
  let yDet = 42;

  // Agrupamento por consultor
  const rows = invoiceData.rows ?? [];
  const byConsultant: Record<string, any[]> = {};
  for (const r of rows) {
    const key = sanitize(r.responsible) || "Consultoria Técnica";
    (byConsultant[key] ??= []).push(r);
  }

  docDetalhado.setFont("helvetica", "bold");
  docDetalhado.setFontSize(10.5);
  docDetalhado.setTextColor(...BRAND.vinhoRGB);
  docDetalhado.text("Detalhamento Operacional de Lançamentos", margin, yDet);
  yDet += 4;

  for (const [consultantName, list] of Object.entries(byConsultant)) {
    const cHours = list.reduce((s, r) => s + Number(r.hours ?? 0), 0);
    const cTotal = list.reduce((s, r) => {
      const rate = Number(r.invoices?.hourly_rate ?? invoiceData.hourlyRate ?? 0);
      const hAmt = Math.round(Number(r.hours ?? 0) * rate * 100) / 100;
      const exp = (r.work_hour_expenses ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
      const tool = (r.work_hour_tools ?? []).reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
      return s + hAmt + exp + tool;
    }, 0);

    if (yDet > pageH - 45) {
      docDetalhado.addPage();
      yDet = 20;
    }

    docDetalhado.setFont("helvetica", "bold");
    docDetalhado.setFontSize(9.5);
    docDetalhado.setTextColor(...BRAND.vinhoRGB);
    docDetalhado.text(`Consultor: ${consultantName}  ·  ${fmtHours(cHours)}  ·  ${brl(cTotal)}`, margin, yDet);
    yDet += 2.5;

    autoTable(docDetalhado, {
      startY: yDet,
      margin: { left: margin, right: margin },
      head: [["Data", "Atividade", "Descrição & Despesas", "Horas", "Valor/h", "Desp.", "Ferr.", "Total"]],
      body: list.map((r) => {
        const rate = Number(r.invoices?.hourly_rate ?? invoiceData.hourlyRate ?? 0);
        const hAmt = Math.round(Number(r.hours ?? 0) * rate * 100) / 100;
        const exp = (r.work_hour_expenses ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
        const tool = (r.work_hour_tools ?? []).reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
        const tot = hAmt + exp + tool;

        const expDetail = (r.work_hour_expenses ?? [])
          .map((e: any) => `${e.category || "despesa"}: ${brl(e.amount)}`)
          .join(", ");

        let desc = sanitize(r.description) || "-";
        if (expDetail) desc += ` [${expDetail}]`;

        return [
          fmtDate(r.work_date),
          sanitize(r.activity_type) || "Consultoria",
          desc,
          fmtHours(r.hours),
          brl(rate),
          exp ? brl(exp) : "-",
          tool ? brl(tool) : "-",
          brl(tot),
        ];
      }),
      theme: "plain",
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: BRAND.textoRGB, lineColor: BRAND.bordaSuaveRGB, lineWidth: 0.15 },
      headStyles: { fillColor: BRAND.vinhoRGB, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: BRAND.bgCremeRGB },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 20 },
        2: { cellWidth: 62 },
        3: { cellWidth: 14, halign: "right" },
        4: { cellWidth: 16, halign: "right" },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 15, halign: "right" },
        7: { cellWidth: 19, halign: "right", fontStyle: "bold" },
      },
    });

    yDet = (docDetalhado as any).lastAutoTable.finalY + 6;
  }

  // DRE de Conciliação no PDF Detalhado
  if (yDet > pageH - 85) {
    docDetalhado.addPage();
    yDet = 20;
  }
  yDet = renderDRETable(docDetalhado, invoiceData.dre, yDet, pageW, margin);

  // Rodapé de Pagamento
  renderPaymentFooter(docDetalhado, paymentMethod, yDet, pageW, pageH, margin);
  renderPageNumbers(docDetalhado, pageW, pageH, margin);

  return {
    docResumido,
    docDetalhado,
    pdfResumidoBlob: docResumido.output("blob"),
    pdfDetalhadoBlob: docDetalhado.output("blob"),
    downloadResumido: (filename?: string) =>
      docResumido.save(filename || `fatura-resumida-${companySlug}.pdf`),
    downloadDetalhado: (filename?: string) =>
      docDetalhado.save(filename || `fatura-detalhada-${companySlug}.pdf`),
  };
}
