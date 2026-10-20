// src/lib/fives-pdf.ts
// Gerador de Relatórios Executivos e Certificados em PDF para o HUB 5S (Bloco 27)

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FivesPortalData, FivesSetor, FivesAuditoria } from "./fives-types";

// Helper para converter cor HEX para RGB
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ---------------------------------------------------------------------------
// 1. CERTIFICADO OFICIAL DE EXCELÊNCIA 5S DO SETOR
// ---------------------------------------------------------------------------
export interface CertificadoSetorParams {
  setor: FivesSetor;
  companyName: string;
  logoClienteUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export async function generateCertificadoSetorPdf(params: CertificadoSetorParams): Promise<void> {
  const { setor, companyName, primaryColor = "#3E100C", secondaryColor = "#E05A10" } = params;

  // Cria PDF em orientação paisagem (A4: 297mm x 210mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  // Fundo com borda dupla ornamental de certificado
  doc.setFillColor(255, 248, 245);
  doc.rect(0, 0, width, height, "F");

  // Moldura Externa
  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setLineWidth(3);
  doc.rect(10, 10, width - 20, height - 20);

  // Moldura Interna Dourada / Secundária
  doc.setDrawColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.setLineWidth(1);
  doc.rect(13, 13, width - 26, height - 26);

  // Detalhes nos cantos
  doc.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.circle(13, 13, 2, "F");
  doc.circle(width - 13, 13, 2, "F");
  doc.circle(13, height - 13, 2, "F");
  doc.circle(width - 13, height - 13, 2, "F");

  // Cabeçalho
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROGRAMA 5S DE EXCELÊNCIA OPERACIONAL", width / 2, 28, { align: "center" });

  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("CERTIFICADO DE CONFORMIDADE", width / 2, 42, { align: "center" });

  // Linha divisória ornamental
  doc.setDrawColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.setLineWidth(0.8);
  doc.line(width / 2 - 50, 47, width / 2 + 50, 47);

  // Texto principal
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Certificamos com distinção que a equipe e o espaço físico do setor", width / 2, 60, { align: "center" });

  // Nome do Setor em Grande Destaque
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(setor.nome_setor.toUpperCase(), width / 2, 75, { align: "center" });

  // Nome da Empresa
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, width / 2, 85, { align: "center" });

  // Reconhecimento de Desempenho
  const nota = setor.ultima_nota ?? 90;
  const selo = setor.selo === "Ouro" ? "SELO OURO" : setor.selo === "Prata" ? "SELO PRATA" : "CERTIFICADO DE PARTICIPAÇÃO";

  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const textoDescricao = `Alcançou a pontuação de ${nota}% na auditoria oficial dos 5 Sensos (Utilização, Organização, Limpeza, Padronização e Disciplina), cumprindo rigorosamente os padrões de qualidade e segurança estabelecidos na metodologia Maia Consultoria.`;
  const splitText = doc.splitTextToSize(textoDescricao, width - 60);
  doc.text(splitText, width / 2, 100, { align: "center" });

  // Medalhão / Box do Selo
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(width / 2 - 35, 122, 70, 20, 4, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(selo, width / 2, 131, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Aproveitamento: ${nota}%`, width / 2, 138, { align: "center" });

  // Assinaturas
  const yAssinatura = 175;

  // Linha Guardião
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(35, yAssinatura, 105, yAssinatura);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(setor.guardiao_nome || "Guardião do Setor", 70, yAssinatura + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Liderança do Setor 5S", 70, yAssinatura + 9, { align: "center" });

  // Linha Auditor
  doc.line(width / 2 - 35, yAssinatura, width / 2 + 35, yAssinatura);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(setor.auditor_nome || "Auditor Designado", width / 2, yAssinatura + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Comitê de Auditoria Interna", width / 2, yAssinatura + 9, { align: "center" });

  // Linha Consultoria Maia
  doc.line(width - 105, yAssinatura, width - 35, yAssinatura);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Maia Consultoria Empresarial", width - 70, yAssinatura + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Coordenação Técnica do 5S", width - 70, yAssinatura + 9, { align: "center" });

  // Rodapé Data
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Emitido em ${dataHoje} • Plataforma JARVIS PROCESSO`, width / 2, height - 15, { align: "center" });

  doc.save(`Certificado_5S_${setor.nome_setor.replace(/\s+/g, "_")}.pdf`);
}

// ---------------------------------------------------------------------------
// 2. RELATÓRIO EXECUTIVO GERAL DO HUB 5S (CABEÇALHO DUPLO CLIENTE + MAIA)
// ---------------------------------------------------------------------------
export async function generateRelatorioExecutivo5SPdf(portalData: FivesPortalData): Promise<void> {
  const { config, company, setores, kpis, auditoriasRecentes, radarData, cartoesVermelhos } = portalData;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const primaryRgb = hexToRgb(config.primary_color || "#3E100C");
  const secondaryRgb = hexToRgb(config.secondary_color || "#E05A10");

  // Faixa Superior Dupla Whitelabel
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, width, 24, "F");

  doc.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.rect(0, 24, width, 2, "F");

  // Texto do Cabeçalho Duplo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(company.name.toUpperCase(), 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("MAIA CONSULTORIA EMPRESARIAL", width - 14, 15, { align: "right" });

  // Título do Relatório
  let y = 35;
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RELATÓRIO EXECUTIVO DO PROGRAMA 5S", 14, y);

  y += 6;
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Data de Emissão: ${dataHoje} • Plataforma JARVIS PROCESSO`, 14, y);

  y += 10;
  // Box de Big Numbers Executivos
  doc.setFillColor(255, 248, 245);
  doc.setDrawColor(220, 200, 190);
  doc.roundedRect(14, y, width - 28, 24, 3, 3, "FD");

  const colW = (width - 28) / 4;

  // KPI 1: Média Global
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.text(`${kpis.notaMediaGlobal}%`, 14 + colW * 0.5, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("NOTA MÉDIA GLOBAL", 14 + colW * 0.5, y + 18, { align: "center" });

  // KPI 2: Setor Campeão
  doc.setFontSize(12);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(kpis.setorCampeao?.nome_setor ? kpis.setorCampeao.nome_setor.slice(0, 16) + "…" : "—", 14 + colW * 1.5, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("SETOR CAMPEÃO (OURO)", 14 + colW * 1.5, y + 18, { align: "center" });

  // KPI 3: Total Auditorias
  doc.setFontSize(14);
  doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.text(`${kpis.totalAuditorias}`, 14 + colW * 2.5, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("AUDITORIAS REALIZADAS", 14 + colW * 2.5, y + 18, { align: "center" });

  // KPI 4: Planos de Ação
  doc.setFontSize(14);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`${kpis.totalPlanosAcao}`, 14 + colW * 3.5, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("PLANOS DE AÇÃO GERADOS", 14 + colW * 3.5, y + 18, { align: "center" });

  y += 32;

  // 1. Tabela de Desempenho por Senso
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Diagnóstico Geral por Senso (Radar 5S)", 14, y);

  const radarTableRows = radarData.map((r) => [
    r.senso,
    r.nome,
    `${r.score}%`,
    r.score >= 90 ? "Excelente (Ouro)" : r.score >= 80 ? "Adequado (Prata)" : "Atenção (Requer Ação)",
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [["Sigla", "Senso 5S", "Pontuação Atual", "Classificação"]],
    body: radarTableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9 },
  });

  // 2. Ranking e Desempenho dos Setores
  const finalY1 = (doc as any).lastAutoTable.finalY + 10;
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Ranking Oficial de Setores & Guardiões", 14, finalY1);

  const setoresTableRows = setores.map((s) => [
    `#${s.posicao_ranking ?? "-"}`,
    s.nome_setor,
    s.guardiao_nome || "—",
    s.auditor_nome || "—",
    `${s.meta_nota}%`,
    `${s.ultima_nota ?? 0}%`,
    s.selo === "Ouro" ? "Selo Ouro" : s.selo === "Prata" ? "Selo Prata" : "Atenção",
  ]);

  autoTable(doc, {
    startY: finalY1 + 3,
    head: [["Pos.", "Setor", "Guardião", "Auditor", "Meta", "Nota Atual", "Selo"]],
    body: setoresTableRows,
    theme: "striped",
    headStyles: {
      fillColor: secondaryRgb,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 8.5 },
  });

  // 3. Planos de Ação Pendentes (Próxima Página)
  doc.addPage();

  // Cabeçalho da página 2
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, width, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("HUB 5S • PLANOS DE AÇÃO & CARTÃO VERMELHO", 14, 9);
  doc.text(`Página 2 • ${company.name}`, width - 14, 9, { align: "right" });

  let y2 = 22;
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Planos de Ação Derivados das Auditorias (< 4 Pontos)", 14, y2);

  const planosAcaoRows: string[][] = [];
  auditoriasRecentes.forEach((aud) => {
    const setorNome = setores.find((s) => s.id === aud.setor_id)?.nome_setor || "Setor";
    (aud.itens || []).forEach((it) => {
      if (it.nota < 4 && it.plano_acao_o_que) {
        planosAcaoRows.push([
          setorNome,
          it.senso,
          it.pergunta.slice(0, 35) + "…",
          it.plano_acao_o_que,
          it.plano_acao_responsavel || "Guardião",
          it.plano_acao_prazo ? new Date(it.plano_acao_prazo).toLocaleDateString("pt-BR") : "A definir",
          it.plano_acao_status || "PENDENTE",
        ]);
      }
    });
  });

  if (planosAcaoRows.length === 0) {
    planosAcaoRows.push(["Todos os Setores", "Geral", "Nenhuma não-conformidade grave registrada", "Manter padrões ouro", "Equipe", "Contínuo", "CONCLUIDO"]);
  }

  autoTable(doc, {
    startY: y2 + 3,
    head: [["Setor", "Senso", "Item Avaliado", "O que corrigir (Ação)", "Responsável", "Prazo", "Status"]],
    body: planosAcaoRows,
    theme: "grid",
    headStyles: {
      fillColor: [220, 38, 38], // Vermelho alerta
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 7.5 },
  });

  // 4. Área do Cartão Vermelho (Descartes)
  const finalY2 = (doc as any).lastAutoTable.finalY + 10;
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Controle de Quarentena - Cartão Vermelho (Seiri)", 14, finalY2);

  const descartesRows = cartoesVermelhos.map((d) => [
    d.setor_nome || "Setor",
    d.item_descricao,
    d.localizacao || "—",
    d.data_limite ? new Date(d.data_limite).toLocaleDateString("pt-BR") : "—",
    d.destinacao_status,
    d.destinacao_observacao || "—",
  ]);

  autoTable(doc, {
    startY: finalY2 + 3,
    head: [["Setor de Origem", "Descrição do Item", "Localização", "Data Limite", "Status", "Destinação"]],
    body: descartesRows.length > 0 ? descartesRows : [["—", "Nenhum item pendente de descarte", "—", "—", "REGULAR", "—"]],
    theme: "striped",
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 8 },
  });

  // Rodapé Oficial
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Relatório gerado pelo Módulo HUB 5S • Metodologia Maia Consultoria Empresarial • Todos os direitos reservados",
    width / 2,
    footerY,
    { align: "center" }
  );

  doc.save(`Relatorio_Executivo_5S_${company.name.replace(/\s+/g, "_")}.pdf`);
}
