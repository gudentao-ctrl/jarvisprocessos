import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY: [number, number, number] = [17, 39, 78];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const PRIMARY: [number, number, number] = [37, 99, 235];

function sanitize(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u2022\u2011\u2212]/g, "-")
    .replace(/[\u00a0\u200b]/g, " ");
}

/**
 * Generates an executive PDF dossier for a candidate assessment report.
 * Returns a Blob suitable for browser download or preview.
 */
export async function generateAssessmentReport(candidate: any): Promise<Blob> {
  const { full_name, current_role, desired_role, birth_date, profile_data, ai_summary } = candidate;

  const age = birth_date
    ? Math.floor((Date.now() - new Date(birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("JARVIS PROCESSOS & GESTAO", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("HUB DE PESSOAS - DOSSIE COMPORTAMENTAL", margin, 19);

  const dateStr = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emissao: ${dateStr}`, pageWidth - margin - 35, 19);

  let y = 36;

  // Candidate Overview Card
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(sanitize(full_name || "Colaborador"), margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`Cargo Atual: ${sanitize(current_role || "Nao informado")}`, margin + 6, y + 15);
  doc.text(`Cargo Desejado: ${sanitize(desired_role || "Nao informado")}`, margin + 6, y + 21);
  doc.text(`Idade: ${age} anos`, margin + 110, y + 15);
  doc.text(`Status: Avaliado`, margin + 110, y + 21);

  y += 34;

  // Radar Scores Table
  const radarItems = profile_data?.radar ?? [
    { name: "Execucao", value: 70 },
    { name: "Comunicacao", value: 75 },
    { name: "Planejamento", value: 65 },
    { name: "Analise", value: 80 },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("1. Mapeamento de Competencias & Radar Comportamental", margin, y);
  y += 4;

  const tableData = radarItems.map((r: any) => {
    let desc = "Equilibrado";
    if (r.value >= 80) desc = "Dominancia Alta / Ponto Forte";
    else if (r.value <= 50) desc = "Oportunidade de Desenvolvimento";

    return [sanitize(r.name), `${r.value}%`, desc];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Competencia / Eixo", "Pontuacao", "Classificacao"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // AI Diagnostic Sections
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("2. Diagnostico Executivo & Analise de Perfil", margin, y);
  y += 6;

  const sections = [
    {
      title: "Perfil Natural & Estilo de Atuacao",
      content: sanitize(
        ai_summary?.natural ??
          "Perfil estruturado com equilibrio entre foco em metas e capacidade colaborativa.",
      ),
    },
    {
      title: "Pontos Fortes & Lideranca",
      content: sanitize(
        ai_summary?.strengths ??
          "Orientacao pratica para resolucao de problemas, clareza operacional e facilidade em alinhar expectativas.",
      ),
    },
    {
      title: "Ambiente de Trabalho Ideal",
      content: sanitize(
        ai_summary?.ideal_env ??
          "Projetos com metas objetivas, autonomia para execucao e processos bem delineados.",
      ),
    },
    {
      title: "Pontos Cegos & Recomendacoes de Desenvolvimento",
      content: sanitize(
        ai_summary?.blind_spots ??
          "Monitorar ritmo de cobranca perante a equipe e praticar alinhamentos intermediarios para evitar retrabalho.",
      ),
    },
  ];

  sections.forEach((sec) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text(sec.title, margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);

    const splitText = doc.splitTextToSize(sec.content, pageWidth - margin * 2);
    doc.text(splitText, margin, y);
    y += splitText.length * 4.5 + 4;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Jarvis Processos - Dossiê confidencial - Página ${i} de ${totalPages}`,
      margin,
      pageHeight - 8,
    );
  }

  const pdfOutput = doc.output("blob");
  return pdfOutput;
}
