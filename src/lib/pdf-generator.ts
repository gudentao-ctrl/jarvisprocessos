import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { calculateAssessmentAge } from "@/lib/assessment-age";
import regularFont from "@/assets/fonts/assessment-regular.ttf?url";
import boldFont from "@/assets/fonts/assessment-bold.ttf?url";

const NAVY: [number, number, number] = [17, 39, 78];
const SLATE: [number, number, number] = [71, 85, 105];
const PRIMARY: [number, number, number] = [37, 99, 235];
const FACTOR_NAMES: Record<string, string> = {
  neuroticismo: "Reatividade emocional", extroversao: "Extroversão", abertura: "Abertura à experiência",
  amabilidade: "Amabilidade", conscienciosidade: "Conscienciosidade",
};
let fontData: Promise<string[]> | undefined;
function loadFonts() {
  fontData ??= Promise.all([regularFont, boldFont].map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Não foi possível carregar as fontes do relatório");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  })).catch((error) => { fontData = undefined; throw error; });
  return fontData;
}

/** Export only recorded, completed protocols; never synthesize missing results. */
export async function generateAssessmentReport(candidate: any): Promise<Blob> {
  const report = candidate.profile_data?.psychometrics;
  if (!report?.validade || !report?.bigFive?.fatores || !report?.disc) {
    throw new Error("Relatório indisponível: protocolo concluído não encontrado");
  }
  const fonts = await loadFonts();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (const [index, weight] of ["normal", "bold"].entries()) {
    doc.addFileToVFS(`assessment-${weight}.ttf`, fonts[index]);
    doc.addFont(`assessment-${weight}.ttf`, "Assessment", weight);
  }
  const margin = 16, width = 178, bottom = 278;
  let y = 38;
  doc.setFillColor(...NAVY); doc.rect(0, 0, 210, 28, "F");
  doc.setFont("Assessment", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text("JARVIS PROCESSOS & GESTÃO", margin, 12);
  doc.setFont("Assessment", "normal"); doc.setFontSize(8);
  doc.text("RELATÓRIO INTEGRADO DE PERFIL PROFISSIONAL", margin, 20);
  const newPage = () => { doc.addPage(); y = 22; };
  const ensure = (height: number) => { if (y + height > bottom) newPage(); };
  const heading = (title: string) => {
    ensure(18); doc.setFont("Assessment", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(title, width);
    doc.text(lines, margin, y); y += lines.length * 5 + 4;
  };
  const paragraph = (value: unknown) => {
    if (!value) return;
    doc.setFont("Assessment", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SLATE);
    for (const line of doc.splitTextToSize(String(value), width) as string[]) {
      ensure(5); doc.text(line, margin, y); y += 4.5;
    }
    y += 4;
  };
  const table = (head: string[], body: any[][]) => {
    ensure(22);
    autoTable(doc, { startY: y, margin: { left: margin, right: margin, top: 22, bottom: 20 },
      head: [head], body, theme: "striped",
      styles: { font: "Assessment", fontSize: 8, cellPadding: 2.6, overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
      rowPageBreak: "avoid",
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  };
  const subheading = (title: string) => {
    ensure(14); doc.setFont("Assessment", "bold"); doc.setFontSize(9); doc.setTextColor(...PRIMARY);
    const lines = doc.splitTextToSize(title, width); doc.text(lines, margin, y); y += lines.length * 5 + 2;
  };
  const age = calculateAssessmentAge(candidate.birth_date);
  const birth = candidate.birth_date ? String(candidate.birth_date).split("-").reverse().join("/") : "Não informado";
  heading("1. Identificação e rastreabilidade");
  table(["Dado", "Registro"], [
    ["Nome", candidate.full_name || "Não informado"],
    ["Nascimento / idade na emissão", `${birth} / ${age == null ? "Não informada" : `${age} anos`}`],
    ["Cargo atual", candidate.current_role || "Não informado"],
    ["Cargo pretendido", candidate.desired_role || "Não informado"],
    ["Vínculo", candidate.external ? "Candidato externo" : candidate.company_name || "Não informado"],
    ["Data do protocolo", report.candidato.dataTeste || "Não informada"],
    ["Emissão / duração registrada", `${new Date().toLocaleDateString("pt-BR")} / ${report.candidato.tempoTotalMinutos} min`],
    ["Identificador", report.candidato.id],
  ]);
  heading("2. Qualidade do protocolo e critérios de interpretação");
  paragraph(report.validade.mensagem);
  for (const alert of report.validade.alertas ?? []) paragraph(`• ${alert}`);
  table(["Controle", "Resultado", "Significado"], [
    ["Coerência entre itens", report.validade.vrinEscore, "Diferenças entre pares; interpretar com os alertas acima."],
    ["Ritmo médio", `${report.validade.tmiSegundos} s/item`, "Tempo registrado dividido pelo número de itens; não mede confiabilidade."],
    ["Itens de atenção", report.validade.infrequenciaErros, "Respostas divergentes das verificações de atenção."],
  ]);
  paragraph("Escalas de 0 a 100 são índices descritivos internos, não percentis de uma população de referência. Valores altos ou baixos não são, por si, melhores ou piores. Ausência de alertas não comprova validade científica. Os controles usam critérios internos, sem normas populacionais demonstradas.");
  heading("3. Síntese individual integrada");
  paragraph(report.parecerConsultor.sinteseQualitativa);
  heading("4. Cinco fatores — tendências e facetas");
  const factors = Object.entries(report.bigFive.fatores as Record<string, any>);
  table(["Fator", "Índice (0–100)", "Faixa descritiva"], factors.map(([key, factor]) => [FACTOR_NAMES[key] || key, Math.round(factor.percentil), factor.nivel]));
  paragraph("Reatividade emocional descreve sensibilidade autorrelatada ao estresse, e não um diagnóstico clínico. Cada faceta é apresentada separadamente para preservar as diferenças dentro do fator.");
  for (const [key, factor] of factors) {
    subheading(FACTOR_NAMES[key] || key);
    table(["Faceta", "Índice descritivo (0–100)"], Object.entries(factor.facetas ?? {}).map(([facet, score]) => [facet, Math.round(Number(score))]));
  }
  heading("5. Estilos comportamentais — recortes natural e adaptado");
  paragraph("O recorte natural é estimado a partir dos cinco fatores; o adaptado deriva dos itens comportamentais. Não são dois instrumentos independentes. Diferenças sugerem temas para entrevista, não comprovam estresse ou autenticidade.");
  const adapted = new Map(report.disc.adaptado.map((item: any) => [item.fator, item.valor]));
  table(["Dimensão", "Natural (0–100)", "Adaptado (0–100)", "Diferença"], report.disc.natural.map((item: any) => {
    const value = adapted.get(item.fator);
    return [item.nome, Math.round(item.valor), value == null ? "Não registrado" : Math.round(Number(value)), value == null ? "—" : `${Math.round(Math.abs(item.valor - Number(value)))} pontos`];
  }));
  subheading("Estilo de atuação"); paragraph(report.disc.estiloLideranca);
  subheading("Ambiente e condições de trabalho"); paragraph(report.disc.ambienteIdeal);
  subheading("Pontos de atenção sob pressão"); for (const item of report.disc.pontosCegos ?? []) paragraph(`• ${item}`);
  heading("6. Integração dos achados — hipóteses para confirmação");
  paragraph("Os cruzamentos abaixo são hipóteses internas de interpretação. Confirmar com exemplos de atuação e evidências, sem tratá-los como prova independente de capacidade profissional.");
  table(["Recorte comportamental", "Fatores relacionados", "Hipótese"], (report.matrizConvergencia ?? []).map((item: any) => [item.tracoDisc, item.fatorBigFive, item.diagnostico]));
  heading("7. Entrevista estruturada para aprofundamento");
  for (const item of report.perguntasStar ?? []) {
    subheading(item.competencia);
    paragraph(`Situação: ${item.situacao}`); paragraph(`Tarefa: ${item.tarefa}`);
    paragraph(`Ação: ${item.acao}`); paragraph(`Resultado: ${item.resultado}`);
  }
  heading("8. Plano de desenvolvimento e acompanhamento");
  table(["Frente", "Ação sugerida", "Prazo", "Evidência de evolução"], (report.parecerConsultor.pdi ?? []).map((item: any) => [item.area, item.acao, item.prazoSugerido, item.indicadorSucesso]));
  heading("9. Nota de interpretação");
  paragraph("Documento confidencial de apoio profissional baseado no protocolo registrado. A interpretação final requer entrevista, contexto da função e evidências de desempenho. Não há normas populacionais ou validação técnica documentadas para afirmar equivalência a um instrumento licenciado; não usar o resultado isoladamente para decidir contratação.");
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFont("Assessment", "normal"); doc.setFontSize(7); doc.setTextColor(...SLATE);
    doc.text("Jarvis Processos • Confidencial • Perfil profissional", margin, 289);
    doc.text(`${i} / ${total}`, 194, 289, { align: "right" });
  }
  return doc.output("blob");
}
