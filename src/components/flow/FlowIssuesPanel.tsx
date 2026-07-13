import { AlertTriangle, AlertCircle, Info, Wand2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type FlowIssue = {
  severity: "error" | "warn" | "info";
  message: string;
  activityId: string | null;
};

const ICON = {
  error: AlertCircle,
  warn: AlertTriangle,
  info: Info,
};
const COLOR = {
  error: "text-destructive",
  warn: "text-amber-600",
  info: "text-muted-foreground",
};

export function FlowIssuesPanel({
  issues,
  activities,
  onFocus,
  onAutofix,
}: {
  issues: FlowIssue[];
  activities: { id: string; title: string }[];
  onFocus: (id: string) => void;
  onAutofix?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [fixing, setFixing] = useState(false);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warn").length;

  async function handleFix() {
    if (!onAutofix) return;
    setFixing(true);
    try { await onAutofix(); } finally { setFixing(false); }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button className="flex items-center gap-2 flex-1 text-left min-w-0" onClick={() => setOpen((v) => !v)}>
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium">Inconsistências</span>
          {errors > 0 && <span className="text-xs text-destructive">({errors} erros)</span>}
          {warns > 0 && <span className="text-xs text-amber-600">({warns} avisos)</span>}
        </button>
        {onAutofix && issues.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleFix} disabled={fixing}>
            {fixing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Corrigir automaticamente
          </Button>
        )}
      </div>
      {open && (
        <ul className="mt-2 space-y-1">
          {issues.map((i, idx) => {
            const Icon = ICON[i.severity];
            return (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${COLOR[i.severity]}`} />
                <span className="flex-1">{i.message}</span>
                {i.activityId && (
                  <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs" onClick={() => onFocus(i.activityId!)}>
                    abrir
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
