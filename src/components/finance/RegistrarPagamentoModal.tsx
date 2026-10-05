import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  FileText,
  Upload,
  X,
  FileCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/finance.functions";
import { toast } from "sonner";

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RegistrarPagamentoModal({
  open,
  onOpenChange,
  companyName,
  currentBalance,
  onSavePayment,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName?: string;
  currentBalance: number;
  onSavePayment: (payload: {
    paid_at: string;
    amount: number;
    method: string;
    reference: string;
    notes: string;
    receiptUrl?: string | null;
    receiptName?: string | null;
    nfUrl?: string | null;
    nfName?: string | null;
  }) => Promise<any>;
  isSaving: boolean;
}) {
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amountStr, setAmountStr] = useState<string>(
    currentBalance > 0 ? String(currentBalance) : "",
  );
  const amount = Number(amountStr.replace(",", ".")) || 0;
  const [method, setMethod] = useState<string>("pix");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Arquivos anexos
  const [receiptFile, setReceiptFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [nfFile, setNfFile] = useState<{ name: string; dataUrl: string } | null>(null);

  // Upload do Comprovante do Cliente
  function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O comprovante deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptFile({
        name: file.name,
        dataUrl: reader.result as string,
      });
      toast.success("Comprovante anexado!");
    };
    reader.readAsDataURL(file);
  }

  // Upload da Nota Fiscal (NF) da Maia
  function handleNfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo da NF deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNfFile({
        name: file.name,
        dataUrl: reader.result as string,
      });
      toast.success("Nota Fiscal (NF) anexada!");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Informe um valor de pagamento válido.");
      return;
    }

    try {
      await onSavePayment({
        paid_at: paidAt,
        amount,
        method,
        reference,
        notes,
        receiptUrl: receiptFile?.dataUrl || null,
        receiptName: receiptFile?.name || null,
        nfUrl: nfFile?.dataUrl || null,
        nfName: nfFile?.name || null,
      });

      // Limpa formulário
      setAmountStr("");
      setReference("");
      setNotes("");
      setReceiptFile(null);
      setNfFile(null);
      onOpenChange(false);
    } catch {
      // Erro tratado externamente
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Pagamento do Cliente
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Cliente: <strong className="text-foreground">{companyName || "—"}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          {/* Alerta de Saldo e Atalho de Quitação */}
          {currentBalance > 0.01 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
              <div>
                <span className="font-semibold">Saldo Devedor Atual: </span>
                <strong className="text-amber-800 text-sm font-bold">{brl(currentBalance)}</strong>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-400 bg-white text-amber-900 hover:bg-amber-100 font-semibold"
                onClick={() => setAmountStr(String(currentBalance))}
              >
                Preencher Valor Total
              </Button>
            </div>
          )}

          {/* Valor e Data */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Valor Pago (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                className="h-10 font-bold text-base"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Aceita pagamentos totais ou parciais.
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold">Data do Pagamento *</Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="h-10 text-xs"
                required
              />
            </div>
          </div>

          {/* Forma e Referência */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Forma de Recebimento *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Referência / Código</Label>
              <Input
                placeholder="Ex: PIX Santander, TED #9921"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          {/* Upload: Comprovante de Pagamento do Cliente */}
          <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Anexo do Comprovante do Cliente (PDF / Imagem)</span>
              {receiptFile && (
                <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                  <FileCheck className="h-3 w-3 mr-1" /> Selecionado
                </Badge>
              )}
            </Label>
            {receiptFile ? (
              <div className="flex items-center justify-between rounded border bg-white p-2 text-xs">
                <span className="truncate max-w-[280px] font-medium text-foreground">
                  📎 {receiptFile.name}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setReceiptFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptUpload}
                className="h-9 text-xs file:mr-2 file:h-7 file:rounded file:border-0 file:bg-muted file:px-2 file:text-xs"
              />
            )}
          </div>

          {/* Upload: Nota Fiscal (NF da Consultoria) */}
          <div className="rounded-lg border border-[#3E100C]/20 bg-[#FFF8F5]/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#3E100C]" />
                Nota Fiscal (NF) da Maia Consultoria
              </Label>
              <Badge
                variant="outline"
                className={
                  nfFile
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 text-[10px]"
                    : "border-amber-500 bg-amber-50 text-amber-800 text-[10px]"
                }
              >
                {nfFile ? "NF Anexada" : "Pendente de NF"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Anexe a NF emitida (.pdf, .xml, .png, .jpg). O upload é opcional agora e pode ser feito a qualquer momento.
            </p>
            {nfFile ? (
              <div className="flex items-center justify-between rounded border border-emerald-200 bg-white p-2 text-xs">
                <span className="truncate max-w-[280px] font-medium text-emerald-900">
                  📄 {nfFile.name}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setNfFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept=".pdf,.xml,image/*"
                onChange={handleNfUpload}
                className="h-9 text-xs file:mr-2 file:h-7 file:rounded file:border-0 file:bg-[#3E100C]/10 file:text-[#3E100C] file:px-2 file:text-xs"
              />
            )}
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs font-semibold">Observações internas</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagamento parcial referente à fatura de setembro..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || amount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando…
                </>
              ) : (
                "Registrar Pagamento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
