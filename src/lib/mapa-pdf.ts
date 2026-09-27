import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PillarMeta, MapaItem, MapaCompanyInfo } from "./mapa.functions";

/* ─── Dimensões e Cores Globais (A4 Paisagem) ─── */
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN_X = 14;
const CONTENT_BOTTOM = 194;

const COLOR_PRIMARY: [number, number, number] = [15, 23, 42]; // Slate-900
const COLOR_SECONDARY: [number, number, number] = [51, 65, 85]; // Slate-700
const COLOR_ACCENT: [number, number, number] = [37, 99, 235]; // Blue-600
const COLOR_MUTED: [number, number, number] = [100, 116, 139]; // Slate-500
const COLOR_BORDER: [number, number, number] = [226, 232, 240]; // Slate-200

/* ─── Helpers ─── */

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    aberto: "A iniciar",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    nao_sera_feito: "Não será feito",
  };
  return map[s] || s;
}

function criticidade(gutScore?: number | null): string {
  if (!gutScore) return "—";
  if (gutScore >= 75) return "Crítico";
  if (gutScore >= 40) return "Alto";
  if (gutScore >= 20) return "Médio";
  return "Baixo";
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

/**
 * Desenha um container elegante e insere o logo com proporções preservadas.
 * Se o logo falhar ou não existir, exibe o nome institucional no container.
 */
function drawLogoBox(
  pdf: jsPDF,
  dataUrl: string | null | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  fallbackText: string,
) {
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...COLOR_BORDER);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, maxW, maxH, 2, 2, "FD");

  if (dataUrl) {
    try {
      pdf.addImage(
        dataUrl,
        "PNG",
        x + 1.5,
        y + 1.5,
        maxW - 3,
        maxH - 3,
        undefined,
        "FAST",
      );
      return;
    } catch {
      /* fallback se imagem corrompida */
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLOR_MUTED);
  const truncated = pdf.splitTextToSize(fallbackText, maxW - 4);
  pdf.text(truncated, x + maxW / 2, y + maxH / 2 + 1, { align: "center" });
}

/**
 * Cabeçalho compacto para as páginas de conteúdo interno (Pág 2..N)
 */
function drawContentHeader(
  pdf: jsPDF,
  company: MapaCompanyInfo,
  pillarName?: string,
) {
  // Container branco do cabeçalho
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PAGE_W, 20, "F");

  // Logo consultoria à esquerda
  drawLogoBox(
    pdf,
    company.consultancy_logo,
    MARGIN_X,
    3,
    28,
    11,
    "MAIA",
  );

  // Logo empresa à direita
  drawLogoBox(
    pdf,
    company.company_logo,
    PAGE_W - MARGIN_X - 28,
    3,
    28,
    11,
    company.name,
  );

  // Textos centrais
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLOR_PRIMARY);
  pdf.text(
    `MAPA ESTRATÉGICO  |  ${company.name.toUpperCase()}${pillarName ? `  |  PILAR: ${pillarName.toUpperCase()}` : ""}`,
    PAGE_W / 2,
    9,
    { align: "center" },
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(
    `Desdobramento Executivo de Ações e Diretrizes  ·  Emissão: ${new Date().toLocaleDateString("pt-BR")}`,
    PAGE_W / 2,
    14,
    { align: "center" },
  );

  // Linha divisória
  pdf.setDrawColor(...COLOR_ACCENT);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, 17, PAGE_W - MARGIN_X, 17);
}

/* ─── Exportação Principal ─── */
export async function exportMapaPdf(opts: {
  company: MapaCompanyInfo;
  pillars: PillarMeta[];
  treeByPillar: Record<string, MapaItem[]>;
  items: MapaItem[];
}): Promise<void> {
  const { company, pillars, treeByPillar, items } = opts;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");

  /* ══════════════════════════════════════════════════════
     PÁGINA 1: DASHBOARD EXECUTIVO CONSOLIDADO
  ══════════════════════════════════════════════════════ */

  // Cabeçalho Institucional Superior (Branco/Sleek)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PAGE_W, 35, "F");

  // Barra de acento topo
  pdf.setFillColor(...COLOR_PRIMARY);
  pdf.rect(0, 0, PAGE_W, 3, "F");

  // Logos com containers seguros e não sobrepostos
  drawLogoBox(
    pdf,
    company.consultancy_logo,
    MARGIN_X,
    6,
    42,
    16,
    "MAIA CONSULTORIA",
  );
  drawLogoBox(
    pdf,
    company.company_logo,
    PAGE_W - MARGIN_X - 42,
    6,
    42,
    16,
    company.name,
  );

  // Título e Metadados Centrais
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...COLOR_PRIMARY);
  pdf.text("MAPA ESTRATÉGICO CORPORATIVO", PAGE_W / 2, 14, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(
    "Painel Executivo de Diretrizes e Desdobramentos Estratégicos",
    PAGE_W / 2,
    19.5,
    { align: "center" },
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLOR_SECONDARY);
  pdf.text(
    `Empresa: ${company.name}    |    Data de Emissão: ${dateStr}`,
    PAGE_W / 2,
    25.5,
    { align: "center" },
  );

  // Linha divisória
  pdf.setDrawColor(...COLOR_ACCENT);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN_X, 29, PAGE_W - MARGIN_X, 29);

  // Cálculo de Métricas Globais
  const totalDiretrizes = items.filter((i) => i.item_type === "diretriz").length;
  const acoes = items.filter((i) => i.item_type !== "diretriz");
  const totalAcoes = acoes.length;
  const concTotal = acoes.filter((i) => i.status === "concluido").length;
  const andaTotal = acoes.filter((i) => i.status === "em_andamento").length;
  const inicTotal = acoes.filter((i) => i.status === "aberto").length;
  const naoTotal = acoes.filter((i) => i.status === "nao_sera_feito").length;

  const activeAcoes = acoes.filter((i) => i.status !== "nao_sera_feito");
  const globalProgress =
    activeAcoes.length > 0
      ? Math.round(
          activeAcoes.reduce((acc, a) => acc + (a.progress_pct || 0), 0) /
            activeAcoes.length,
        )
      : 0;

  // ── Card de Resumo Geral (Avanço Global) ──
  const summaryY = 32;
  const summaryH = 22;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(...COLOR_BORDER);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(MARGIN_X, summaryY, PAGE_W - 2 * MARGIN_X, summaryH, 2, 2, "FD");

  // Bloco Avanço Global
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text("AVANÇO GLOBAL DO MAPA", MARGIN_X + 6, summaryY + 6);

  pdf.setFontSize(18);
  pdf.setTextColor(...COLOR_ACCENT);
  pdf.text(`${globalProgress}%`, MARGIN_X + 6, summaryY + 14);

  // Barra de progresso global
  const barW = 48;
  pdf.setFillColor(226, 232, 240);
  pdf.roundedRect(MARGIN_X + 6, summaryY + 16, barW, 2.5, 1, 1, "F");
  if (globalProgress > 0) {
    pdf.setFillColor(...COLOR_ACCENT);
    pdf.roundedRect(
      MARGIN_X + 6,
      summaryY + 16,
      (barW * Math.min(globalProgress, 100)) / 100,
      2.5,
      1,
      1,
      "F",
    );
  }

  // Divisor vertical
  pdf.setDrawColor(...COLOR_BORDER);
  pdf.line(MARGIN_X + 60, summaryY + 3, MARGIN_X + 60, summaryY + summaryH - 3);

  // 4 Caixas de Métricas Rápidas
  const kpiX = MARGIN_X + 66;
  const kpiW = (PAGE_W - 2 * MARGIN_X - 66) / 4;

  const kpis = [
    {
      title: "ESTRUTURA",
      val: `${totalDiretrizes} Dir. · ${totalAcoes} Ações`,
      color: COLOR_PRIMARY,
    },
    {
      title: "CONCLUÍDAS",
      val: `${concTotal} ações (${totalAcoes > 0 ? Math.round((concTotal / totalAcoes) * 100) : 0}%)`,
      color: [22, 101, 52] as [number, number, number],
    },
    {
      title: "EM ANDAMENTO",
      val: `${andaTotal} ações (${totalAcoes > 0 ? Math.round((andaTotal / totalAcoes) * 100) : 0}%)`,
      color: [37, 99, 235] as [number, number, number],
    },
    {
      title: "A INICIAR / NÃO FARÁ",
      val: `${inicTotal} a iniciar · ${naoTotal} não fará`,
      color: [180, 83, 9] as [number, number, number],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = kpiX + idx * kpiW;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLOR_MUTED);
    pdf.text(kpi.title, xPos, summaryY + 7);

    pdf.setFontSize(10);
    pdf.setTextColor(...kpi.color);
    pdf.text(kpi.val, xPos, summaryY + 15);
  });

  // ── Cards dos Pilares Estratégicos ──
  const pilarHeaderY = 59;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...COLOR_PRIMARY);
  pdf.text("INDICADORES CONSOLIDADOS POR PILAR", MARGIN_X, pilarHeaderY);

  const cols = Math.min(pillars.length, 3);
  const cardGap = 6;
  const cardW = (PAGE_W - 2 * MARGIN_X - (cols - 1) * cardGap) / cols;
  const cardH = 126;
  const cardStartY = 63;

  pillars.slice(0, 3).forEach((pilar, idx) => {
    const cardX = MARGIN_X + idx * (cardW + cardGap);
    const cardY = cardStartY;

    // Fundo do card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...COLOR_BORDER);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, "FD");

    // Banner de cabeçalho do pilar
    let headerColor: [number, number, number] = COLOR_PRIMARY;
    if (pilar.key === "pessoas") headerColor = [124, 58, 237]; // Violet
    else if (pilar.key === "processo") headerColor = [37, 99, 235]; // Blue
    else if (pilar.key === "negocio") headerColor = [5, 150, 105]; // Emerald
    else headerColor = [217, 119, 6]; // Amber

    pdf.setFillColor(...headerColor);
    pdf.roundedRect(cardX, cardY, cardW, 14, 2.5, 2.5, "F");
    pdf.rect(cardX, cardY + 10, cardW, 4, "F"); // remove arredondamento inferior

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(pilar.name, cardX + cardW / 2, cardY + 7, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(
      `${pilar.total_diretrizes} Diretrizes  ·  ${pilar.total_desdobramentos} Ações`,
      cardX + cardW / 2,
      cardY + 11.5,
      { align: "center" },
    );

    // Destaque de Avanço %
    const metricY = cardY + 20;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLOR_MUTED);
    pdf.text("PERCENTUAL DE AVANÇO", cardX + 6, metricY + 4);

    pdf.setFontSize(20);
    pdf.setTextColor(...headerColor);
    pdf.text(`${pilar.progress_pct}%`, cardX + cardW - 6, metricY + 6, {
      align: "right",
    });

    // Barra de progresso visual do pilar
    const pBarW = cardW - 12;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(cardX + 6, metricY + 10, pBarW, 3.5, 1, 1, "F");
    if (pilar.progress_pct > 0) {
      pdf.setFillColor(...headerColor);
      pdf.roundedRect(
        cardX + 6,
        metricY + 10,
        (pBarW * Math.min(pilar.progress_pct, 100)) / 100,
        3.5,
        1,
        1,
        "F",
      );
    }

    // Status breakdown (4 mini-cards)
    const breakdownY = metricY + 18;
    const statusItems = [
      {
        label: "Concluídas",
        count: pilar.concluidas,
        color: [22, 101, 52] as [number, number, number],
        bg: [240, 253, 244] as [number, number, number],
      },
      {
        label: "Em andamento",
        count: pilar.em_andamento,
        color: [30, 64, 175] as [number, number, number],
        bg: [239, 246, 255] as [number, number, number],
      },
      {
        label: "A iniciar",
        count: pilar.a_iniciar,
        color: [71, 85, 105] as [number, number, number],
        bg: [248, 250, 252] as [number, number, number],
      },
      {
        label: "Não será feito",
        count: pilar.nao_sera_feito,
        color: [153, 27, 27] as [number, number, number],
        bg: [254, 242, 242] as [number, number, number],
      },
    ];

    statusItems.forEach((st, sIdx) => {
      const rowY = breakdownY + sIdx * 8.5;
      pdf.setFillColor(...st.bg);
      pdf.setDrawColor(...COLOR_BORDER);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(cardX + 6, rowY, cardW - 12, 7, 1, 1, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...st.color);
      pdf.text(st.label, cardX + 9, rowY + 4.5);
      pdf.text(
        `${st.count} ${st.count === 1 ? "ação" : "ações"}`,
        cardX + cardW - 9,
        rowY + 4.5,
        { align: "right" },
      );
    });

    // Diretrizes deste pilar (prévia)
    const previewY = breakdownY + 39;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLOR_PRIMARY);
    pdf.text("DIRETRIZES DO PILAR:", cardX + 6, previewY);

    const pillarRoots = treeByPillar[pilar.key] || [];
    if (pillarRoots.length === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...COLOR_MUTED);
      pdf.text("Nenhuma diretriz cadastrada.", cardX + 6, previewY + 6);
    } else {
      let dCursorY = previewY + 4.5;
      pillarRoots.slice(0, 4).forEach((dir, dIdx) => {
        if (dCursorY > cardY + cardH - 5) return;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(...headerColor);
        pdf.text(`${dIdx + 1}.`, cardX + 6, dCursorY);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLOR_SECONDARY);
        const dirTitle = pdf.splitTextToSize(dir.title, cardW - 18) as string[];
        pdf.text(dirTitle[0] || "", cardX + 10, dCursorY);
        dCursorY += 4.5;
      });
      if (pillarRoots.length > 4) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(6);
        pdf.setTextColor(...COLOR_MUTED);
        pdf.text(
          `+ ${pillarRoots.length - 4} diretrizes no detalhamento...`,
          cardX + 6,
          cardY + cardH - 3,
        );
      }
    }
  });

  /* ══════════════════════════════════════════════════════
     PÁGINAS SEGUINTES: DETALHAMENTO COMPLETO POR PILAR
  ══════════════════════════════════════════════════════ */

  for (const pilar of pillars) {
    const roots = treeByPillar[pilar.key] || [];
    if (roots.length === 0) continue;

    // Nova página dedicada para o pilar
    pdf.addPage();
    drawContentHeader(pdf, company, pilar.name);

    let cursorY = 22;

    // Banner do Pilar
    let pillarBg: [number, number, number] = COLOR_PRIMARY;
    if (pilar.key === "pessoas") pillarBg = [124, 58, 237];
    else if (pilar.key === "processo") pillarBg = [37, 99, 235];
    else if (pilar.key === "negocio") pillarBg = [5, 150, 105];
    else pillarBg = [217, 119, 6];

    pdf.setFillColor(...pillarBg);
    pdf.roundedRect(MARGIN_X, cursorY, PAGE_W - 2 * MARGIN_X, 8, 1.5, 1.5, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(
      `PILAR: ${pilar.name.toUpperCase()}`,
      MARGIN_X + 4,
      cursorY + 5.2,
    );
    pdf.text(
      `${pilar.total_diretrizes} Diretrizes  ·  ${pilar.total_desdobramentos} Ações de Desdobramento  ·  ${pilar.progress_pct}% de Avanço Consolidado`,
      PAGE_W - MARGIN_X - 4,
      cursorY + 5.2,
      { align: "right" },
    );

    cursorY += 12;

    for (let dIdx = 0; dIdx < roots.length; dIdx++) {
      const diretriz = roots[dIdx];
      const children = diretriz.children || [];

      // Quebra de página se não houver espaço suficiente para o cabeçalho da diretriz + 1 linha da tabela
      if (cursorY + 36 > CONTENT_BOTTOM) {
        pdf.addPage();
        drawContentHeader(pdf, company, pilar.name);
        cursorY = 24;
      }

      // Bloco da Diretriz (Mãe)
      const dirBoxH = diretriz.observations ? 14 : 10;
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(...COLOR_BORDER);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(
        MARGIN_X,
        cursorY,
        PAGE_W - 2 * MARGIN_X,
        dirBoxH,
        1.5,
        1.5,
        "FD",
      );

      // Indicador vertical colorido à esquerda
      pdf.setFillColor(...pillarBg);
      pdf.roundedRect(MARGIN_X, cursorY, 2.5, dirBoxH, 1, 1, "F");

      // Título da Diretriz
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...COLOR_PRIMARY);
      pdf.text(
        `DIRETRIZ ${dIdx + 1}: ${diretriz.title}`,
        MARGIN_X + 6,
        cursorY + 6,
      );

      // Metadados à direita
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...COLOR_ACCENT);
      pdf.text(
        `Avanço: ${diretriz.progress_pct}%  ·  Status: ${statusLabel(diretriz.status)}  ·  (${children.length} ${children.length === 1 ? "ação" : "ações"})`,
        PAGE_W - MARGIN_X - 6,
        cursorY + 6,
        { align: "right" },
      );

      // Descrição breve se existir
      if (diretriz.observations) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7);
        pdf.setTextColor(...COLOR_MUTED);
        const desc = pdf.splitTextToSize(
          diretriz.observations,
          PAGE_W - 2 * MARGIN_X - 12,
        );
        pdf.text(desc[0] || "", MARGIN_X + 6, cursorY + 11);
      }

      cursorY += dirBoxH + 2;

      // Se a diretriz não tem ações cadastradas
      if (children.length === 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7);
        pdf.setTextColor(...COLOR_MUTED);
        pdf.text(
          "Nenhuma ação de desdobramento cadastrada para esta diretriz.",
          MARGIN_X + 8,
          cursorY + 4,
        );
        cursorY += 8;
        continue;
      }

      // Preparação dos dados da tabela de ações de desdobramento
      const tableData = children.map((sub, sIdx) => {
        // Título + Detalhamento Completo (Sem corte de informações)
        let actionCell = sub.title;
        const details: string[] = [];
        if (sub.problem) details.push(`• Problema: ${sub.problem}`);
        if (sub.cause) details.push(`• Causa: ${sub.cause}`);
        if (sub.description) details.push(`• Descrição: ${sub.description}`);
        if (sub.expected_result) details.push(`• Resultado Esperado: ${sub.expected_result}`);
        if (details.length > 0) {
          actionCell += "\n" + details.join("\n");
        }

        // Responsável, Setor e Origem
        let respCell = sub.responsible || "—";
        if (sub.sector) respCell += `\nSetor: ${sub.sector}`;
        if (sub.origin) respCell += `\nOrigem: ${sub.origin}`;

        // Matriz GUT
        let gutCell = "—";
        if (sub.gut_score) {
          gutCell = `GUT: ${sub.gut_score}\n(${criticidade(sub.gut_score)})\nG:${sub.gravity || "-"} U:${sub.urgency || "-"} T:${sub.trend || "-"}`;
        }

        return [
          `${dIdx + 1}.${sIdx + 1}`,
          actionCell,
          respCell,
          fmtDate(sub.due_date),
          statusLabel(sub.status),
          `${sub.progress_pct}%`,
          gutCell,
        ];
      });

      // Tabela de Desdobramentos com jspdf-autotable
      autoTable(pdf, {
        startY: cursorY,
        head: [
          [
            "#",
            "Ação de Desdobramento & Detalhamento",
            "Responsável / Setor",
            "Prazo",
            "Status",
            "Avanço",
            "Matriz GUT",
          ],
        ],
        body: tableData,
        theme: "grid",
        margin: { top: 22, bottom: 16, left: MARGIN_X, right: MARGIN_X },
        headStyles: {
          fillColor: COLOR_PRIMARY,
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          cellPadding: 2,
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: "top",
          overflow: "linebreak",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 116 }, // Amplo espaço para texto e detalhes completos
          2: { cellWidth: 42 },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 26, halign: "center", fontStyle: "bold" },
          5: { cellWidth: 17, halign: "center", fontStyle: "bold" },
          6: { cellWidth: 24, halign: "center" },
        },
        didParseCell: (data) => {
          // Destacar células de status com cores profissionais
          if (data.section === "body" && data.column.index === 4) {
            const rawStatus = children[data.row.index]?.status;
            if (rawStatus === "concluido") {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fillColor = [240, 253, 244];
            } else if (rawStatus === "em_andamento") {
              data.cell.styles.textColor = [30, 64, 175];
              data.cell.styles.fillColor = [239, 246, 255];
            } else if (rawStatus === "nao_sera_feito") {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fillColor = [254, 242, 242];
            } else {
              data.cell.styles.textColor = [71, 85, 105];
              data.cell.styles.fillColor = [248, 250, 252];
            }
          }
          // Destacar criticidade GUT
          if (data.section === "body" && data.column.index === 6) {
            const gut = children[data.row.index]?.gut_score;
            if (gut && gut >= 75) {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
        didDrawPage: () => {
          // Garante que páginas criadas automaticamente pela quebra da tabela tenham o cabeçalho correto
          drawContentHeader(pdf, company, pilar.name);
        },
      });

      cursorY = ((pdf as any).lastAutoTable?.finalY ?? cursorY) + 6;
    }
  }

  /* ══════════════════════════════════════════════════════
     PASSAGEM FINAL: RODAPÉS E NUMERAÇÃO DE TODAS AS PÁGINAS
  ══════════════════════════════════════════════════════ */
  const totalPages = pdf.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    pdf.setPage(pNum);

    // Linha divisória do rodapé
    pdf.setDrawColor(...COLOR_BORDER);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_X, PAGE_H - 10, PAGE_W - MARGIN_X, PAGE_H - 10);

    // Textos do rodapé
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLOR_MUTED);
    pdf.text(
      `JARVIS Gestão Estratégica  |  ${company.name}  |  Documento Confidencial`,
      MARGIN_X,
      PAGE_H - 6,
    );
    pdf.text(
      `Página ${pNum} de ${totalPages}`,
      PAGE_W - MARGIN_X,
      PAGE_H - 6,
      { align: "right" },
    );
  }

  /* ── Download do arquivo ── */
  const safeName = company.name
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "")
    .replace(/\s+/g, "_");
  pdf.save(
    `Mapa_Estrategico_${safeName}_${now.toISOString().slice(0, 10)}.pdf`,
  );
}
