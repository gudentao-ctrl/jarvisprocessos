import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateFlowForProcess } from "@/lib/flow-ai.functions";

export function GenerateFlowAiButton({
  processId,
  hasActivities,
  onDone,
}: {
  processId: string;
  hasActivities: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [replace, setReplace] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await generateFlowForProcess({ data: { process_id: processId, description, replace } });
      toast.success(`Fluxo gerado: ${r.activities} atividades, ${r.connections} conexões`);
      setOpen(false);
      setDescription("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar fluxo com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A IA usará o nome, objetivo, entradas/saídas e a entrevista de origem (se houver) como contexto.
              Adicione observações abaixo se quiser guiá-la.
            </p>
            <div>
              <Label>Contexto adicional (opcional)</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: incluir aprovação da diretoria antes da compra; considerar retrabalho quando NF diverge…"
              />
            </div>
            {hasActivities && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
                Substituir fluxo atual (apaga atividades e conexões existentes)
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
