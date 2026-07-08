import { AlertTriangle, AlertCircle, Info } from "lucide-react";
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
}: {
  issues: FlowIssue[];
  activities: { id: string; title: string }[];
  onFocus: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warn").length;

  return (
    <Card className="p-3">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Inconsistências
          {errors > 0 && <span className="text-destructive">({errors} erros)</span>}
          {warns > 0 && <span className="text-amber-600">({warns} avisos)</span>}
        </div>
        <span className="text-xs text-muted-foreground">{open ? "ocultar" : "mostrar"}</span>
      </button>
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
