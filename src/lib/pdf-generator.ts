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
 * Generates an executive PDF dossier for a candidate assessment report (Big Five / OCEAN).
 * Returns a Blob suitable for browser download or preview.
 */
export async function generateAssessmentReport(candidate: any): Promise<Blob> {
  const { full_name, current_role, desired_role, birth_date, company_name, profile_data, ai_summary } = candidate;

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
  doc.text("HUB DE PESSOAS - RELATORIO INTEGRADO DE PERFIL PROFISSIONAL", margin, 19);

  const dateStr = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emissao: ${dateStr}`, pageWidth - margin - 35, 19);

  let y = 36;

  // Candidate Overview Card
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(sanitize(full_name || "Colaborador"), margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`Cargo Atual: ${sanitize(current_role || "Nao informado")}`, margin + 6, y + 15);
  doc.text(`Cargo Desejado: ${sanitize(desired_role || "Nao informado")}`, margin + 6, y + 21);
  doc.text(`Vinculo: ${sanitize(candidate.external ? "Candidato Externo" : company_name || "Empresa Vinculada")}`, margin + 6, y + 27);

  doc.text(`Idade: ${age} anos`, margin + 110, y + 15);
  doc.text(`Status: Avaliado`, margin + 110, y + 21);
  const dominant = profile_data?.dominant_factor || "Equilibrado";
  doc.text(`Fator Dominante: ${sanitize(dominant)}`, margin + 110, y + 27);

  y += 36;

  // Radar Scores Table (Big Five OCEAN)
  const radarItems = profile_data?.radar ?? [
    { name: "Abertura a Experiencia", value: 75, description: "Criatividade e inovacao" },
    { name: "Conscienciosidade", value: 85, description: "Organizacao e foco em metas" },
    { name: "Extroversao", value: 70, description: "Comunicacao e assertividade" },
    { name: "Amabilidade", value: 78, description: "Empatia e cooperacao" },
    { name: "Estabilidade Emocional", value: 80, description: "Resiliencia sob pressao" },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("1. Tendencias nos 5 Fatores (Modelo Big Five)", margin, y);
  y += 4;

  const tableData = radarItems.map((r: any) => {
    let desc = "Equilibrado";
    if (r.value >= 80) desc = "Muito Alto / Dominancia";
    else if (r.value >= 65) desc = "Alto";
    else if (r.value <= 45) desc = "Oportunidade de Desenvolvimento";

    return [sanitize(r.name), `${r.value}%`, desc, sanitize(r.description || "-")];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Fator Global", "Pontuacao", "Classificacao", "Significado / Descricao"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
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
          "Perfil estruturado com forte alinhamento entre disciplina operacional e foco em resultados estrategicos.",
      ),
    },
    {
      title: "Pontos Fortes & Estilo de Lideranca",
      content: sanitize(
        ai_summary?.strengths ??
          "Facilidade de articulacao com equipes, tomada de decisao fundamentada e clareza de execucao.",
      ),
    },
    {
      title: "Ambiente de Trabalho Ideal",
      content: sanitize(
        ai_summary?.ideal_env ??
          "Ambientes estruturados com metas objetivas, espaco para melhoria continua de processos e autonomia controlada.",
      ),
    },
    {
      title: "Pontos Cegos & Recomendacoes de Desenvolvimento",
      content: sanitize(
        ai_summary?.blind_spots ??
          "Monitorar ritmo de cobranca perante a equipe e praticar alinhamentos intermediarios para evitar sobrecargas.",
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

  const report = profile_data?.psychometrics;
  if (report?.validade && report?.disc && report?.bigFive) {
    if (y > pageHeight - 60) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    doc.text("3. Qualidade e limites do protocolo", margin, y); y += 5;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Indicador", "Resultado", "Leitura"]],
      body: [
        ["Coerencia entre itens", String(report.validade.vrinEscore), "Revisar em entrevista quando houver alerta"],
        ["Ritmo medio", `${report.validade.tmiSegundos} s/item`, "Indicador observavel de ritmo de resposta"],
        ["Itens de atencao", String(report.validade.infrequenciaErros), "Quantidade de respostas divergentes do comando"],
      ],
      theme: "grid", headStyles: { fillColor: NAVY, textColor: [255,255,255], fontSize: 8 }, styles: { fontSize: 8, cellPadding: 2.5 },
    });
    y = (doc as any).lastAutoTable.finalY + 9;

    if (y > pageHeight - 75) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    doc.text("4. Big Five - fatores e facetas", margin, y); y += 5;
    const factors = Object.entries(report.bigFive.fatores as Record<string, any>);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Fator", "Indice", "Faixa", "Facetas"]],
      body: factors.map(([name, value]) => [
        sanitize(name), `${value.percentil}%`, sanitize(value.nivel),
        sanitize(Object.entries(value.facetas ?? {}).map(([facet, score]) => `${facet}: ${score}%`).join("; ")),
      ]),
      theme: "striped", headStyles: { fillColor: NAVY, textColor: [255,255,255], fontSize: 8 }, styles: { fontSize: 7.4, cellPadding: 2.4, overflow: "linebreak" }, columnStyles: { 3: { cellWidth: 88 } },
    });
    y = (doc as any).lastAutoTable.finalY + 9;

    if (y > pageHeight - 70) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    doc.text("5. Estilo comportamental - natural e adaptado", margin, y); y += 5;
    const adapted = new Map(report.disc.adaptado.map((item: any) => [item.fator, item.valor]));
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [["Dimensao", "Natural", "Adaptado", "Diferenca"]],
      body: report.disc.natural.map((item: any) => {
        const adaptedValue = Number(adapted.get(item.fator) ?? 0);
        return [`${item.fator} - ${sanitize(item.nome)}`, `${item.valor}%`, `${adaptedValue}%`, `${Math.abs(item.valor - adaptedValue)} pts`];
      }),
      theme: "grid", headStyles: { fillColor: NAVY, textColor: [255,255,255], fontSize: 8 }, styles: { fontSize: 8, cellPadding: 2.5 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    const integratedSections = [
      ["Forcas observaveis", ai_summary?.strengths],
      ["Motivadores observaveis", report.disc.ambienteIdeal],
      ["Ambiente e comunicacao", `Ambiente: ${report.disc.ambienteIdeal} Estilo de lideranca: ${report.disc.estiloLideranca}`],
      ["Riscos sob pressao", report.disc.pontosCegos?.join(" ")],
      ["Sintese integrada", report.parecerConsultor?.sinteseQualitativa],
      ["Desenvolvimento sugerido", report.parecerConsultor?.pdi?.map((item: any) => `${item.area}: ${item.acao} (${item.prazoSugerido})`).join(" ")],
    ];
    integratedSections.forEach(([title, content]) => {
      if (!content) return;
      const lines = doc.splitTextToSize(sanitize(content), pageWidth - margin * 2);
      if (y + lines.length * 4 + 10 > pageHeight - 16) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...PRIMARY); doc.text(String(title), margin, y); y += 4.5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...SLATE); doc.text(lines, margin, y); y += lines.length * 4 + 5;
    });
  }

  if (y > pageHeight - 35) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Nota de uso e limites", margin, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...SLATE);
  const limits = doc.splitTextToSize("Este relatorio apoia entrevistas e desenvolvimento profissional. Nao equivale a instrumento psicologico licenciado, nao possui norma populacional propria e nao deve ser usado isoladamente para diagnostico ou decisao de contratacao.", pageWidth - margin * 2);
  doc.text(limits, margin, y);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Jarvis Processos - Relatorio Confidencial de Apoio Profissional - Pagina ${i} de ${totalPages}`,
      margin,
      pageHeight - 8,
    );
  }

  const pdfOutput = doc.output("blob");
  return pdfOutput;
}
