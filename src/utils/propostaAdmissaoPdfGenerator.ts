// src/utils/propostaAdmissaoPdfGenerator.ts
// Gerador de PDF oficial de Proposta de Remuneração e Admissão com identidade Maia Consultoria e campos de assinatura

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Vaga, RecrutamentoCandidato, PropostaContratacao } from "@/lib/recrutamento-types";

const BRAND = {
  vinho: [62, 16, 12] as [number, number, number], // #3E100C
  laranja: [224, 90, 16] as [number, number, number], // #E05A10
  creme: [255, 248, 245] as [number, number, number], // #FFF8F5
  cinzaBg: [248, 249, 250] as [number, number, number],
  cinzaBorda: [226, 232, 240] as [number, number, number],
  texto: [43, 27, 23] as [number, number, number],
  textoClaro: [110, 100, 95] as [number, number, number],
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export interface PropostaPdfParams {
  candidato: RecrutamentoCandidato;
  vaga: Vaga;
  proposta: PropostaContratacao;
  empresaNome?: string;
  consultorResponsavel?: string;
}

export function generatePropostaAdmissaoPDF(params: PropostaPdfParams): jsPDF {
  const { candidato, vaga, proposta, empresaNome, consultorResponsavel } = params;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // 1. Faixa Superior (Vinho Maia)
  doc.setFillColor(...BRAND.vinho);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Faixa Laranja decorativa
  doc.setFillColor(...BRAND.laranja);
  doc.rect(0, 27, pageWidth, 2.5, "F");

  // Marca d'água / Logo Maia
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("MAIA CONSULTORIA", margin, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 240, 235);
  doc.text("DIVISÃO DE RECRUTAMENTO E DESENVOLVIMENTO DE PESSOAS", margin, 19);
  doc.text("DOCUMENTO OFICIAL DE PROPOSTA DE EMPREGO E ADMISSÃO", margin, 24);

  // Data e Protocolo no canto direito
  doc.setFontSize(8);
  doc.text(`Data: ${formatDateBR(new Date().toISOString())}`, pageWidth - margin, 14, { align: "right" });
  doc.text(`Ref: ADM-${Date.now().toString().slice(-6)}`, pageWidth - margin, 19, { align: "right" });

  let y = 38;

  // 2. Título Central
  doc.setTextColor(...BRAND.vinho);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PROPOSTA DE REMUNERAÇÃO E TERMO DE ADMISSÃO", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setDrawColor(...BRAND.laranja);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);

  y += 10;

  // 3. Carta de Apresentação / Preâmbulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.texto);
  const contratante = empresaNome || vaga.empresa_nome || "Empresa Contratante";
  const introText =
    `É com grande satisfação que a Maia Consultoria, em conjunto com a empresa ${contratante}, formaliza a presente Proposta de Contratação e Termo de Admissão ao profissional ${candidato.nome}, após aprovação técnica e comportamental nas etapas do processo seletivo para a posição de ${vaga.titulo}.`;

  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, margin, y);
  y += splitIntro.length * 4.8 + 4;

  // 4. Tabela com Dados Cadastrais das Partes
  autoTable(doc, {
    startY: y,
    head: [["DADOS DO CONTRATANTE E DO PROFISSIONAL SELECIONADO", ""]],
    body: [
      ["Empresa Contratante:", contratante],
      ["Cargo / Função:", vaga.titulo],
      ["Departamento / Área:", vaga.departamento || "Operações"],
      ["Nome do Candidato:", candidato.nome],
      ["CPF:", candidato.cpf || "Não informado"],
      ["E-mail / Telefone:", `${candidato.email || "-"} | ${candidato.telefone || "-"}`],
      ["Formação Acadêmica:", candidato.formacao || "Não informada"],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2, textColor: BRAND.texto },
    headStyles: {
      fillColor: BRAND.vinho,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: BRAND.creme },
      1: { cellWidth: contentWidth - 50 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 5. Tabela de Condições Contratuais e Proposta Econômica
  const remuneracaoFormatada = formatCurrency(proposta.remuneracao_mensal || vaga.salario_min || 0);

  autoTable(doc, {
    startY: y,
    head: [["CONDIÇÕES ECONÔMICAS E CONTRATUAIS ACORDADAS", ""]],
    body: [
      ["Remuneração Mensal:", `${remuneracaoFormatada} (${proposta.tipo_contrato})`],
      ["Modelo de Contratação:", `${proposta.tipo_contrato} - Carteira Assinada / Contrato Profissional`],
      ["Jornada de Trabalho:", proposta.jornada || vaga.jornada],
      ["Previsão de Início:", formatDateBR(proposta.data_inicio_prevista)],
      [
        "Pacote de Benefícios:",
        proposta.beneficios_acordados && proposta.beneficios_acordados.length > 0
          ? proposta.beneficios_acordados.join(" • ")
          : (vaga.beneficios || []).join(" • ") || "A combinar conforme convenção coletiva",
      ],
      [
        "Observações / Alinhamento:",
        proposta.observacoes_contratante || "Proposta válida por 5 (cinco) dias úteis a contar da data de emissão deste documento.",
      ],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: BRAND.texto },
    headStyles: {
      fillColor: BRAND.vinho,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: BRAND.creme },
      1: { cellWidth: contentWidth - 50 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // 6. Bloco Destaque Laranja com o Total e Aceite
  doc.setFillColor(...BRAND.creme);
  doc.setDrawColor(...BRAND.laranja);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  doc.setTextColor(...BRAND.laranja);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALOR TOTAL DA REMUNERAÇÃO FIXA:", margin + 6, y + 7);

  doc.setFontSize(13);
  doc.text(remuneracaoFormatada, margin + 6, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textoClaro);
  doc.text(
    `Modalidade: ${proposta.tipo_contrato} | Início previsto: ${formatDateBR(proposta.data_inicio_prevista)}`,
    pageWidth - margin - 6,
    y + 11,
    { align: "right" },
  );

  y += 26;

  // 7. Cláusula de Validação e Sigilo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textoClaro);
  const termos =
    "As partes declaram estar de pleno acordo com as diretrizes, valores e prazos estipulados nesta proposta. O presente documento formaliza a intenção irretratável de admissão após a entrega da documentação cadastral comprobatória de admissão e assinatura do contrato definitivo.";
  const splitTermos = doc.splitTextToSize(termos, contentWidth);
  doc.text(splitTermos, margin, y);

  // 8. Espaço Visual para Assinaturas (Rodapé Superior)
  const sigY = pageHeight - 48;

  // Linha Contratante
  const sigWidth = 72;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);

  // Assinatura Contratante (Esquerda)
  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.vinho);
  doc.text("EMPRESA CONTRATANTE", margin + sigWidth / 2, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textoClaro);
  doc.text(contratante, margin + sigWidth / 2, sigY + 9, { align: "center" });
  doc.text("Assinatura do Representante Legal", margin + sigWidth / 2, sigY + 13, { align: "center" });

  // Assinatura Contratado (Direita)
  const rightSigX = pageWidth - margin - sigWidth;
  doc.line(rightSigX, sigY, rightSigX + sigWidth, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.vinho);
  doc.text("PROFISSIONAL CONTRATADO", rightSigX + sigWidth / 2, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textoClaro);
  doc.text(candidato.nome, rightSigX + sigWidth / 2, sigY + 9, { align: "center" });
  doc.text(`CPF: ${candidato.cpf || "___.___.___-__"}`, rightSigX + sigWidth / 2, sigY + 13, { align: "center" });

  // Carimbo Intermediador Maia Consultoria (Centro Inferior)
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.textoClaro);
  doc.text(
    `Validado por: Maia Consultoria Empresarial • Consultor: ${consultorResponsavel || "Equipe de Gestão de Talentos"}`,
    pageWidth / 2,
    pageHeight - 14,
    { align: "center" },
  );

  // Rodapé decorativo
  doc.setFillColor(...BRAND.vinho);
  doc.rect(0, pageHeight - 6, pageWidth, 6, "F");

  return doc;
}
