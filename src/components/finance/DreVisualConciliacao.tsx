import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import type { InvoiceDRECalculation } from "@/utils/pdfGenerator";

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DreVisualConciliacao({
  dre,
  compact = false,
  showTitle = true,
}: {
  dre: InvoiceDRECalculation;
  compact?: boolean;
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-[#E5D5CE] bg-[#FFF8F5]/50 p-3 sm:p-4 text-[#2B1B17] shadow-sm">
      {showTitle && (
        <div className="flex items-center justify-between border-b border-[#E5D5CE]/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#E05A10]" />
            <h4 className="text-xs sm:text-sm font-bold tracking-tight text-[#3E100C]">
              DRE de Conciliação Financeira (Entendimento do Cliente)
            </h4>
          </div>
          <Badge
            variant="outline"
            className={
              dre.isQuitadoAnterior
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 text-[10px] font-semibold"
                : "border-amber-500 bg-amber-50 text-amber-800 text-[10px] font-semibold"
            }
          >
            {dre.isQuitadoAnterior ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saldo Anterior Quitado
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Débito Anterior Pendente
              </span>
            )}
          </Badge>
        </div>
      )}

      {/* Alerta de Quitação Parcial */}
      {dre.alertaQuitacaoParcial && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900 shadow-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E05A10]" />
          <p className="font-medium">{dre.alertaQuitacaoParcial}</p>
        </div>
      )}

      {/* Tabela de Conciliação */}
      <div className="overflow-x-auto rounded-lg border border-[#E5D5CE] bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#3E100C] text-white">
              <th className="py-2 px-3 font-semibold">Linha do Demonstrativo</th>
              <th className="py-2 px-3 font-semibold hidden sm:table-cell">Descrição Visual / Composição</th>
              <th className="py-2 px-3 text-right font-semibold">Valor (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5D5CE]/60">
            {/* 1. Faturamentos Anteriores Pendentes */}
            <tr className="hover:bg-[#FFF8F5]/70 transition-colors">
              <td className="py-2 px-3 font-medium text-[#2B1B17]">
                (+) Faturamentos Anteriores Pendentes
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                Saldo acumulado de faturas passadas não quitadas
              </td>
              <td className="py-2 px-3 text-right font-semibold tabular-nums text-foreground">
                {brl(dre.saldoAnteriorFaturado)}
              </td>
            </tr>

            {/* 2. Pagamentos Efetuados em Faturas Anteriores */}
            <tr className="hover:bg-[#FFF8F5]/70 transition-colors">
              <td className="py-2 px-3 font-medium text-emerald-800">
                (-) Pagamentos Efetuados em Faturas Anteriores
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                Baixas e quitações parciais já consolidadas
              </td>
              <td className="py-2 px-3 text-right font-semibold tabular-nums text-emerald-700">
                (-) {brl(dre.saldoAnteriorPago)}
              </td>
            </tr>

            {/* 3. SALDO ANTERIOR RECLUSO/EM ABERTO */}
            <tr
              className={
                dre.isQuitadoAnterior
                  ? "bg-emerald-50/70 font-semibold"
                  : "bg-amber-50/70 font-semibold"
              }
            >
              <td className="py-2 px-3 font-bold text-[#3E100C]">
                (=) SALDO ANTERIOR RECLUSO/EM ABERTO
              </td>
              <td className="py-2 px-3 hidden sm:table-cell">
                <Badge
                  variant="outline"
                  className={
                    dre.isQuitadoAnterior
                      ? "border-emerald-600 bg-emerald-100 text-emerald-800 text-[10px]"
                      : "border-amber-600 bg-amber-100 text-amber-900 text-[10px]"
                  }
                >
                  {dre.isQuitadoAnterior ? "Quitado" : "Débito Pendente"}
                </Badge>
              </td>
              <td
                className={`py-2 px-3 text-right font-bold tabular-nums ${
                  dre.isQuitadoAnterior ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {brl(dre.saldoAnteriorPendente)}
              </td>
            </tr>

            {/* 4. Faturamento do Período Atual */}
            <tr className="hover:bg-[#FFF8F5]/70 transition-colors">
              <td className="py-2 px-3 font-medium text-[#2B1B17]">
                (+) Faturamento do Período Atual
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                Serviços prestados no mês (Horas R$ + Ferramentas R$ + Despesas R$)
              </td>
              <td className="py-2 px-3 text-right font-semibold tabular-nums text-foreground">
                {brl(dre.faturadoAtual)}
              </td>
            </tr>

            {/* 5. Pagamentos / Adiantamentos no Mês */}
            <tr className="hover:bg-[#FFF8F5]/70 transition-colors">
              <td className="py-2 px-3 font-medium text-emerald-800">
                (-) Pagamentos / Adiantamentos no Mês
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                Entradas e adiantamentos efetuados no ciclo atual
              </td>
              <td className="py-2 px-3 text-right font-semibold tabular-nums text-emerald-700">
                (-) {brl(dre.pagoNoCicloAtual)}
              </td>
            </tr>

            {/* 6. SALDO ATUAL DO PERÍODO */}
            <tr className="bg-slate-50 font-medium">
              <td className="py-2 px-3 font-bold text-[#3E100C]">
                (=) SALDO ATUAL DO PERÍODO
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                Valor referente exclusivamente ao ciclo atual
              </td>
              <td className="py-2 px-3 text-right font-bold tabular-nums text-foreground">
                {brl(dre.saldoAtualPendente)}
              </td>
            </tr>

            {/* 7. TOTAL LÍQUIDO A PAGAR HOJE - Destaque Laranja #E05A10 */}
            <tr className="bg-[#E05A10] text-white">
              <td className="py-3 px-3 font-black text-sm uppercase tracking-wide">
                (=) TOTAL LÍQUIDO A PAGAR HOJE
              </td>
              <td className="py-3 px-3 hidden sm:table-cell text-xs font-semibold text-white/90">
                TOTAL CONSOLIDADO (Saldo Anterior Em Aberto + Saldo Atual)
              </td>
              <td className="py-3 px-3 text-right font-black text-sm sm:text-base tabular-nums text-white">
                {brl(dre.totalLiquidoAPagar)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
