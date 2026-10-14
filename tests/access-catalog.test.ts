import { describe, expect, it } from "vitest";
import { ACCESS_CATALOG, matchesAccessSearch } from "../src/lib/access-catalog";
import { ALL_PERMISSION_TOOLS, canUsePermission, permissionsPreset, toolsForPath } from "../src/lib/permission-catalog";

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

describe("granular permission catalog", () => {
  it("keeps every granular tool key unique", () => {
    const keys = ALL_PERMISSION_TOOLS.map((tool) => tool.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("makes the client preset read-only for strategic map and indicator history", () => {
    const client = permissionsPreset("CLIENTE");
    expect(canUsePermission(client, "mapa_estrategico", "read")).toBe(true);
    expect(canUsePermission(client, "mapa_estrategico", "update")).toBe(false);
    expect(canUsePermission(client, "indicadores_historico", "read")).toBe(true);
    expect(canUsePermission(client, "indicadores_cadastro", "read")).toBe(false);
  });

  it("keeps finance and CRM off for consultants and on for managers", () => {
    expect(canUsePermission(permissionsPreset("CONSULTOR"), "faturamentos")).toBe(false);
    expect(canUsePermission(permissionsPreset("CONSULTOR"), "crm_leads")).toBe(false);
    expect(canUsePermission(permissionsPreset("GESTOR"), "faturamentos", "delete")).toBe(true);
    expect(canUsePermission(permissionsPreset("GESTOR"), "crm_leads", "update")).toBe(true);
  });

  it("maps protected paths to their granular tools", () => {
    expect(toolsForPath("/pessoas/mentorias")).toEqual(["mentorias"]);
    expect(toolsForPath("/financeiro")).toEqual(["faturamentos", "pagamentos", "relatorios_faturamento"]);
  });
});