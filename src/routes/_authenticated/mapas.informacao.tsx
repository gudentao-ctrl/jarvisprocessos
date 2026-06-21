import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCompanyMaps } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/mapas/informacao")({
  component: MapaInfo,
});

function MapaInfo() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { listCompanies().then((c) => { setCompanies(c); if (c[0]) setCompanyId(c[0].id); }); }, []);
  useEffect(() => { if (companyId) getCompanyMaps({ data: { company_id: companyId } }).then((m) => setItems(m.information)); }, [companyId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mapa de Informação</h1>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Meio</TableHead>
              <TableHead>Responsável</TableHead><TableHead>Documento</TableHead><TableHead>Risco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Sem itens.</TableCell></TableRow> :
              items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.origin}</TableCell><TableCell>{i.destination}</TableCell><TableCell>{i.medium}</TableCell>
                  <TableCell>{i.responsible}</TableCell><TableCell>{i.document}</TableCell>
                  <TableCell>{i.loss_risk ? <span className="text-rose-600 text-xs font-medium">⚠ sim</span> : "—"}</TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
