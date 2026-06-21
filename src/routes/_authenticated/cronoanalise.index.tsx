import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Timer } from "lucide-react";
import { listCronoSessions } from "@/lib/processes.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/cronoanalise/")({
  component: CronoIndex,
});

function CronoIndex() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { listCronoSessions().then((d) => { setList(d); setLoading(false); }); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cronoanálise</h1>
          <p className="text-sm text-muted-foreground">Observações de campo com classificação VA / NVA / NNVA</p>
        </div>
        <Link to="/cronoanalise/nova"><Button><Plus className="h-4 w-4 mr-1" /> Nova sessão</Button></Link>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
        list.length === 0 ? (
          <Card className="p-8 text-center"><Timer className="h-10 w-10 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sem sessões.</p></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">{list.map((c) => (
            <Link key={c.id} to="/cronoanalise/$id" params={{ id: c.id }}>
              <Card className="p-4 hover:bg-secondary">
                <p className="font-medium">{c.production_line || "Sessão"} · {c.product || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.companies?.name ?? "—"} · {c.observation_date}</p>
                <p className="text-xs text-muted-foreground">{c.machine}</p>
              </Card>
            </Link>
          ))}</div>
        )
      }
    </div>
  );
}
