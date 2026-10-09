import { describe, expect, it } from "vitest";
import { ACCESS_CATALOG, matchesAccessSearch } from "../src/lib/access-catalog";

describe("access catalog", () => {
  it("covers each existing permission group exactly once", () => {
    const keys = ACCESS_CATALOG.map((group) => group.key).sort();
    expect(keys).toEqual(["chamados", "crm", "financeiro", "gestao", "horas", "indicadores", "pop", "portal"]);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("includes the principal people tools within the existing management permission", () => {
    const management = ACCESS_CATALOG.find((group) => group.key === "gestao");
    expect(management?.tools).toEqual(expect.arrayContaining(["Pessoas e avaliação de perfil", "Recrutamento", "Mentorias", "Pesquisas NPS e eNPS"]));
  });
  it("finds names without case or accent sensitivity", () => {
    expect(matchesAccessSearch("Pessoas e avaliação de perfil", " AVALIACAO ")).toBe(true);
    expect(matchesAccessSearch("CRM comercial", "crm")).toBe(true);
    expect(matchesAccessSearch("Financeiro", "")).toBe(true);
    expect(matchesAccessSearch("Financeiro", "Agenda")).toBe(false);
  });
});