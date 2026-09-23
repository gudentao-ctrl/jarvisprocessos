import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PillarMeta, MapaItem, MapaCompanyInfo } from "./mapa.functions";

/* ─── helpers ─── */

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    aberto: "A iniciar",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    nao_sera_feito: "Não será feito",
  };
  return map[s] || s;
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

function safeAddImage(
  pdf: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  try {
    pdf.addImage(dataUrl, "PNG", x, y, w, h);
  } catch {
    /* logo inválido — ignora */
  }
}

/* ─── constantes ─── */
const PRIMARY = "#0f172a";
const ACCENT = "#3b82f6";
const GRAY_BG = "#f1f5f9";
const MUTED = "#64748b";

/* ─── exportação principal ─── */
export async function exportMapaPdf(opts: {
  company: MapaCompanyInfo;
  pillars: PillarMeta[];
  treeByPillar: Record<string, MapaItem[]>;
  items: MapaItem[];
}): Promise<void> {
  const { company, pillars, treeByPillar } = opts;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = pdf.internal.pageSize.getWidth(); // ~297
  const pageH = pdf.internal.pageSize.getHeight(); // ~210
  const marginX = 14;
  const contentTop = 26;
  const contentBottom = pageH - 16;

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");

  let pageNum = 1;

  /* ── header / footer ── */
  function drawHeader() {
    pdf.setDrawColor(PRIMARY);
    pdf.setLineWidth(0.4);
    pdf.line(marginX, 18, pageW - marginX, 18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(PRIMARY);
    pdf.text(company.name.slice(0, 60), marginX, 13);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(ACCENT);
    pdf.text("Mapa Estratégico", pageW / 2, 13, { align: "center" });
    pdf.setTextColor(MUTED);
    pdf.text(dateStr, pageW - marginX, 13, { align: "right" });

    if (company.consultancy_logo) {
      safeAddImage(pdf, company.consultancy_logo, marginX, 2, 30, 10);
    }
    if (company.company_logo) {
      safeAddImage(pdf, company.company_logo, pageW - marginX - 30, 2, 30, 10);
    }
  }

  function drawFooter() {
    pdf.setDrawColor("#cbd5e1");
    pdf.setLineWidth(0.2);
    pdf.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(MUTED);
    pdf.text("Mapa Estratégico — Confidencial", marginX, pageH - 8);
    pdf.text(`Pág ${pageNum}`, pageW - marginX, pageH - 8, { align: "right" });
  }

  function addContentPage(): number {
    pdf.addPage();
    pageNum++;
    drawHeader();
    drawFooter();
    return contentTop;
  }

  function ensureSpace(cursorY: number, needed: number): number {
    if (cursorY + needed > contentBottom) {
      return addContentPage();
    }
    return cursorY;
  }

  /* ════════ CAPA ════════ */
  // Faixa escura no topo
  pdf.setFillColor(PRIMARY);
  pdf.rect(0, 0, pageW, 58, "F");

  // Logos na capa
  if (company.consultancy_logo) {
    safeAddImage(pdf, company.consultancy_logo, marginX, 6, 36, 14);
  }
  if (company.company_logo) {
    safeAddImage(pdf, company.company_logo, pageW - marginX - 36, 6, 36, 14);
  }

  // Título na faixa
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("MAPA ESTRATÉGICO", pageW / 2, 28, { align: "center" });
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "normal");
  pdf.text(company.name, pageW / 2, 40, { align: "center" });
  pdf.setFontSize(10);
  pdf.text(dateStr, pageW / 2, 50, { align: "center" });

  // ── Resumo dos pilares na capa ──
  pdf.setTextColor(PRIMARY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Pilares Estratégicos", marginX, 70);

  const gap = 8;
  const cols = Math.min(pillars.length, 3);
  const boxW = (pageW - 2 * marginX - (cols - 1) * gap) / cols;
  const boxH = 38;
  let startY = 76;

  pillars.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = marginX + col * (boxW + gap);
    const y = startY + row * (boxH + gap);

    // Background
    pdf.setFillColor(GRAY_BG);
    pdf.roundedRect(x, y, boxW, boxH, 2, 2, "F");

    // Pillar name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(PRIMARY);
    pdf.text(p.name, x + 4, y + 8);

    // Progress %
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(ACCENT);
    pdf.text(`${p.progress_pct}%`, x + boxW - 6, y + 10, { align: "right" });

    // Progress bar
    const barX = x + 4;
    const barY = y + 13;
    const barW = boxW - 8;
    const barH = 3;
    pdf.setFillColor("#e2e8f0");
    pdf.roundedRect(barX, barY, barW, barH, 1, 1, "F");
    if (p.progress_pct > 0) {
      pdf.setFillColor(ACCENT);
      pdf.roundedRect(barX, barY, barW * Math.min(p.progress_pct, 100) / 100, barH, 1, 1, "F");
    }

    // Counts
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    const counts = [
      `✓ ${p.concluidas} Concl.`,
      `▸ ${p.em_andamento} Andamento`,
      `○ ${p.a_iniciar} Iniciar`,
      `✗ ${p.nao_sera_feito} N/Fará`,
    ];
    counts.forEach((txt, ci) => {
      pdf.text(txt, x + 4, y + 22 + ci * 4);
    });

    pdf.setFontSize(7);
    pdf.setTextColor("#475569");
    pdf.text(
      `${p.total_diretrizes} dir. · ${p.total_desdobramentos} ações`,
      x + boxW - 6,
      y + boxH - 4,
      { align: "right" },
    );
  });

  /* ════════ PÁGINAS POR PILAR ════════ */
  for (const pilar of pillars) {
    const roots = treeByPillar[pilar.key] || [];
    if (roots.length === 0) continue;

    let cursorY = addContentPage();

    // Section title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(PRIMARY);
    pdf.text(pilar.name, marginX, cursorY);
    cursorY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED);
    pdf.text(
      `${pilar.total_diretrizes} diretrizes · ${pilar.total_desdobramentos} ações · ${pilar.progress_pct}% avanço`,
      marginX,
      cursorY,
    );
    cursorY += 8;

    for (let dIdx = 0; dIdx < roots.length; dIdx++) {
      const diretriz = roots[dIdx];
      const children = diretriz.children || [];

      cursorY = ensureSpace(cursorY, 20);

      // Diretriz block
      pdf.setFillColor(GRAY_BG);
      pdf.roundedRect(marginX, cursorY - 3, pageW - 2 * marginX, 14, 1.5, 1.5, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(PRIMARY);
      pdf.text(`${dIdx + 1}. ${diretriz.title}`, marginX + 4, cursorY + 4);

      // Status + progress
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(MUTED);
      const dirInfo = `${statusLabel(diretriz.status)} · ${diretriz.progress_pct}% · ${children.length} ${children.length === 1 ? "ação" : "ações"}`;
      pdf.text(dirInfo, pageW - marginX - 4, cursorY + 4, { align: "right" });

      cursorY += 14;

      // Description (if any)
      if (diretriz.observations) {
        cursorY = ensureSpace(cursorY, 8);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7);
        pdf.setTextColor("#475569");
        const descLines = pdf.splitTextToSize(diretriz.observations, pageW - 2 * marginX - 12) as string[];
        pdf.text(descLines.slice(0, 3), marginX + 6, cursorY);
        cursorY += Math.min(descLines.length, 3) * 3.5 + 2;
      }

      // Children table
      if (children.length > 0) {
        const tableData = children.map((sub, si) => [
          `${dIdx + 1}.${si + 1}`,
          sub.title || "",
          sub.responsible || "—",
          sub.sector || "—",
          fmtDate(sub.due_date),
          statusLabel(sub.status),
          `${sub.progress_pct}%`,
          sub.gut_score ? String(sub.gut_score) : "—",
        ]);

        autoTable(pdf, {
          startY: cursorY,
          head: [["#", "Ação / Desdobramento", "Responsável", "Setor", "Prazo", "Status", "Avanço", "GUT"]],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: PRIMARY,
            textColor: "#ffffff",
            fontSize: 7,
            fontStyle: "bold",
            cellPadding: 1.5,
          },
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            textColor: "#1e293b",
            lineColor: "#e2e8f0",
            lineWidth: 0.2,
          },
          alternateRowStyles: { fillColor: "#f8fafc" },
          columnStyles: {
            0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 26 },
            3: { cellWidth: 22 },
            4: { cellWidth: 20 },
            5: { cellWidth: 22 },
            6: { cellWidth: 16, halign: "center" },
            7: { cellWidth: 14, halign: "center" },
          },
          margin: { left: marginX + 6, right: marginX },
          didDrawPage: () => {
            drawHeader();
            drawFooter();
          },
        });

        cursorY = (pdf as any).lastAutoTable?.finalY ?? cursorY + 20;
        cursorY += 3;

        // Detail subsections for children with extra info
        const detailed = children.filter(
          (c) => c.problem || c.cause || c.description || c.expected_result,
        );

        if (detailed.length > 0) {
          cursorY = ensureSpace(cursorY, 10);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.setTextColor(ACCENT);
          pdf.text("Detalhamentos das ações:", marginX + 6, cursorY);
          cursorY += 4;

          for (const child of detailed) {
            cursorY = ensureSpace(cursorY, 16);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(PRIMARY);
            pdf.text(`▸ ${child.title}`, marginX + 8, cursorY);
            cursorY += 3.5;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            pdf.setTextColor("#475569");

            const fields: [string, string | null | undefined][] = [
              ["Problema", child.problem],
              ["Causa", child.cause],
              ["Descrição", child.description],
              ["Resultado Esperado", child.expected_result],
            ];

            for (const [label, value] of fields) {
              if (!value) continue;
              cursorY = ensureSpace(cursorY, 8);
              const lines = pdf.splitTextToSize(
                `${label}: ${value}`,
                pageW - 2 * marginX - 22,
              ) as string[];
              pdf.text(lines.slice(0, 4), marginX + 12, cursorY);
              cursorY += Math.min(lines.length, 4) * 3 + 1;
            }

            cursorY += 2;
          }
        }
      }

      cursorY += 4;
    }
  }

  /* ── salvar ── */
  const safeName = company.name.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_");
  pdf.save(`Mapa_Estrategico_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
}
