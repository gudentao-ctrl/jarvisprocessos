import * as XLSX from "xlsx";
import type { PillarMeta, MapaItem, MapaCompanyInfo } from "./mapa.functions";

/* ─── helpers ─── */

const STATUS_LABEL: Record<string, string> = {
  aberto: "A iniciar",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  nao_sera_feito: "Não será feito",
};

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

function criticidade(gutScore?: number | null): string {
  if (!gutScore) return "—";
  if (gutScore >= 75) return "Crítico";
  if (gutScore >= 40) return "Alto";
  if (gutScore >= 20) return "Médio";
  return "Baixo";
}

/* ─── exportação principal ─── */

export function exportMapaExcel(opts: {
  company: MapaCompanyInfo;
  pillars: PillarMeta[];
  treeByPillar: Record<string, MapaItem[]>;
  items: MapaItem[];
}): void {
  const { company, pillars, treeByPillar } = opts;
  const wb = XLSX.utils.book_new();

  /* ═════ Sheet 1: Resumo por Pilar ═════ */
  const summaryHeaders = [
    "Pilar",
    "Diretrizes",
    "Ações",
    "Concluídas",
    "Em Andamento",
    "A Iniciar",
    "Não Será Feito",
    "Avanço %",
  ];

  const summaryRows: (string | number)[][] = pillars.map((p) => [
    p.name,
    p.total_diretrizes,
    p.total_desdobramentos,
    p.concluidas,
    p.em_andamento,
    p.a_iniciar,
    p.nao_sera_feito,
    p.progress_pct,
  ]);

  // Totals row
  const totals = pillars.reduce(
    (acc, p) => ({
      dir: acc.dir + p.total_diretrizes,
      desdb: acc.desdb + p.total_desdobramentos,
      conc: acc.conc + p.concluidas,
      anda: acc.anda + p.em_andamento,
      inic: acc.inic + p.a_iniciar,
      nao: acc.nao + p.nao_sera_feito,
    }),
    { dir: 0, desdb: 0, conc: 0, anda: 0, inic: 0, nao: 0 },
  );

  const totalPct =
    totals.desdb > 0
      ? Math.round(
          pillars.reduce((s, p) => s + p.progress_pct * p.total_desdobramentos, 0) /
            totals.desdb,
        )
      : 0;

  summaryRows.push([
    "TOTAL",
    totals.dir,
    totals.desdb,
    totals.conc,
    totals.anda,
    totals.inic,
    totals.nao,
    totalPct,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  ws1["!cols"] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo por Pilar");

  /* ═════ Sheet 2: Detalhamento ═════ */
  const detailHeaders = [
    "Pilar",
    "Nível",
    "Código",
    "Título",
    "Status",
    "Avanço %",
    "Responsável",
    "Setor",
    "Prazo",
    "Gravidade",
    "Urgência",
    "Tendência",
    "GUT Score",
    "Criticidade",
    "Origem",
    "Problema",
    "Causa",
    "Descrição",
    "Resultado Esperado",
    "Observações",
  ];

  const detailRows: (string | number | null)[][] = [];

  for (const pilar of pillars) {
    const roots = treeByPillar[pilar.key] || [];

    roots.forEach((diretriz, dIdx) => {
      const dCode = `D${dIdx + 1}`;

      // Diretriz row
      detailRows.push([
        pilar.name,
        "Diretriz",
        dCode,
        diretriz.title || "",
        STATUS_LABEL[diretriz.status] || diretriz.status,
        diretriz.progress_pct,
        diretriz.responsible || "",
        diretriz.sector || "",
        fmtDate(diretriz.due_date),
        diretriz.gravity ?? null,
        diretriz.urgency ?? null,
        diretriz.trend ?? null,
        diretriz.gut_score ?? null,
        criticidade(diretriz.gut_score),
        diretriz.origin || "",
        diretriz.problem || "",
        diretriz.cause || "",
        diretriz.observations || "",
        diretriz.expected_result || "",
        "",
      ]);

      // Children rows
      const children = diretriz.children || [];
      children.forEach((sub, sIdx) => {
        const sCode = `${dCode}.${sIdx + 1}`;
        detailRows.push([
          pilar.name,
          "Desdobramento",
          sCode,
          sub.title || "",
          STATUS_LABEL[sub.status] || sub.status,
          sub.progress_pct,
          sub.responsible || "",
          sub.sector || "",
          fmtDate(sub.due_date),
          sub.gravity ?? null,
          sub.urgency ?? null,
          sub.trend ?? null,
          sub.gut_score ?? null,
          criticidade(sub.gut_score),
          sub.origin || "",
          sub.problem || "",
          sub.cause || "",
          sub.description || sub.observations || "",
          sub.expected_result || "",
          sub.observations || "",
        ]);
      });
    });
  }

  const ws2 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  ws2["!cols"] = [
    { wch: 20 }, // Pilar
    { wch: 14 }, // Nível
    { wch: 10 }, // Código
    { wch: 40 }, // Título
    { wch: 16 }, // Status
    { wch: 10 }, // Avanço %
    { wch: 20 }, // Responsável
    { wch: 16 }, // Setor
    { wch: 12 }, // Prazo
    { wch: 10 }, // Gravidade
    { wch: 10 }, // Urgência
    { wch: 10 }, // Tendência
    { wch: 10 }, // GUT Score
    { wch: 12 }, // Criticidade
    { wch: 18 }, // Origem
    { wch: 35 }, // Problema
    { wch: 35 }, // Causa
    { wch: 40 }, // Descrição
    { wch: 35 }, // Resultado Esperado
    { wch: 35 }, // Observações
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Detalhamento");

  /* ── salvar ── */
  const safeName = company.name
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "")
    .replace(/\s+/g, "_");
  XLSX.writeFile(
    wb,
    `Mapa_Estrategico_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
