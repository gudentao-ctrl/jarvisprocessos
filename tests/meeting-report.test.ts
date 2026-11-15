import { describe, expect, it } from "vitest";
import { buildMeetingReport } from "../src/lib/meeting-report";

const t = "O objetivo principal é reduzir o custo do processo de compras. Maria vai enviar a planilha de fornecedores até sexta. O contrato ainda não foi assinado pelo cliente. O fluxo de aprovação foi validado por todos os gestores.";

describe("meeting report", () => {
  it("assigns actions to the named participant with the spoken deadline", () => {
    const r = buildMeetingReport(t, "Maria Souza, João");
    expect(r.actions[0]).toMatchObject({ owner: "Maria Souza", deadline: "até sexta" });
  });
  it("lists pending items and validations from real sentences only", () => {
    const r = buildMeetingReport(t);
    expect(r.pending).toEqual(["O contrato ainda não foi assinado pelo cliente."]);
    expect(r.validations).toEqual(["O fluxo de aprovação foi validado por todos os gestores."]);
  });
  it("returns an empty report for an empty transcript", () => {
    const r = buildMeetingReport("");
    expect(r.actions.length + r.summary.length + r.pending.length).toBe(0);
  });
});
