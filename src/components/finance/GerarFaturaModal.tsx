import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  QrCode,
  Building2,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import { DreVisualConciliacao } from "./DreVisualConciliacao";
import {
  type PaymentMethodMaia,
  calculateInvoiceDRE,
  generateMaiaInvoicePDFs,
  type InvoiceReportData,
} from "@/utils/pdfGenerator";
import { toast } from "sonner";

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtHours = (h: number) => {
  const t = Math.round(Number(h ?? 0) * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export function GerarFaturaModal({
  open,
  onOpenChange,
  company,
  selectedRows,
  preview,
  rate,
  pastInvoices,
  pastPayments,
  savedPaymentMethods,
  onSavePaymentMethod,
  onConfirmInvoice,
  isProcessing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  selectedRows: any[];
  preview: {
    hours: number;
    expenses: number;
    tools: number;
    hoursAmount: number;
    total: number;
  };
  rate: number;
  pastInvoices: any[];
  pastPayments: any[];
  savedPaymentMethods: PaymentMethodMaia[];
  onSavePaymentMethod: (method: PaymentMethodMaia) => Promise<any>;
  onConfirmInvoice: (payload: { notes: string; hourlyRate: number; advancePayment?: number }) => Promise<any>;
  isProcessing: boolean;
}) {
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [advancePaymentStr, setAdvancePaymentStr] = useState("");
  const advancePayment = Number(advancePaymentStr.replace(",", ".")) || 0;

  // Formas de pagamento
  const defaultMethod = useMemo(() => {
    return (
      savedPaymentMethods.find((m) => m.isDefault) ||
      savedPaymentMethods[0] || {
        id: "maia-itau-cnpj",
        tipoChave: "CNPJ" as const,
        chavePix: "58.291.890/0001-34",
        banco: "Banco Itaú (341)",
        favorecido: "Maia Consultoria Empresarial LTDA",
        isDefault: true,
      }
    );
  }, [savedPaymentMethods]);

  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultMethod.id || "");
  const [showNewMethodForm, setShowNewMethodForm] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

  // Form de método
  const [newMethod, setNewMethod] = useState<{
    tipoChave: "CNPJ" | "TELEFONE" | "EMAIL" | "ALEATORIA" | "DADOS_BANCARIOS";
    chavePix: string;
    banco: string;
    favorecido: string;
    qrCodeUrl: string;
    isDefault: boolean;
  }>({
    tipoChave: "CNPJ",
    chavePix: "",
    banco: "Banco Itaú",
    favorecido: "Maia Consultoria Empresarial LTDA",
    qrCodeUrl: "",
    isDefault: false,
  });
  const [savingMethod, setSavingMethod] = useState(false);

  useEffect(() => {
    if (defaultMethod?.id && !selectedMethodId) {
      setSelectedMethodId(defaultMethod.id);
    }
  }, [defaultMethod, selectedMethodId]);

  const activeMethod = useMemo(() => {
    return savedPaymentMethods.find((m) => m.id === selectedMethodId) || defaultMethod;
  }, [savedPaymentMethods, selectedMethodId, defaultMethod]);

  // Cálculos do DRE (considerando apenas pagamentos confirmados do histórico)
  const dre = useMemo(() => {
    const faturadoAnt = pastInvoices.reduce((acc, inv) => acc + Number(inv.total_amount ?? 0), 0);
    const pagoAnt = pastPayments
      .filter((p: any) => p.confirmation_status !== "pendente")
      .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    const faturadoAtual = preview.total;
    const pagoCiclo = advancePayment;

    return calculateInvoiceDRE({
      saldoAnteriorFaturado: faturadoAnt,
      saldoAnteriorPago: pagoAnt,
      faturadoAtual,
      pagoNoCicloAtual: pagoCiclo,
    });
  }, [pastInvoices, pastPayments, preview.total, advancePayment]);

  // Handler de Upload do QR Code
  function handleQrCodeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("O arquivo de QR Code deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewMethod((prev) => ({ ...prev, qrCodeUrl: reader.result as string }));
      toast.success("QR Code carregado com sucesso!");
    };
    reader.readAsDataURL(file);
  }

  function handleStartNewMethod() {
    setEditingMethodId(null);
    setNewMethod({
      tipoChave: "CNPJ",
      chavePix: "",
      banco: "Banco Itaú",
      favorecido: "Maia Consultoria Empresarial LTDA",
      qrCodeUrl: "",
      isDefault: false,
    });
    setShowNewMethodForm(true);
  }

  function handleStartEditMethod(methodToEdit: PaymentMethodMaia) {
    setEditingMethodId(methodToEdit.id || null);
    setNewMethod({
      tipoChave: methodToEdit.tipoChave || "CNPJ",
      chavePix: methodToEdit.chavePix || "",
      banco: methodToEdit.banco || "",
      favorecido: methodToEdit.favorecido || "Maia Consultoria Empresarial LTDA",
      qrCodeUrl: methodToEdit.qrCodeUrl || "",
      isDefault: !!methodToEdit.isDefault,
    });
    setShowNewMethodForm(true);
  }

  // Salvar / Atualizar método de pagamento
  async function handleSaveMethod() {
    if (!newMethod.chavePix.trim()) {
      toast.error("Informe a chave PIX.");
      return;
    }
    if (!newMethod.banco.trim()) {
      toast.error("Informe o banco.");
      return;
    }
    setSavingMethod(true);
    try {
      const targetId = editingMethodId || activeMethod?.id || `maia-pix-${Date.now()}`;
      const saved = await onSavePaymentMethod({
        id: targetId,
        ...newMethod,
      });
      toast.success(editingMethodId ? "Forma de pagamento atualizada com sucesso!" : "Nova forma de pagamento salva!");
      if (saved?.id) {
        setSelectedMethodId(saved.id);
      }
      setShowNewMethodForm(false);
      setEditingMethodId(null);
      setNewMethod({
        tipoChave: "CNPJ",
        chavePix: "",
        banco: "Banco Itaú",
        favorecido: "Maia Consultoria Empresarial LTDA",
        qrCodeUrl: "",
        isDefault: false,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar forma de pagamento.");
    } finally {
      setSavingMethod(false);
    }
  }

  // Emissão e geração dos PDFs
  async function handleEmitInvoiceAndPdfs() {
    try {
      // 1. Confirma faturamento no banco (com eventual adiantamento para ficar pendente na aba de pagamentos)
      const invoice = await onConfirmInvoice({
        notes: invoiceNotes,
        hourlyRate: rate,
        advancePayment: advancePayment,
      });

      // 2. Prepara dados para os PDFs
      const dates = selectedRows.map((r: any) => r.work_date).sort();
      const periodFrom = dates[0] ?? null;
      const periodTo = dates[dates.length - 1] ?? null;

      // Agrupa despesas por categoria
      const expensesBreakdown: Record<string, number> = {};
      for (const r of selectedRows) {
        for (const e of r.work_hour_expenses ?? []) {
          const cat = e.category || "deslocamento";
          expensesBreakdown[cat] = (expensesBreakdown[cat] || 0) + Number(e.amount || 0);
        }
      }

      const reportData: InvoiceReportData = {
        company: {
          id: company?.id,
          name: company?.name || "Cliente",
          title: company?.public_title || company?.name,
          company_logo: company?.public_company_logo_url,
          consultancy_logo: company?.public_consultancy_logo_url,
        },
        period: { from: periodFrom, to: periodTo },
        invoiceId: invoice?.id,
        invoiceNumber: invoice?.id?.slice(0, 8),
        invoicedAt: invoice?.invoiced_at || new Date().toISOString(),
        hourlyRate: rate,
        totalHours: preview.hours,
        totalHorasR$: preview.hoursAmount,
        totalDespesasR$: preview.expenses,
        totalFerramentasR$: preview.tools,
        expensesBreakdown,
        rows: selectedRows,
        dre,
        notes: invoiceNotes,
      };

      // 3. Gera e baixa ambos os PDFs
      const pdfs = await generateMaiaInvoicePDFs(reportData, activeMethod);
      pdfs.downloadResumido();
      pdfs.downloadDetalhado();

      toast.success("Fatura confirmada e PDFs (Resumido e Detalhado) gerados com sucesso!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível emitir a fatura.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#3E100C]" />
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#3E100C]">
                Gerar Fatura & Demonstrativo Visual (Maia Consultoria)
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Cliente: <strong className="text-foreground">{company?.name || "—"}</strong> ·{" "}
                {selectedRows.length} lançamento(s) selecionado(s)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* 1. Resumo Rápido em Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/20 p-2.5">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Horas ({fmtHours(preview.hours)})
              </span>
              <p className="text-sm font-bold text-foreground">{brl(preview.hoursAmount)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-2.5">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Despesas
              </span>
              <p className="text-sm font-bold text-foreground">{brl(preview.expenses)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-2.5">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Ferramentas
              </span>
              <p className="text-sm font-bold text-foreground">{brl(preview.tools)}</p>
            </div>
            <div className="rounded-lg border border-[#E05A10]/40 bg-[#FFF8F5] p-2.5">
              <span className="text-[11px] text-[#E05A10] uppercase font-bold">
                Total Período
              </span>
              <p className="text-sm font-black text-[#E05A10]">{brl(preview.total)}</p>
            </div>
          </div>

          {/* Adiantamento / Pagamento no Ciclo */}
          <div className="rounded-lg border border-dashed p-3 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-foreground">
                Adiantamentos / Entradas já efetuadas neste ciclo (R$):
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Informe caso o cliente já tenha pago adiantamento referente a este mês.
              </p>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={advancePaymentStr}
              onChange={(e) => setAdvancePaymentStr(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="h-9 w-full sm:w-44 text-right font-semibold"
            />
          </div>

          {/* 2. DRE Visual de Conciliação Financeira */}
          <DreVisualConciliacao dre={dre} />

          {/* 3. Seleção de Dados Bancários / PIX da Maia */}
          <div className="space-y-3 rounded-xl border border-[#3E100C]/20 bg-[#FFF8F5]/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#3E100C]" />
                <Label className="text-xs font-bold text-[#3E100C]">
                  Dados Bancários / PIX da Maia Consultoria (para impressão nos PDFs)
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                {activeMethod && !showNewMethodForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#E05A10]/40 text-[#3E100C] hover:bg-[#FFF8F5]"
                    onClick={() => handleStartEditMethod(activeMethod)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#E05A10]" /> Editar Selecionada
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 border-[#3E100C]/30 text-[#3E100C] hover:bg-[#3E100C]/5"
                  onClick={() => {
                    if (showNewMethodForm) {
                      setShowNewMethodForm(false);
                      setEditingMethodId(null);
                    } else {
                      handleStartNewMethod();
                    }
                  }}
                >
                  {showNewMethodForm ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> + Nova Forma Maia
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Dropdown de Contas Salvas */}
            {!showNewMethodForm && (
              <div className="space-y-2">
                <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                  <SelectTrigger className="h-10 text-xs font-medium">
                    <SelectValue placeholder="Selecione a conta/PIX para esta fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPaymentMethods.map((m) => (
                      <SelectItem key={m.id || m.chavePix} value={m.id || m.chavePix}>
                        {m.banco} — PIX {m.tipoChave}: {m.chavePix}{" "}
                        {m.isDefault ? "(Padrão)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Card de Visualização da Conta Ativa */}
                {activeMethod && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border bg-white p-3 text-xs shadow-2xs">
                    <div className="space-y-1">
                      <p className="font-bold text-[#3E100C]">
                        Favorecido: {activeMethod.favorecido}
                      </p>
                      <p className="text-muted-foreground">
                        Banco: <strong className="text-foreground">{activeMethod.banco}</strong> ·
                        Chave ({activeMethod.tipoChave}):{" "}
                        <strong className="text-[#E05A10]">{activeMethod.chavePix}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activeMethod.qrCodeUrl ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <img
                            src={activeMethod.qrCodeUrl}
                            alt="QR Code PIX"
                            className="h-10 w-10 rounded border object-contain p-0.5"
                          />
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            QR Code pronto
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] shrink-0">
                          <QrCode className="h-4 w-4" /> Sem imagem QR
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-[#E05A10] hover:text-[#3E100C] hover:bg-[#FFF8F5]"
                        onClick={() => handleStartEditMethod(activeMethod)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Formulário: Cadastrar / Editar Forma de Pagamento Maia */}
            {showNewMethodForm && (
              <div className="space-y-3 rounded-lg border border-[#E05A10]/40 bg-white p-3 text-xs shadow-xs animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#3E100C] text-xs">
                    {editingMethodId ? "Editar Forma de Pagamento Maia" : "Cadastrar Nova Conta / Chave PIX da Maia"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground"
                    onClick={() => {
                      setShowNewMethodForm(false);
                      setEditingMethodId(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[11px]">Tipo de Chave *</Label>
                    <Select
                      value={newMethod.tipoChave}
                      onValueChange={(v: any) => setNewMethod({ ...newMethod, tipoChave: v })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="TELEFONE">Telefone</SelectItem>
                        <SelectItem value="EMAIL">E-mail</SelectItem>
                        <SelectItem value="ALEATORIA">Chave Aleatória</SelectItem>
                        <SelectItem value="DADOS_BANCARIOS">Conta Bancária / Agência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Chave PIX / Dados *</Label>
                    <Input
                      placeholder="Ex: 58.291.890/0001-34"
                      value={newMethod.chavePix}
                      onChange={(e) => setNewMethod({ ...newMethod, chavePix: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Banco / Instituição *</Label>
                    <Input
                      placeholder="Ex: Banco Itaú (341)"
                      value={newMethod.banco}
                      onChange={(e) => setNewMethod({ ...newMethod, banco: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px]">Nome do Favorecido *</Label>
                    <Input
                      placeholder="Ex: Maia Consultoria Empresarial LTDA"
                      value={newMethod.favorecido}
                      onChange={(e) => setNewMethod({ ...newMethod, favorecido: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Upload Imagem QR Code PIX (PNG/JPG)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleQrCodeUpload}
                        className="h-9 text-xs file:mr-2 file:h-7 file:rounded file:border-0 file:bg-muted file:px-2 file:text-xs"
                      />
                      {newMethod.qrCodeUrl && (
                        <div className="flex items-center gap-1 shrink-0">
                          <img
                            src={newMethod.qrCodeUrl}
                            alt="Preview"
                            className="h-8 w-8 rounded border object-contain shrink-0"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setNewMethod((prev) => ({ ...prev, qrCodeUrl: "" }))}
                            title="Remover QR Code"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-default-pix"
                      checked={newMethod.isDefault}
                      onCheckedChange={(c) => setNewMethod({ ...newMethod, isDefault: !!c })}
                    />
                    <label
                      htmlFor="save-default-pix"
                      className="cursor-pointer text-[11px] font-medium text-muted-foreground"
                    >
                      Salvar como padrão para futuras faturas
                    </label>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-[#3E100C] hover:bg-[#3E100C]/90 text-white text-xs font-semibold"
                    disabled={savingMethod}
                    onClick={handleSaveMethod}
                  >
                    {savingMethod
                      ? "Salvando..."
                      : editingMethodId
                        ? "Salvar Alterações"
                        : "Salvar Forma de Pagamento"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Observações da Fatura */}
          <div>
            <Label className="text-xs font-semibold">Observações internas / instruções na fatura</Label>
            <Textarea
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Ex: Faturamento referente aos serviços do mês. Vencimento em 5 dias úteis."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEmitInvoiceAndPdfs}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-[#E05A10] hover:bg-[#E05A10]/90 text-white font-bold gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processando Fatura…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> Confirmar e Emitir PDFs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
