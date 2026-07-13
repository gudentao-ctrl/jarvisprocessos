import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { optimizeProcess, createToBeVersionFromFindings } from "@/lib/flow-optimize.functions";

type Finding = {
  category: string;
  title: string;
  description: string;
  activity_titles: string[];
  impact: "alto" | "medio" | "baixo";
  suggestion: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  duplicidade: "Duplicidade",
  retrabalho: "Retrabalho",
  aprovacao_desnecessaria: "Aprovação desnecessária",
  espera: "Espera",
  gargalo: "Gargalo",
  sem_valor_agregado: "Sem valor agregado",
  automacao: "Automação",
  padronizacao: "Padronização",
};

const IMPACT_COLOR: Record<string, string> = {
  alto: "bg-destructive/15 text-destructive border-destructive/30",
  medio: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  baixo: "bg-muted text-muted-foreground border-border",
};

export function FlowOptimizePanel({ processId }: { processId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [findings, setFindings] = useState<Finding[]>([]);

  async function run() {
    setBusy(true);
    setFindings([]);
    setSummary("");
    try {
      const res = await optimizeProcess({ data: { process_id: processId } });
      setSummary(res.summary);
      setFindings(res.findings as Finding[]);
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao otimizar");
    } finally {
      setBusy(false);
    }
  }

  async function applyAsToBe() {
    setApplying(true);
    try {
      const notes = [summary, ...findings.map((f) => `• [${CATEGORY_LABEL[f.category] ?? f.category}] ${f.title}: ${f.suggestion}`)].join("\n");
      await createToBeVersionFromFindings({
        data: { process_id: processId, label: "TO BE — Otimização IA", notes },
      });
      toast.success("Versão TO BE criada a partir das sugestões");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao aplicar");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
        Otimizar Processo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Sugestões de Otimização
            </DialogTitle>
          </DialogHeader>
          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
          <div className="space-y-2 mt-2">
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum achado identificado.</p>
            ) : findings.map((f, i) => (
              <Card key={i} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[f.category] ?? f.category}</Badge>
                  <Badge className={`text-[10px] border ${IMPACT_COLOR[f.impact] ?? IMPACT_COLOR.medio}`} variant="outline">
                    impacto {f.impact}
                  </Badge>
                  <p className="text-sm font-semibold">{f.title}</p>
                </div>
                {f.activity_titles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Atividades: {f.activity_titles.join(", ")}
                  </p>
                )}
                <p className="text-xs">{f.description}</p>
                <div className="text-xs bg-primary/5 border-l-2 border-primary pl-2 py-1 rounded">
                  <span className="font-semibold">Sugestão:</span> {f.suggestion}
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            <Button onClick={applyAsToBe} disabled={applying || findings.length === 0}>
              {applying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Salvar como versão TO BE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
