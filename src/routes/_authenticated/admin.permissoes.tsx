import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Search, ShieldCheck, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPermissionWorkspace, saveCompanyPermissions } from "@/lib/permissions.functions";
import { ALL_PERMISSION_TOOLS, emptyPermissions, normalizePermissions, PERMISSION_ACTIONS, PERMISSION_CATALOG, permissionsPreset, setToolPermissions, type AccessRole, type PermissionMatrix } from "@/lib/permission-catalog";
import { matchesAccessSearch } from "@/lib/access-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/permissoes")({
  component: PermissionsPage,
  head: () => ({ meta: [
    { title: "Alçadas de acesso | JARVIS Processo · Hub Pessoas" },
    { name: "description", content: "Administração de permissões por ferramenta, usuário e empresa no JARVIS Processo e Hub Pessoas." },
    { property: "og:title", content: "Alçadas de acesso | JARVIS Processo · Hub Pessoas" },
    { property: "og:description", content: "Matriz de acesso multiempresa com presets e permissões individuais." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

const ROLES: AccessRole[] = ["CLIENTE", "CONSULTOR", "GESTOR", "SUPERADMIN", "AUDITOR_5S"];
const ROLE_LABELS: Record<AccessRole, string> = { CLIENTE: "Cliente", CONSULTOR: "Consultor", GESTOR: "Gestor", SUPERADMIN: "SuperAdmin", AUDITOR_5S: "Auditor 5S" };
const ACTION_LABELS = { read: "Ler", create: "Criar", update: "Editar", delete: "Excluir" };
const switchClass = "data-[state=checked]:bg-permission-active";

function PermissionsPage() {
  const qc = useQueryClient();
  const load = useServerFn(getPermissionWorkspace);
  const save = useServerFn(saveCompanyPermissions);
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["permission-workspace"], queryFn: () => load() });
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");
  const [matrix, setMatrix] = useState<PermissionMatrix>(emptyPermissions);
  const [role, setRole] = useState<AccessRole>("CONSULTOR");
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ gestao: true });
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [grantAdmin, setGrantAdmin] = useState(false);
  const selected = data?.memberships.find((item) => item.user_id === userId && item.company_id === companyId);
  const selectedUser = data?.users.find((item) => item.user_id === userId);
  useEffect(() => {
    setMatrix(normalizePermissions(selected?.permissions));
    setRole((selected?.role as AccessRole | undefined) ?? "CONSULTOR");
    setDirty(false);
    setGrantAdmin(false);
  }, [userId, companyId, selected?.updated_at]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const mutate = useMutation({
    mutationFn: () => save({ data: { user_id: userId, company_id: companyId, role, permissions: matrix, grant_superadmin: grantAdmin } }),
    onSuccess: async () => {
      setDirty(false); setGrantAdmin(false);
      await Promise.all([qc.invalidateQueries({ queryKey: ["permission-workspace"] }), qc.invalidateQueries({ queryKey: ["me"] }), qc.invalidateQueries({ queryKey: ["admin-users"] }), qc.invalidateQueries({ queryKey: ["admin-audit"] })]);
      toast.success("Acesso salvo");
    },
    onError: (failure: Error) => toast.error(failure.message),
  });
  const changeMatrix = (next: PermissionMatrix) => { setMatrix(next); setDirty(true); };
  const selectScope = (callback: () => void) => { if (!dirty || window.confirm("Descartar as alterações não salvas?")) callback(); };
  const applyPreset = (nextRole: AccessRole) => {
    if (nextRole === "SUPERADMIN") { setConfirmAdmin(true); return; }
    setRole(nextRole); setGrantAdmin(false); changeMatrix(permissionsPreset(nextRole));
  };
  const enabledCount = ALL_PERMISSION_TOOLS.filter((tool) => matrix.categories[tool.category] && matrix.sub_modules[tool.key]).length;
  if (isPending) return <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Carregando alçadas…</div>;
  if (error) return <div role="alert" className="space-y-4 py-8"><h1 className="text-xl font-semibold">Alçadas de acesso</h1><p>{error.message}</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div>;
  const ready = !!userId && !!companyId;
  return <div className="space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div><Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Administração</Link><h1 className="text-2xl font-semibold">Alçadas de acesso</h1><p className="mt-1 text-sm text-muted-foreground">JARVIS Processo / Hub Pessoas</p></div>
      <Badge variant="outline" className="gap-1"><ShieldCheck className="size-4" /> SuperAdmin</Badge>
    </header>
    <section className="grid gap-4 border-b pb-6 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="permission-user-search">Usuário</Label><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="permission-user-search" className="pl-9" placeholder="Buscar nome ou e-mail" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
        <Select value={userId} onValueChange={(value) => selectScope(() => setUserId(value))}><SelectTrigger aria-label="Selecionar usuário" className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{data?.users.filter((user) => matchesAccessSearch(`${user.full_name} ${user.email}`, userSearch)).map((user) => <SelectItem key={user.user_id} value={user.user_id}>{user.full_name || user.email} · {user.email}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="space-y-2"><Label>Empresa</Label><Select value={companyId} onValueChange={(value) => selectScope(() => setCompanyId(value))}><SelectTrigger aria-label="Selecionar empresa" className="w-full"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger><SelectContent>{data?.companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}{company.is_active ? "" : " · Inativa"}</SelectItem>)}</SelectContent></Select>
        {ready && <div className="pt-1 text-sm text-muted-foreground">{selected ? "Vínculo existente" : "Novo vínculo"} · {ROLE_LABELS[role]}</div>}
      </div>
    </section>
    {ready ? <>
      <div className="flex flex-wrap items-center gap-2">{ROLES.map((preset) => <Button key={preset} variant={role === preset ? "default" : "outline"} className={role === preset ? "bg-permission-active text-permission-active-foreground hover:bg-permission-active/90" : ""} onClick={() => applyPreset(preset)} disabled={mutate.isPending}>{role === preset && <Check className="size-4" />} Preset {ROLE_LABELS[preset]}</Button>)}</div>
      {selectedUser?.is_superadmin && <p className="text-sm text-muted-foreground">Esta conta mantém acesso global de SuperAdmin independentemente da matriz da empresa.</p>}
      {grantAdmin && <p role="alert" className="text-sm font-medium text-destructive">Ao salvar, esta conta receberá acesso global de SuperAdmin.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Ferramentas autorizadas</h2><p className="text-sm text-muted-foreground">{enabledCount} de {ALL_PERMISSION_TOOLS.length} ferramentas · {dirty ? "Alterações não salvas" : "Sem alterações pendentes"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => changeMatrix(permissionsPreset("GESTOR"))}>Liberar todas</Button><Button variant="ghost" size="sm" onClick={() => changeMatrix(emptyPermissions())}>Desmarcar todas</Button></div></div>
      <Input aria-label="Buscar ferramenta" placeholder="Buscar ferramenta" value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} />
      <div className="divide-y border-y">
        {PERMISSION_CATALOG.filter((group) => matchesAccessSearch(`${group.label} ${group.tools.map((tool) => tool.label).join(" ")}`, toolSearch)).map((group) => {
          const open = expanded[group.key] || !!toolSearch;
          const tools = group.tools.filter((tool) => !toolSearch || matchesAccessSearch(`${group.label} ${tool.label}`, toolSearch));
          const count = group.tools.filter((tool) => matrix.categories[group.key] && matrix.sub_modules[tool.key]).length;
          return <section key={group.key} className="py-3">
            <div className="flex min-h-12 items-center justify-between gap-3"><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-1 text-left" onClick={() => setExpanded({ ...expanded, [group.key]: !open })} aria-expanded={open}><ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} /><span className="min-w-0">{group.label}</span><span className="ml-auto shrink-0 text-xs text-muted-foreground">{count}/{group.tools.length}</span></Button><Switch className={switchClass} aria-label={`Categoria ${group.label}`} checked={matrix.categories[group.key] === true} onCheckedChange={(enabled) => { let next = matrix; for (const tool of group.tools) next = setToolPermissions(next, tool.key, enabled); changeMatrix(next); }} /></div>
            {open && <div className="space-y-2 pt-3">{tools.map((tool) => {
              const enabled = matrix.categories[group.key] === true && matrix.sub_modules[tool.key] === true;
              return <div key={tool.key} className="grid gap-3 rounded-md border bg-background px-3 py-3 md:grid-cols-[minmax(180px,1fr)_auto]">
                <div className="flex items-center justify-between gap-3"><Label htmlFor={`tool-${tool.key}`} className="leading-5">{tool.label}</Label><Switch id={`tool-${tool.key}`} className={switchClass} checked={enabled} onCheckedChange={(value) => changeMatrix(setToolPermissions(matrix, tool.key, value))} /></div>
                <div className="grid grid-cols-4 gap-2">{PERMISSION_ACTIONS.map((action) => <Label key={action} className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground"><span>{ACTION_LABELS[action]}</span><Switch className={switchClass} aria-label={`${ACTION_LABELS[action]} ${tool.label}`} checked={enabled && matrix.actions[tool.key]?.[action] === true} disabled={!enabled} onCheckedChange={(value) => {
                  const nextActions = { ...matrix.actions[tool.key], [action]: value };
                  if (action === "read" && !value) for (const operation of PERMISSION_ACTIONS) nextActions[operation] = false;
                  if (action !== "read" && value) nextActions.read = true;
                  changeMatrix({ ...matrix, actions: { ...matrix.actions, [tool.key]: nextActions } });
                }} /></Label>)}</div>
              </div>;
            })}</div>}
          </section>;
        })}
        {!PERMISSION_CATALOG.some((group) => matchesAccessSearch(`${group.label} ${group.tools.map((tool) => tool.label).join(" ")}`, toolSearch)) && <p className="py-6 text-sm text-muted-foreground">Nenhuma ferramenta encontrada.</p>}
      </div>
      <footer className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-background py-4 lg:bottom-0"><span className="text-sm text-muted-foreground">{enabledCount} ferramentas · {ROLE_LABELS[role]}</span><Button className="min-h-11 bg-permission-active text-permission-active-foreground hover:bg-permission-active/90" onClick={() => mutate.mutate()} disabled={!dirty || mutate.isPending}>{mutate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar acesso</Button></footer>
    </> : <p className="py-6 text-sm text-muted-foreground">Selecione um usuário e uma empresa.</p>}
    <AlertDialog open={confirmAdmin} onOpenChange={setConfirmAdmin}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Conceder acesso global de SuperAdmin?</AlertDialogTitle><AlertDialogDescription>{selectedUser?.full_name || selectedUser?.email} poderá administrar usuários e permissões e acessar todas as empresas, não apenas a selecionada.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setRole("SUPERADMIN"); setGrantAdmin(true); changeMatrix(permissionsPreset("SUPERADMIN")); }}>Confirmar concessão</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}