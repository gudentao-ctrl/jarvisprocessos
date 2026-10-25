// Editor único da Instrução de Trabalho do setor: foto do Padrão Ouro e tabela de rotina de limpeza.
// Usado no Portal 5S e em "Zonas, Comitê & Marca", com layout próprio para celular.

import { useEffect, useState } from "react";
import { FileText, Plus, Sparkles, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { compressImageFile } from "@/lib/image-compress";
import { saveFivesIT, saveFivesSetor } from "@/lib/fives-storage";
import type { FivesInstrucaoTrabalho, FivesRotinaLimpezaItem, FivesSetor, FrequenciaLimpeza } from "@/lib/fives-types";

interface ITEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Setor a editar; quando vazio, o próprio formulário cria um novo setor. */
  setor: FivesSetor | null;
  companyId: string;
  existing?: FivesInstrucaoTrabalho | null;
  onSaved?: (setorId: string) => void;
}

function novoItem(): FivesRotinaLimpezaItem {
  return {
    id: `rotina-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_local: "",
    procedimento: "",
    produto_epi: "",
    frequencia: "Diária",
    responsavel: "",
  };
}

export function ITEditorDialog({ open, onOpenChange, setor, companyId, existing, onSaved }: ITEditorDialogProps) {
  const isNovoSetor = !setor;
  const [setorNome, setSetorNome] = useState("");
  const [guardiao, setGuardiao] = useState("");
  const [titulo, setTitulo] = useState("");
  const [foto, setFoto] = useState("");
  const [documentoUrl, setDocumentoUrl] = useState("");
  const [rotinas, setRotinas] = useState<FivesRotinaLimpezaItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSetorNome("");
    setGuardiao("");
    setTitulo(existing?.titulo || (setor ? `IT 5S - Padrão de Limpeza e Organização (${setor.nome_setor})` : ""));
    setFoto(existing?.foto_padrao_ouro_url || "");
    setDocumentoUrl(existing?.documento_url || "");
    setRotinas(existing?.rotina_limpeza?.length ? existing.rotina_limpeza : [novoItem()]);
  }, [open, setor, existing]);

  const update = (id: string, patch: Partial<FivesRotinaLimpezaItem>) =>
    setRotinas((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 1600)
      .then(setFoto)
      .catch((err: Error) => toast.error(err.message));
  };

  const handleSave = async () => {
    if (isNovoSetor && !setorNome.trim()) { toast.error("Informe o nome do setor."); return; }
    const itens = rotinas.filter((r) => r.item_local.trim() || r.procedimento.trim());
    try {
      setSaving(true);
      const alvo = setor ?? await saveFivesSetor({ company_id: companyId, nome_setor: setorNome.trim(), guardiao_nome: guardiao.trim(), meta_nota: 90 });
      await saveFivesIT({
        id: setor ? existing?.id : undefined,
        setor_id: alvo.id,
        titulo: titulo.trim() || `IT 5S - Padrão de Limpeza e Organização (${alvo.nome_setor})`,
        foto_padrao_ouro_url: foto || null,
        documento_url: documentoUrl.trim() || null,
        rotina_limpeza: itens,
      });
      toast.success("Padrão de limpeza do setor salvo!");
      onOpenChange(false);
      onSaved?.(alvo.id);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background rounded-2xl shadow-2xl border">
        <div className="p-4 sm:p-5 border-b bg-card pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            {setor ? `Padrão de Limpeza • ${setor.nome_setor}` : "Novo setor e padrão de limpeza"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Foto do Padrão Ouro e tabela de rotina de limpeza do setor.
          </DialogDescription>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {isNovoSetor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-muted/30">
              <div>
                <Label className="text-xs font-semibold">Nome do setor *</Label>
                <Input value={setorNome} onChange={(e) => setSetorNome(e.target.value)} placeholder="Ex.: Almoxarifado" className="text-sm mt-1 h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Guardião do setor</Label>
                <Input value={guardiao} onChange={(e) => setGuardiao(e.target.value)} placeholder="Responsável pelo setor" className="text-sm mt-1 h-10" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Título da instrução</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="IT 5S - Padrão de Limpeza e Organização" className="text-sm mt-1 h-10" />
          </div>

          {/* Padrão Ouro */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Foto do Padrão Ouro (estado ideal)
            </Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-full sm:w-36 h-40 sm:h-24 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {foto ? (
                  <img src={foto} alt="Padrão Ouro" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem foto</span>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
                  <Camera className="h-4 w-4" /> {foto ? "Trocar foto" : "Tirar ou escolher foto"}
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFoto} />
                </label>
                {foto && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setFoto("")}>
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Link do PDF oficial (opcional)</Label>
            <Input
              placeholder="https://..."
              value={documentoUrl}
              onChange={(e) => setDocumentoUrl(e.target.value)}
              className="text-sm mt-1 h-10"
            />
          </div>

          {/* Rotina de limpeza */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-foreground">Tabela de rotina de limpeza</h4>
                <p className="text-xs text-muted-foreground">O que limpar, como, com qual produto, quando e quem.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRotinas((p) => [...p, novoItem()])} className="h-9 text-xs font-semibold shrink-0">
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
            </div>

            {rotinas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum item. Toque em "Item" para adicionar.</p>
            )}

            <div className="space-y-3">
              {rotinas.map((r, idx) => (
                <div key={r.id} className="p-3 bg-muted/30 rounded-xl border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Item {idx + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRotinas((p) => p.filter((x) => x.id !== r.id))}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover item ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Item / local" value={r.item_local} onChange={(e) => update(r.id, { item_local: e.target.value })} className="text-sm h-10" />
                    <Input placeholder="Produto / EPI" value={r.produto_epi} onChange={(e) => update(r.id, { produto_epi: e.target.value })} className="text-sm h-10" />
                    <Input placeholder="Procedimento de limpeza" value={r.procedimento} onChange={(e) => update(r.id, { procedimento: e.target.value })} className="text-sm h-10 sm:col-span-2" />
                    <select
                      value={r.frequencia}
                      onChange={(e) => update(r.id, { frequencia: e.target.value as FrequenciaLimpeza })}
                      className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label="Frequência"
                    >
                      <option value="Diária">Diária</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                    <Input placeholder="Responsável" value={r.responsavel} onChange={(e) => update(r.id, { responsavel: e.target.value })} className="text-sm h-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t bg-card flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="font-bold">
            {saving ? "Salvando..." : "Salvar padrão de limpeza"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
