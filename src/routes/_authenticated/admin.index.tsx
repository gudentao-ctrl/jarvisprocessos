import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListUsers,
  adminSetUserStatus,
  adminListAudit,
  getMe,
  adminUpdateUser,
  adminCreateUser,
  adminSendPasswordReset,
  adminDeleteUser,
} from "@/lib/access.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  ShieldAlert,
  Pencil,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  adminListTickets,
  adminUpdateTicket,
  TICKET_STATUS,
  ticketKindLabel,
  ticketPriorityLabel,
} from "@/lib/tickets.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "SuperAdmin | Jarvis Processos" },
      {
        name: "description",
        content: "Administração de usuários, acessos e chamados do Jarvis Processos.",
      },
      { property: "og:title", content: "SuperAdmin | Jarvis Processos" },
      {
        property: "og:description",
        content: "Administração de usuários, acessos e chamados do Jarvis Processos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type UserDraft = {
  user_id?: string;
  full_name: string;
  cpf: string;
  birth_date: string;
  whatsapp: string;
  email: string;
  password: string;
};

const emptyUserDraft: UserDraft = {
  full_name: "",
  cpf: "",
  birth_date: "",
  whatsapp: "",
  email: "",
  password: "",
};

function AdminPage() {
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const listUsers = useServerFn(adminListUsers);
  const setStatus = useServerFn(adminSetUserStatus);
  const listAudit = useServerFn(adminListAudit);
  const updateUser = useServerFn(adminUpdateUser);
  const createUser = useServerFn(adminCreateUser);
  const sendPasswordReset = useServerFn(adminSendPasswordReset);
  const deleteUser = useServerFn(adminDeleteUser);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const isAdmin = !!profile?.isSuperadmin;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: isAdmin,
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => listAudit(),
    enabled: isAdmin,
  });

  const listTickets = useServerFn(adminListTickets);
  const updateTicket = useServerFn(adminUpdateTicket);
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => listTickets(),
    enabled: isAdmin,
  });
  const [replies, setReplies] = useState<Record<string, string>>({});
  const ticketMut = useMutation({
    mutationFn: (v: { id: string; status?: any; response?: string }) => updateTicket({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Chamado atualizado");
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const [userDraft, setUserDraft] = useState<UserDraft | null>(null);

  const statusMut = useMutation({
    mutationFn: (v: {
      user_id: string;
      status: "active" | "rejected" | "pending";
      request_id?: string;
    }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Situação atualizada");
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const userMut = useMutation({
    mutationFn: (value: UserDraft) =>
      value.user_id
        ? updateUser({
            data: {
              user_id: value.user_id,
              full_name: value.full_name,
              cpf: value.cpf,
              birth_date: value.birth_date,
              whatsapp: value.whatsapp,
              email: value.email,
            },
          })
        : createUser({
            data: {
              full_name: value.full_name,
              cpf: value.cpf,
              birth_date: value.birth_date,
              whatsapp: value.whatsapp,
              email: value.email,
              password: value.password,
            },
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setUserDraft(null);
      toast.success("Usuário salvo");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar o usuário"),
  });
  const resetMut = useMutation({
    mutationFn: (value: { user_id: string; email: string }) =>
      sendPasswordReset({
        data: {
          ...value,
          redirect_to: `${window.location.origin}/auth`,
        },
      }),
    onSuccess: () => toast.success("E-mail de recuperação enviado"),
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar a recuperação"),
  });
  const deleteUserMut = useMutation({
    mutationFn: (user_id: string) => deleteUser({ data: { user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir o usuário"),
  });

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

  const requestsPending = (data?.requests ?? []).filter((r: any) => r.status === "pending");
  const requestedUserIds = new Set(requestsPending.map((r: any) => r.user_id));
  const pendingProfiles = (data?.profiles ?? [])
    .filter(
      (p: any) => p.status === "pending" && !p.is_superadmin && !requestedUserIds.has(p.user_id),
    )
    .map((p: any) => ({
      id: `profile-${p.user_id}`,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      requested_company: "",
      message: "Cadastro criado na tela de login, aguardando liberação.",
    }));
  const pending = [...requestsPending, ...pendingProfiles];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <ShieldCheck className="h-5 w-5" /> SuperAdmin
        </h1>
        <p className="text-xs text-muted-foreground">
          Usuários, permissões por empresa e auditoria
        </p>
        <Button variant="outline" className="mt-3" asChild><Link to="/admin/permissoes"><ShieldCheck className="size-4" /> Gestão de acessos</Link></Button>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="solicitacoes">
            Solicitações{pending.length > 0 ? ` (${pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="chamados">
            Chamados
            {tickets.filter((t: any) => t.status === "aberto").length > 0
              ? ` (${tickets.filter((t: any) => t.status === "aberto").length})`
              : ""}
          </TabsTrigger>
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
                    statusMut.mutate({
                      user_id: r.user_id,
                      status: "active",
                      ...(String(r.id).startsWith("profile-") ? {} : { request_id: r.id }),
                    })
                  }
                >
                  <UserCheck className="mr-1 h-4 w-4" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    statusMut.mutate({
                      user_id: r.user_id,
                      status: "rejected",
                      ...(String(r.id).startsWith("profile-") ? {} : { request_id: r.id }),
                    })
                  }
                >
                  <UserX className="mr-1 h-4 w-4" /> Rejeitar
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="chamados" className="space-y-2 pt-3">
          {tickets.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum chamado registrado.
            </Card>
          )}
          {tickets.map((t: any) => (
            <Card key={t.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-semibold">{t.title}</p>
                <Badge variant="outline" className="text-[10px]">
                  {ticketKindLabel(t.kind)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {ticketPriorityLabel(t.priority)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.author_name} · {new Date(t.created_at).toLocaleDateString("pt-BR")}
              </p>
              {t.description && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={t.status}
                  onValueChange={(v) => ticketMut.mutate({ id: t.id, status: v })}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                rows={2}
                placeholder="Resposta ao usuário"
                value={replies[t.id] ?? t.response ?? ""}
                onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  ticketMut.mutate({ id: t.id, response: replies[t.id] ?? t.response ?? "" })
                }
              >
                Salvar resposta
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-2 pt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setUserDraft({ ...emptyUserDraft })}>
              <UserPlus className="mr-1 h-4 w-4" /> Novo usuário
            </Button>
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {(data?.profiles ?? []).map((p: any) => (
            <Card key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-semibold">
                  {p.full_name || p.email}{" "}
                  {p.is_superadmin && <Badge className="ml-1">SuperAdmin</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
                <p className="text-xs text-muted-foreground">
                  CPF: {p.cpf || "não informado"} · Nascimento:{" "}
                  {p.birth_date
                    ? new Date(`${p.birth_date}T12:00:00`).toLocaleDateString("pt-BR")
                    : "não informado"}{" "}
                  · WhatsApp: {p.whatsapp || "não informado"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    p.status === "active"
                      ? "default"
                      : p.status === "pending"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {p.status === "active"
                    ? "Ativo"
                    : p.status === "pending"
                      ? "Pendente"
                      : "Rejeitado"}
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
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation active:scale-95 shrink-0"
                  aria-label="Editar usuário"
                  title="Editar usuário"
                  onClick={() =>
                    setUserDraft({
                      user_id: p.user_id,
                      full_name: p.full_name ?? "",
                      cpf: p.cpf ?? "",
                      birth_date: p.birth_date ?? "",
                      whatsapp: p.whatsapp ?? "",
                      email: p.email ?? "",
                      password: "",
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!p.is_superadmin && p.email && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation active:scale-95 shrink-0"
                    aria-label="Enviar recuperação de senha"
                    title="Enviar recuperação de senha"
                    disabled={resetMut.isPending}
                    onClick={() => resetMut.mutate({ user_id: p.user_id, email: p.email })}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                )}
                {!p.is_superadmin && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation active:scale-95 text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label="Excluir usuário"
                    title="Excluir usuário"
                    disabled={deleteUserMut.isPending}
                    onClick={() =>
                      confirm(`Excluir definitivamente ${p.full_name || p.email}?`) &&
                      deleteUserMut.mutate(p.user_id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      <Dialog open={!!userDraft} onOpenChange={(open) => !open && setUserDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{userDraft?.user_id ? "Editar usuário" : "Cadastrar usuário"}</DialogTitle>
          </DialogHeader>
          {userDraft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome completo</Label>
                <Input
                  value={userDraft.full_name}
                  onChange={(e) => setUserDraft({ ...userDraft, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  inputMode="numeric"
                  value={userDraft.cpf}
                  onChange={(e) => setUserDraft({ ...userDraft, cpf: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input
                  type="date"
                  value={userDraft.birth_date}
                  onChange={(e) => setUserDraft({ ...userDraft, birth_date: e.target.value })}
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  inputMode="tel"
                  value={userDraft.whatsapp}
                  onChange={(e) => setUserDraft({ ...userDraft, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={userDraft.email}
                  onChange={(e) => setUserDraft({ ...userDraft, email: e.target.value })}
                />
              </div>
              {!userDraft.user_id && (
                <div className="sm:col-span-2">
                  <Label>Senha temporária</Label>
                  <Input
                    type="password"
                    minLength={8}
                    value={userDraft.password}
                    onChange={(e) => setUserDraft({ ...userDraft, password: e.target.value })}
                  />
                </div>
              )}
              <Button
                className="min-h-11 sm:col-span-2"
                disabled={
                  userMut.isPending ||
                  !userDraft.full_name ||
                  !userDraft.cpf ||
                  !userDraft.birth_date ||
                  !userDraft.whatsapp ||
                  !userDraft.email ||
                  (!userDraft.user_id && userDraft.password.length < 8)
                }
                onClick={() => userMut.mutate(userDraft)}
              >
                {userMut.isPending ? "Salvando…" : "Salvar usuário"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
