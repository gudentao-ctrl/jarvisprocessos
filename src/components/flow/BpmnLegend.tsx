import { Card } from "@/components/ui/card";

/* Legenda dos símbolos BPMN 2.0 utilizados no diagrama.
 * Renderizada abaixo do renderer e reutilizada na exportação em PDF. */

const ITEMS: { key: string; name: string; description: string; icon: JSX.Element }[] = [
  {
    key: "startEvent",
    name: "Evento inicial",
    description: "Marca o início do processo.",
    icon: <svg viewBox="0 0 36 36" width="28" height="28"><circle cx="18" cy="18" r="15" fill="#fff" stroke="#16a34a" strokeWidth="2" /></svg>,
  },
  {
    key: "endEvent",
    name: "Evento final",
    description: "Marca o encerramento do processo.",
    icon: <svg viewBox="0 0 36 36" width="28" height="28"><circle cx="18" cy="18" r="15" fill="#fff" stroke="#dc2626" strokeWidth="4" /></svg>,
  },
  {
    key: "task",
    name: "Tarefa",
    description: "Atividade atômica realizada pelo responsável.",
    icon: <svg viewBox="0 0 60 36" width="42" height="26"><rect x="1" y="1" rx="6" width="58" height="34" fill="#fff" stroke="#334155" strokeWidth="2" /></svg>,
  },
  {
    key: "userTask",
    name: "Aprovação (User Task)",
    description: "Tarefa manual que exige interação humana.",
    icon: <svg viewBox="0 0 60 36" width="42" height="26"><rect x="1" y="1" rx="6" width="58" height="34" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" /></svg>,
  },
  {
    key: "receiveTask",
    name: "Espera / Recebimento",
    description: "Aguarda evento ou mensagem externa.",
    icon: <svg viewBox="0 0 60 36" width="42" height="26"><rect x="1" y="1" rx="6" width="58" height="34" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" /></svg>,
  },
  {
    key: "exclusiveGateway",
    name: "Gateway Exclusivo (XOR)",
    description: "Escolhe UM caminho com base em uma condição.",
    icon: <svg viewBox="0 0 40 40" width="30" height="30"><polygon points="20,2 38,20 20,38 2,20" fill="#fff" stroke="#d97706" strokeWidth="2" /><text x="20" y="26" fontSize="18" textAnchor="middle" fill="#d97706">×</text></svg>,
  },
  {
    key: "parallelGateway",
    name: "Gateway Paralelo (AND)",
    description: "Executa todos os caminhos em paralelo.",
    icon: <svg viewBox="0 0 40 40" width="30" height="30"><polygon points="20,2 38,20 20,38 2,20" fill="#fff" stroke="#2563eb" strokeWidth="2" /><text x="20" y="26" fontSize="18" textAnchor="middle" fill="#2563eb">+</text></svg>,
  },
  {
    key: "sequenceFlow",
    name: "Fluxo de Sequência",
    description: "Ordem de execução entre elementos.",
    icon: <svg viewBox="0 0 60 20" width="40" height="20"><line x1="4" y1="10" x2="52" y2="10" stroke="#334155" strokeWidth="2" markerEnd="url(#a)" /><defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L6,4 L0,8 z" fill="#334155" /></marker></defs></svg>,
  },
  {
    key: "lane",
    name: "Raia (Lane)",
    description: "Agrupa atividades por responsável.",
    icon: <svg viewBox="0 0 60 30" width="40" height="24"><rect x="1" y="1" width="58" height="28" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" /><line x1="12" y1="1" x2="12" y2="29" stroke="#94a3b8" strokeWidth="1.5" /></svg>,
  },
];

export function BpmnLegend({ used }: { used?: Set<string> }) {
  const items = used && used.size > 0
    ? ITEMS.filter((i) => used.has(i.key) || i.key === "sequenceFlow" || i.key === "lane")
    : ITEMS;
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Legenda BPMN</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-start gap-2 text-xs">
            <div className="shrink-0">{it.icon}</div>
            <div>
              <p className="font-medium leading-tight">{it.name}</p>
              <p className="text-muted-foreground leading-tight">{it.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
