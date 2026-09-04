import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListUsers,
  adminSetUserStatus,
  adminSaveMember,
  adminRemoveMember,
  adminListAudit,
  getMe,
  TOOLS,
  MEMBER_ROLES,
} from "@/lib/access.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, UserCheck, UserX, Trash2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
});

type MemberDraft = {
  user_id: string;
  company_id: string;
  member_role: (typeof MEMBER_ROLES)[number];
  permissions: Record<string, boolean>;
};

function AdminPage() {
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const listUsers = useServerFn(adminListUsers);
  const listComp = useServerFn(listCompanies);
  const setStatus = useServerFn(adminSetUserStatus);
  const saveMember = useServerFn(adminSaveMember);
  const removeMember = useServerFn(adminRemoveMember);
  const listAudit = useServerFn(adminListAudit);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const isAdmin = !!profile?.isSuperadmin;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: isAdmin,
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listComp(),
    enabled: isAdmin,
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => listAudit(),
    enabled: isAdmin,
  });

  const [draft, setDraft] = useState<MemberDraft | null>(null);

  const statusMut = useMutation({
    mutationFn: (v: { user_id: string; status: "active" | "rejected" | "pending"; request_id?: string }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Situação atualizada");
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const memberMut = useMutation({
    mutationFn: (v: MemberDraft) => saveMember({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setDraft(null);
      toast.success("Acesso salvo");
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const removeMut = useMutation({
    mutationFn: (v: { user_id: string; company_id: string }) => removeMember({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast.error(e?.message),
  });

  const membersByCompany = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of data?.members ?? []) {
      (map[m.company_id] ??= []).push(m);
    }
    return map;
  }, [data]);

  const profileName = (userId: string) => {
    const p = (data?.profiles ?? []).find((x: any) => x.user_id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  if (profile && !isAdmin) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Área exclusiva do SuperAdmin.</p>
      </Card>
    );
  }

  const pending = (data?.requests ?? []).filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <ShieldCheck className="h-5 w-5" /> SuperAdmin
        </h1>
        <p className="text-xs text-muted-foreground">Usuários, permissões por empresa e auditoria</p>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="solicitacoes">
            Solicitações{pending.length > 0 ? ` (${pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="acessos">Gestão de Acessos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-2 pt-3">
          {pending.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma solicitação pendente.
            </Card>
          )}
          {pending.map((r: any) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.full_name || r.email}</p>
                <p className="text-xs text-muted-foreground">
                  {r.email} {r.requested_company ? `· ${r.requested_company}` : ""}
                </p>
                {r.message && <p className="mt-1 text-sm">{r.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    statusMut.mutate({ user_id: r.user_id, status: "active", request_id: r.id })
                  }
                >
                  <UserCheck className="mr-1 h-4 w-4" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    statusMut.mutate({ user_id: r.user_id, status: "rejected", request_id: r.id })
                  }
                >
                  <UserX className="mr-1 h-4 w-4" /> Rejeitar
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="acessos" className="space-y-3 pt-3">
          {companies.map((c: any) => (
            <Card key={c.id} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">{c.name}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      user_id: "",
                      company_id: c.id,
                      member_role: "consultor",
                      permissions: {},
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Autorizar usuário
                </Button>
              </div>
              <div className="space-y-2">
                {(membersByCompany[c.id] ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum usuário autorizado.</p>
                )}
                {(membersByCompany[c.id] ?? []).map((m: any) => (
                  <div key={m.id} className="rounded-md border p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{profileName(m.user_id)}</p>
                        <Badge variant="secondary" className="capitalize">
                          {m.member_role}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDraft({
                              user_id: m.user_id,
                              company_id: m.company_id,
                              member_role: m.member_role,
                              permissions: m.permissions ?? {},
                            })
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            confirm("Remover acesso?") &&
                            removeMut.mutate({ user_id: m.user_id, company_id: m.company_id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {TOOLS.map((t) => (
                        <span
                          key={t.key}
                          className={
                            m.permissions?.[t.key]
                              ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                              : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          }
                        >
                          {t.label}: {m.permissions?.[t.key] ? "SIM" : "NÃO"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-2 pt-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {(data?.profiles ?? []).map((p: any) => (
            <Card key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-semibold">
                  {p.full_name || p.email}{" "}
                  {p.is_superadmin && <Badge className="ml-1">SuperAdmin</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    p.status === "active" ? "default" : p.status === "pending" ? "secondary" : "outline"
                  }
                >
                  {p.status === "active" ? "Ativo" : p.status === "pending" ? "Pendente" : "Rejeitado"}
                </Badge>
                {!p.is_superadmin && (
                  <Select
                    value={p.status}
                    onValueChange={(v) =>
                      statusMut.mutate({ user_id: p.user_id, status: v as any })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-2 pt-3">
          {audit.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">Sem registros.</Card>
          )}
          {audit.map((a: any) => (
            <Card key={a.id} className="p-3 text-sm">
              <p className="font-medium">
                {a.action} · <span className="text-muted-foreground">{a.entity}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR")} · {profileName(a.actor_id ?? "")}
              </p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões do usuário</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <Label>Usuário</Label>
                <Select
                  value={draft.user_id}
                  onValueChange={(v) => setDraft({ ...draft, user_id: v })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.profiles ?? [])
                      .filter((p: any) => !p.is_superadmin)
                      .map((p: any) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select
                  value={draft.member_role}
                  onValueChange={(v) => setDraft({ ...draft, member_role: v as any })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Ferramentas autorizadas
                </p>
                {TOOLS.map((t) => (
                  <div key={t.key} className="flex items-center justify-between">
                    <Label className="text-sm">{t.label}</Label>
                    <Switch
                      checked={!!draft.permissions[t.key]}
                      onCheckedChange={(v) =>
                        setDraft({
                          ...draft,
                          permissions: { ...draft.permissions, [t.key]: v },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                className="min-h-11 w-full"
                disabled={!draft.user_id || memberMut.isPending}
                onClick={() => memberMut.mutate(draft)}
              >
                Salvar acesso
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
