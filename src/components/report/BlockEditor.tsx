import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { ReportBlock } from "@/lib/report-types";

export function BlockEditor({
  block, open, onClose, onSave,
}: {
  block: ReportBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: (b: ReportBlock) => void;
}) {
  const [draft, setDraft] = useState<ReportBlock | null>(block);
  useEffect(() => setDraft(block), [block]);

  if (!draft) return null;

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => d ? { ...d, imageDataUrl: reader.result as string } : d);
    reader.readAsDataURL(file);
  }

  const isText = ["summary", "text", "recommendations", "kpis", "actions_info", "indicators_info",
    "agenda_info", "hours_info", "crono_info", "improvements_info"].includes(draft.type);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar bloco</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          {isText && (
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={draft.content ?? ""}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={14}
              />
            </div>
          )}
          {draft.type === "image" && (
            <>
              <div>
                <Label>Imagem</Label>
                <Input type="file" accept="image/*" onChange={handleImage} />
                {draft.imageDataUrl && (
                  <img src={draft.imageDataUrl} alt="" className="mt-2 max-h-60 rounded border" />
                )}
              </div>
              <div>
                <Label>Legenda</Label>
                <Input
                  value={draft.imageCaption ?? ""}
                  onChange={(e) => setDraft({ ...draft, imageCaption: e.target.value })}
                />
              </div>
            </>
          )}
          {draft.type === "table" && (
            <div>
              <Label>Tabela (uma linha por linha; colunas separadas por |)</Label>
              <Textarea
                value={(draft.tableRows ?? []).map((r) => r.join(" | ")).join("\n")}
                onChange={(e) => setDraft({
                  ...draft,
                  tableRows: e.target.value.split("\n").map((l) => l.split("|").map((c) => c.trim())),
                })}
                rows={8}
                placeholder={"Coluna A | Coluna B | Coluna C\nValor 1 | Valor 2 | Valor 3"}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => draft && onSave(draft)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
