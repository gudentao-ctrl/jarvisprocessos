export const PERIOD_OPTIONS = [
  { value: "todos", label: "Todo o período" },
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "semana", label: "Esta semana" },
  { value: "semana_passada", label: "Semana passada" },
  { value: "mes", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "ano", label: "Este ano" },
  { value: "ano_passado", label: "Ano passado" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const add = (d: Date, days: number) => {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
};

/** Retorna { from, to } em formato YYYY-MM-DD (ou vazio para "todos"/personalizado sem datas). */
export function periodRange(
  period: PeriodValue,
  custom?: { from?: string; to?: string },
): { from?: string; to?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case "hoje":
      return { from: iso(now), to: iso(now) };
    case "ontem": {
      const d = add(now, -1);
      return { from: iso(d), to: iso(d) };
    }
    case "semana": {
      const start = add(now, -((now.getDay() + 6) % 7)); // segunda-feira
      return { from: iso(start), to: iso(add(start, 6)) };
    }
    case "semana_passada": {
      const start = add(now, -((now.getDay() + 6) % 7) - 7);
      return { from: iso(start), to: iso(add(start, 6)) };
    }
    case "mes":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "mes_passado":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "ano":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "ano_passado":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "personalizado":
      return { from: custom?.from || undefined, to: custom?.to || undefined };
    default:
      return {};
  }
}
