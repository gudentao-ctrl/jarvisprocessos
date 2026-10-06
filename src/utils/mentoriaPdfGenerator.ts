import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Mentorado, MentoriaSessao } from "@/lib/mentoria-types";

const BRAND = {
  vinho: "#3E100C",
  laranja: "#E05A10",
  bgCreme: "#FFF8F5",
  texto: "#2B1B17",
  cinza: "#6B7280",
  borda: "#E5D5CE",
};

export async function generateMentoriaFinalReportPDF(
  mentorado: Mentorado,
  parecerFinal: string,
  companyName: string = "Empresa Cliente",
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Cabeçalho Visual Maia
  // Faixa Vinho Superior
  doc.setFillColor(62, 16, 12); // #3E100C
  doc.rect(0, 0, pageWidth, 24, "F");

  // Faixa Laranja decorativa
  doc.setFillColor(224, 90, 16); // #E05A10
  doc.rect(0, 24, pageWidth, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("MAIA CONSULTORIA EMPRESARIAL", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("HUB DE PESSOAS · PROGRAMA DE MENTORIA INDIVIDUAL", margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RELATÓRIO DE CONCLUSÃO DE MENTORIA", pageWidth - margin, 15, { align: "right" });

  let y = 35;

  // 2. Card de Identificação do Mentorado
  doc.setFillColor(255, 248, 245); // #FFF8F5
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "F");
  doc.setDrawColor(229, 213, 206);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "S");

  doc.setTextColor(62, 16, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(mentorado.nome.toUpperCase(), margin + 5, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(43, 27, 23);
  doc.setFont("helvetica", "normal");
  doc.text(`Cargo / Posição: ${mentorado.cargo || "—"}`, margin + 5, y + 15);
  doc.text(`Empresa: ${companyName}`, margin + 5, y + 21);
  doc.text(`Formação: ${mentorado.formacao || "—"}`, margin + 5, y + 27);

  doc.text(`Idade: ${mentorado.idade ? `${mentorado.idade} anos` : "—"}`, margin + 110, y + 15);
  doc.text(`Telefone: ${mentorado.telefone || "—"}`, margin + 110, y + 21);
  doc.text(`E-mail: ${mentorado.email || "—"}`, margin + 110, y + 27);

  y += 38;

  // 3. Big Numbers / KPIs do Ciclo de Mentoria
  const totalHoras = mentorado.totalHoras || (mentorado.sessoes || []).reduce((a, s) => a + Number(s.horas || 0), 0);
  const totalAtendimentos = mentorado.totalAtendimentos || (mentorado.sessoes || []).length;
  let totalAcoes = 0;
  let acoesConcluidas = 0;
  (mentorado.sessoes || []).forEach((s) => {
    (s.acoes || []).forEach((ac) => {
      totalAcoes++;
      if (ac.concluida) acoesConcluidas++;
    });
  });
  const mediaAvanco = mentorado.mediaAvanco || 0;

  const kpiWidth = (contentWidth - 6) / 4;
  const kpis = [
    { label: "ATENDIMENTOS", val: `${totalAtendimentos} Sessões` },
    { label: "CARGA HORÁRIA", val: `${totalHoras.toFixed(1)} Horas` },
    { label: "AÇÕES MAPEADAS", val: `${acoesConcluidas}/${totalAcoes} Feitas` },
    { label: "NOTA DE AVANÇO", val: `${mediaAvanco.toFixed(1)} / 5.0` },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + 2);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(kpiX, y, kpiWidth, 16, 1.5, 1.5, "F");
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(kpiX, y, kpiWidth, 16, 1.5, 1.5, "S");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(kpi.label, kpiX + kpiWidth / 2, y + 5.5, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(224, 90, 16); // #E05A10
    doc.text(kpi.val, kpiX + kpiWidth / 2, y + 12, { align: "center" });
  });

  y += 22;

  // 4. Mapeamento Comportamental
  doc.setFillColor(62, 16, 12);
  doc.rect(margin, y, 3, 6, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(62, 16, 12);
  doc.text("MAPEAMENTO COMPORTAMENTAL INTEGRADO", margin + 6, y + 5);
  y += 9;

  if (mentorado.behavioral_profile?.radar && mentorado.behavioral_profile.radar.length > 0) {
    const radarData = mentorado.behavioral_profile.radar.map((r) => [
      r.name,
      `${r.value}%`,
      r.value >= 80 ? "Muito Alto" : r.value >= 65 ? "Alto" : r.value >= 45 ? "Médio" : "Baixo",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "plain",
      head: [["Fator Avaliado", "Score", "Classificação Normativa"]],
      body: radarData,
      styles: { fontSize: 8, cellPadding: 2, textColor: [43, 27, 23] },
      headStyles: {
        fillColor: [62, 16, 12],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 35, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 47, halign: "center" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    if (mentorado.behavioral_profile.ai_summary?.natural) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      const splitSummary = doc.splitTextToSize(`Síntese: ${mentorado.behavioral_profile.ai_summary.natural}`, contentWidth);
      doc.text(splitSummary, margin, y);
      y += splitSummary.length * 3.8 + 4;
    }
  } else {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Nenhum laudo comportamental estruturado anexado a este prontuário de mentoria.", margin, y);
    y += 8;
  }

  // 5. Parecer Técnico Final do Consultor
  doc.setFillColor(62, 16, 12);
  doc.rect(margin, y, 3, 6, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(62, 16, 12);
  doc.text("PARECER DO CONSULTOR & CONCLUSÃO DO PROCESSO", margin + 6, y + 5);
  y += 9;

  doc.setFillColor(255, 248, 245);
  doc.setDrawColor(229, 213, 206);
  const textLines = doc.splitTextToSize(parecerFinal || "Sem parecer final registrado.", contentWidth - 8);
  const boxHeight = Math.max(22, textLines.length * 4.2 + 8);

  doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, "F");
  doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, "S");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(43, 27, 23);
  doc.text(textLines, margin + 4, y + 6);

  y += boxHeight + 8;

  // Se o espaço estiver curto, cria nova página para as tabelas detalhadas
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  // 6. Histórico das Sessões e Atendimentos
  doc.setFillColor(62, 16, 12);
  doc.rect(margin, y, 3, 6, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(62, 16, 12);
  doc.text("HISTÓRICO DE ATENDIMENTOS REALIZADOS", margin + 6, y + 5);
  y += 8;

  const sessoes = mentorado.sessoes || [];
  const sessoesTableData = sessoes.map((s, idx) => [
    `#${idx + 1}`,
    new Date(s.data_atendimento).toLocaleDateString("pt-BR"),
    `${Number(s.horas || 0).toFixed(1)}h`,
    s.resumo || "—",
    `${Number(s.diagnostico?.media_nota || 0).toFixed(1)} / 5.0`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Sessão", "Data", "Horas", "Resumo dos Temas Abordados", "Aproveitamento"]],
    body: sessoesTableData.length > 0 ? sessoesTableData : [["—", "—", "—", "Nenhuma sessão registrada", "—"]],
    theme: "striped",
    headStyles: {
      fillColor: [62, 16, 12],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [43, 27, 23],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 105 },
      4: { cellWidth: 24, halign: "center", fontStyle: "bold", textColor: [224, 90, 16] },
    },
    alternateRowStyles: {
      fillColor: [255, 248, 245],
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Se necessário, nova página para a matriz de ações
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  // 7. Matriz de Ações e Tarefas Definidas
  doc.setFillColor(62, 16, 12);
  doc.rect(margin, y, 3, 6, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(62, 16, 12);
  doc.text("MATRIZ DE AÇÕES & TAREFAS DESENVOLVIDAS", margin + 6, y + 5);
  y += 8;

  const todasAcoes: any[] = [];
  sessoes.forEach((s, sIdx) => {
    (s.acoes || []).forEach((ac) => {
      todasAcoes.push([
        `Sessão #${sIdx + 1}`,
        ac.texto,
        ac.prazo ? new Date(ac.prazo).toLocaleDateString("pt-BR") : "—",
        ac.concluida ? "CONCLUÍDA" : "EM ABERTO",
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Origem", "Descrição da Ação / Tarefa", "Prazo", "Status"]],
    body: todasAcoes.length > 0 ? todasAcoes : [["—", "Nenhuma ação mapeada neste ciclo", "—", "—"]],
    theme: "striped",
    headStyles: {
      fillColor: [62, 16, 12],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [43, 27, 23],
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: "bold" },
      1: { cellWidth: 105 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 27, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [255, 248, 245],
    },
  });

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(229, 213, 206);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Maia Consultoria Empresarial · Hub de Pessoas & Cultura · Mentorado: ${mentorado.nome}`,
      margin,
      pageHeight - 7,
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  return {
    doc,
    blob: doc.output("blob"),
    download: () => {
      const fileName = `Relatorio_Mentoria_${mentorado.nome.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
    },
  };
}
