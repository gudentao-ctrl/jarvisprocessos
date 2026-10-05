import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Receipt,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "—");

export function AnexarNfModal({
  open,
  onOpenChange,
  payment,
  onUpdateAttachments,
  isUpdating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  onUpdateAttachments: (payload: {
    paymentId: string;
    nfUrl?: string | null;
    nfName?: string | null;
    nfStatus?: "anexada" | "pendente";
    receiptUrl?: string | null;
    receiptName?: string | null;
  }) => Promise<any>;
  isUpdating: boolean;
}) {
  const [nfFile, setNfFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<{ name: string; dataUrl: string } | null>(null);

  useEffect(() => {
    if (payment) {
      if (payment.nfUrl) {
        setNfFile({ name: payment.nfName || "nota_fiscal.pdf", dataUrl: payment.nfUrl });
      } else {
        setNfFile(null);
      }
      if (payment.receiptUrl) {
        setReceiptFile({
          name: payment.receiptName || "comprovante.pdf",
          dataUrl: payment.receiptUrl,
        });
      } else {
        setReceiptFile(null);
      }
    }
  }, [payment]);

  if (!payment) return null;

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
      toast.success("Arquivo de NF carregado!");
    };
    reader.readAsDataURL(file);
  }

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
      toast.success("Comprovante carregado!");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    try {
      await onUpdateAttachments({
        paymentId: payment.id,
        nfUrl: nfFile?.dataUrl || null,
        nfName: nfFile?.name || null,
        nfStatus: nfFile ? "anexada" : "pendente",
        receiptUrl: receiptFile?.dataUrl || null,
        receiptName: receiptFile?.name || null,
      });
      toast.success("Anexos atualizados com sucesso!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível atualizar os anexos.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#3E100C]" />
            <div>
              <DialogTitle className="text-base font-bold text-[#3E100C]">
                Gerenciar Nota Fiscal & Comprovante
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Pagamento de <strong className="text-foreground">{brl(payment.amount)}</strong> em{" "}
                {fmtDate(payment.paid_at)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Seção da Nota Fiscal (NF da Maia) */}
          <div className="rounded-xl border border-[#3E100C]/20 bg-[#FFF8F5]/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#3E100C] flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Nota Fiscal (NF) da Maia Consultoria
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

            {nfFile ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-2.5 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-emerald-950 truncate max-w-[200px]">
                    📄 {nfFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {nfFile.dataUrl && (
                    <a
                      href={nfFile.dataUrl}
                      download={nfFile.name || "nota_fiscal.pdf"}
                      className="inline-flex h-7 items-center gap-1 rounded bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </a>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setNfFile(null)}
                    title="Remover anexo da NF"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Selecione o arquivo da NF (.pdf, .xml, .png, .jpg):
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.xml,image/*"
                  onChange={handleNfUpload}
                  className="mt-1 h-9 text-xs file:mr-2 file:h-7 file:rounded file:border-0 file:bg-[#3E100C]/10 file:text-[#3E100C] file:px-2 file:text-xs"
                />
              </div>
            )}
          </div>

          {/* Seção do Comprovante de Pagamento do Cliente */}
          <div className="rounded-xl border p-3.5 bg-muted/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-primary" /> Comprovante de Pagamento do Cliente
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {receiptFile ? "Comprovante Anexado" : "Sem Comprovante"}
              </Badge>
            </div>

            {receiptFile ? (
              <div className="flex items-center justify-between rounded-lg border bg-white p-2.5 shadow-2xs">
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  📎 {receiptFile.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {receiptFile.dataUrl && (
                    <a
                      href={receiptFile.dataUrl}
                      download={receiptFile.name || "comprovante.pdf"}
                      className="inline-flex h-7 items-center gap-1 rounded bg-slate-100 px-2 text-[11px] font-medium text-slate-800 hover:bg-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </a>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setReceiptFile(null)}
                    title="Remover anexo do comprovante"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Selecione o comprovante recebido (PDF ou Imagem):
                </Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptUpload}
                  className="mt-1 h-9 text-xs file:mr-2 file:h-7 file:rounded file:border-0 file:bg-muted file:px-2 file:text-xs"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-[#3E100C] hover:bg-[#3E100C]/90 text-white font-bold"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
