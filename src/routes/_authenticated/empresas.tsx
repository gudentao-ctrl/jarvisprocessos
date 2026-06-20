import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCompanies, createCompany, deleteCompany, createSector, deleteSector,
} from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Building2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCompanies);
  const addCo = useServerFn(createCompany);
  const delCo = useServerFn(deleteCompany);
  const addSec = useServerFn(createSector);
  const delSec = useServerFn(deleteSector);

  const { data } = useQuery({ queryKey: ["companies"], queryFn: () => list() });
  const [newName, setNewName] = useState("");

  const addCompany = useMutation({
    mutationFn: () => addCo({ data: { name: newName.trim() } }),
    onSuccess: () => { setNewName(""); qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Empresa criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeCompany = useMutation({
    mutationFn: (id: string) => delCo({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Empresa excluída"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addSector = useMutation({
    mutationFn: (vars: { company_id: string; name: string }) => addSec({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeSector = useMutation({
    mutationFn: (id: string) => delSec({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
        <p className="text-sm text-muted-foreground">Cadastro de empresas e setores</p>
      </div>

      <Card className="p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) addCompany.mutate(); }}
          className="flex gap-2"
        >
          <Input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nova empresa..." className="h-11"
          />
          <Button type="submit" disabled={!newName.trim() || addCompany.isPending} className="h-11">
            <Plus className="mr-1 h-4 w-4" /> Criar
          </Button>
        </form>
      </Card>

      {data?.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed py-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((c: any) => (
          <CompanyCard
            key={c.id}
            company={c}
            onDelete={() => confirm(`Excluir "${c.name}" e seus setores?`) && removeCompany.mutate(c.id)}
            onAddSector={(name) => addSector.mutate({ company_id: c.id, name })}
            onDeleteSector={(id) => removeSector.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}

function CompanyCard({
  company, onDelete, onAddSector, onDeleteSector,
}: {
  company: any; onDelete: () => void;
  onAddSector: (name: string) => void; onDeleteSector: (id: string) => void;
}) {
  const [sectorName, setSectorName] = useState("");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{company.name}</h3>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-1">
        {(company.sectors ?? []).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm">
            <span>{s.name}</span>
            <button
              onClick={() => onDeleteSector(s.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remover setor"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (sectorName.trim()) { onAddSector(sectorName.trim()); setSectorName(""); }
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={sectorName} onChange={(e) => setSectorName(e.target.value)}
          placeholder="Adicionar setor..." className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!sectorName.trim()} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Card>
  );
}
