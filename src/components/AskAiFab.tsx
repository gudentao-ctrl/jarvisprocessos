import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { askConsultantAi } from "@/lib/ask-ai.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X } from "lucide-react";

type Props = { scope: "project" | "process"; scopeId: string };

const SUGGESTIONS = [
  "Quais são os principais gargalos?",
  "Onde há desperdícios ou atividades sem valor agregado?",
  "Quais indicadores estão faltando?",
  "Quais riscos operacionais existem?",
  "Sugira melhorias Lean priorizadas",
  "Sugira automações viáveis",
  "Gere um plano de ação para as top 3 dores",
  "Escreva um resumo executivo do estado atual",
];

export function AskAiFab({ scope, scopeId }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const ask = useServerFn(askConsultantAi);
  const mut = useMutation({
    mutationFn: (q: string) => ask({ data: { question: q, scope, scopeId } }),
    onSuccess: (r) => setAnswer(r.answer),
    onError: (e: any) => setAnswer(`⚠ ${e?.message ?? "Erro ao consultar IA"}`),
  });

  function submit(q: string) {
    const clean = q.trim();
    if (clean.length < 3) return;
    setQuestion(clean);
    setAnswer(null);
    mut.mutate(clean);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-8"
        aria-label="Perguntar à IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl pb-8 sm:max-w-lg sm:mx-auto"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Perguntar à IA
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="O que você quer analisar?"
              className="min-h-24 text-base"
            />
            <Button
              onClick={() => submit(question)}
              disabled={mut.isPending || question.trim().length < 3}
              className="min-h-11 w-full"
            >
              {mut.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando…</>) : "Perguntar"}
            </Button>

            {!answer && !mut.isPending && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugestões</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-full border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70 active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {answer && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resposta</span>
                  <button onClick={() => setAnswer(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{answer}</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
