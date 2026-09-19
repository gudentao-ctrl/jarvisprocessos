import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCompanies, createCompany, updateCompany, deleteCompany,
  createSector, updateSector, deleteSector, setCompanyActive,
} from "@/lib/interviews.functions";
import { getMe } from "@/lib/access.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Building2, Plus, Trash2, X, Radar, Check, Globe, Power, PowerOff, Pencil, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PortalPublicoDialog } from "@/components/company/PortalPublicoDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { companyId, setCompanyId } = useActiveCompany();
  const list = useServerFn(listCompanies);
  const addCo = useServerFn(createCompany);
  const updCo = useServerFn(updateCompany);
  const delCo = useServerFn(deleteCompany);
  const addSec = useServerFn(createSector);
  const updSec = useServerFn(updateSector);
  const delSec = useServerFn(deleteSector);
  const setActive = useServerFn(setCompanyActive);
  const meFn = useServerFn(getMe);
  const [showInactive, setShowInactive] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const isSuperadmin = !!me?.isSuperadmin;

  const { data } = useQuery({ queryKey: ["companies"], queryFn: () => list() });
  const [newName, setNewName] = useState("");

  const addCompany = useMutation({
    mutationFn: () => addCo({ data: { name: newName.trim() } }),
    onSuccess: () => { setNewName(""); qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Empresa criada"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar empresa"),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (vars: { id: string; name: string }) => updCo({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Nome da empresa atualizado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar empresa"),
  });

  const removeCompany = useMutation({
    mutationFn: (id: string) => delCo({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Empresa excluída"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const addSector = useMutation({
    mutationFn: (vars: { company_id: string; name: string }) => addSec({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Setor adicionado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar setor"),
  });

  const updateSectorMutation = useMutation({
    mutationFn: (vars: { id: string; name: string }) => updSec({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Setor atualizado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar setor"),
  });

  const toggleActive = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => setActive({ data: vars }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(v.is_active ? "Empresa reativada" : "Empresa marcada como inativa");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const removeSector = useMutation({
    mutationFn: (id: string) => delSec({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Setor excluído"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir setor"),
  });

  function openCompany(id: string) {
    setCompanyId(id);
    navigate({ to: "/controle" });
  }

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

      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        <Label htmlFor="show-inactive" className="text-sm">
          Mostrar empresas inativas
        </Label>
        <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
      </div>

      <div className="space-y-3">
        {data?.filter((c: any) => showInactive || c.is_active !== false).map((c: any) => (
          <CompanyCard
            key={c.id}
            company={c}
            active={c.id === companyId}
            isSuperadmin={isSuperadmin}
            onOpen={() => openCompany(c.id)}
            onDelete={() => confirm(`Excluir "${c.name}" e seus setores?`) && removeCompany.mutate(c.id)}
            onUpdateCompany={(name) => updateCompanyMutation.mutateAsync({ id: c.id, name })}
            onAddSector={(name) => addSector.mutate({ company_id: c.id, name })}
            onUpdateSector={(id, name) => updateSectorMutation.mutateAsync({ id, name })}
            onDeleteSector={(id) => removeSector.mutate(id)}
            onToggleActive={() =>
              toggleActive.mutate({ id: c.id, is_active: c.is_active === false })
            }
          />
        ))}
      </div>
    </div>
  );
}

function CompanyCard({
  company, active, isSuperadmin, onOpen, onDelete, onUpdateCompany, onAddSector, onUpdateSector, onDeleteSector, onToggleActive,
}: {
  company: any; active: boolean; isSuperadmin: boolean; onOpen: () => void; onDelete: () => void;
  onUpdateCompany: (name: string) => Promise<any>;
  onAddSector: (name: string) => void;
  onUpdateSector: (id: string, name: string) => Promise<any>;
  onDeleteSector: (id: string) => void;
  onToggleActive: () => void;
}) {
  const inactive = company.is_active === false;
  const [sectorName, setSectorName] = useState("");
  const [portalOpen, setPortalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState(company.name);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorEditName, setSectorEditName] = useState("");

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    try {
      await onUpdateCompany(companyName.trim());
      setEditingCompany(false);
    } catch {
      // toast is handled in mutation
    }
  };

  const handleSaveSector = async (e: React.FormEvent, sectorId: string) => {
    e.preventDefault();
    if (!sectorEditName.trim()) return;
    try {
      await onUpdateSector(sectorId, sectorEditName.trim());
      setEditingSectorId(null);
    } catch {
      // toast is handled in mutation
    }
  };

  return (
    <Card className={`${active ? "p-4 ring-2 ring-primary" : "p-4"} ${inactive ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        {editingCompany ? (
          <form onSubmit={handleSaveCompany} className="flex min-w-0 flex-1 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-8 flex-1 text-sm font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCompanyName(company.name);
                  setEditingCompany(false);
                }
              }}
            />
            <Button size="icon" variant="ghost" type="submit" className="h-8 w-8 text-primary" title="Salvar">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => {
                setCompanyName(company.name);
                setEditingCompany(false);
              }}
              className="h-8 w-8 text-muted-foreground"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left truncate">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="truncate font-semibold hover:underline" title={company.name}>{company.name}</h3>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              {inactive && <Badge variant="secondary" className="shrink-0">Inativa</Badge>}
              {company.public_enabled && (
                <span title="Portal público ativo">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                </span>
              )}
            </button>
            {isSuperadmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompanyName(company.name);
                  setEditingCompany(true);
                }}
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                title="Editar nome da empresa"
                aria-label="Editar nome da empresa"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => setPortalOpen(true)} className="h-8 gap-1">
          <Globe className="h-3.5 w-3.5" /> Portal
        </Button>
        <Button size="sm" variant="outline" onClick={onOpen} className="h-8 gap-1">
          <Radar className="h-3.5 w-3.5" /> Abrir
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleActive}
          className="h-8 gap-1"
          title={inactive ? "Reativar empresa" : "Tornar inativa"}
        >
          {inactive ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
          {inactive ? "Reativar" : "Inativar"}
        </Button>
        {isSuperadmin && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir empresa">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="gap-1 font-medium">
          <Clock className="h-3 w-3" />
          Horas do Mês: {Number(company.month_hours ?? company.total_hours ?? 0).toFixed(2).replace(".", ",")}h
        </Badge>
        {company.start_date && <span>Início {company.start_date.split("-").reverse().join("/")}</span>}
        {company.end_date && <span>Término {company.end_date.split("-").reverse().join("/")}</span>}
      </div>
      <PortalPublicoDialog
        companyId={company.id}
        companyName={company.name}
        open={portalOpen}
        onOpenChange={setPortalOpen}
      />

      <div className="mt-3 space-y-1">
        {(company.sectors ?? []).map((s: any) => {
          const isEditingThis = editingSectorId === s.id;
          if (isEditingThis) {
            return (
              <form
                key={s.id}
                onSubmit={(e) => handleSaveSector(e, s.id)}
                className="flex items-center gap-1.5 rounded-md bg-secondary p-1"
              >
                <Input
                  value={sectorEditName}
                  onChange={(e) => setSectorEditName(e.target.value)}
                  className="h-7 flex-1 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingSectorId(null);
                  }}
                />
                <Button size="icon" variant="ghost" type="submit" className="h-7 w-7 text-primary" title="Salvar setor">
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={() => setEditingSectorId(null)}
                  className="h-7 w-7 text-muted-foreground"
                  title="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            );
          }

          return (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm">
              <span className="truncate">{s.name}</span>
              {isSuperadmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingSectorId(s.id);
                      setSectorEditName(s.name);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Editar setor"
                    aria-label="Editar setor"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirm(`Excluir setor "${s.name}"?`) && onDeleteSector(s.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="Remover setor"
                    aria-label="Remover setor"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isSuperadmin && (
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
      )}
    </Card>
  );
}
