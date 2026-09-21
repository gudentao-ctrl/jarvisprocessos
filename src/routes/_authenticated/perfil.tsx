import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMe } from "@/lib/access.functions";
import {
  getGoogleCalendarStatus,
  getGoogleAuthUrl,
  disconnectGoogleCalendar,
  getGoogleOAuthConfig,
  saveGoogleOAuthConfig,
} from "@/lib/google-calendar.functions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  Key,
  Copy,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function isGmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith("@gmail.com") || lower.endsWith("@googlemail.com");
}

function PerfilPage() {
  const qc = useQueryClient();
  const getMeFn = useServerFn(getMe);
  const getStatusFn = useServerFn(getGoogleCalendarStatus);
  const getAuthUrlFn = useServerFn(getGoogleAuthUrl);
  const disconnectFn = useServerFn(disconnectGoogleCalendar);
  const getOAuthConfigFn = useServerFn(getGoogleOAuthConfig);
  const saveOAuthConfigFn = useServerFn(saveGoogleOAuthConfig);

  const [connecting, setConnecting] = useState(false);

  // Modal para requisitar e-mail Google (quando o cadastrado não for Gmail)
  const [googleEmailModalOpen, setGoogleEmailModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  // Modal para configuração de Credenciais Google (Client ID / Secret)
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configClientId, setConfigClientId] = useState("");
  const [configClientSecret, setConfigClientSecret] = useState("");

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });

  const { data: googleStatus, isLoading: loadingGoogle } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => getStatusFn(),
  });

  const { data: oauthConfig } = useQuery({
    queryKey: ["google-oauth-config"],
    queryFn: () => getOAuthConfigFn(),
  });

  const isManagerOrAdmin = Boolean(
    profile?.isSuperadmin ||
      (profile?.memberships ?? []).some(
        (m: any) => m.role === "gestor" || m.member_role === "gestor",
      ),
  );

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      toast.success("Google Agenda desconectado com sucesso.");
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao desconectar Google Agenda.");
    },
  });

  const saveOAuthConfigMut = useMutation({
    mutationFn: (payload: { clientId: string; clientSecret: string }) =>
      saveOAuthConfigFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-oauth-config"] });
      setConfigModalOpen(false);
      toast.success("Credenciais do Google Cloud salvas com sucesso!");
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao salvar credenciais do Google.");
    },
  });

  async function initiateGoogleConnect(targetEmail?: string | null) {
    try {
      setConnecting(true);
      const redirectUri = `${window.location.origin}/google-callback`;
      const res = await getAuthUrlFn({
        data: {
          redirectUri,
          googleEmail: targetEmail ? targetEmail.trim() : undefined,
        },
      });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Não foi possível gerar a URL de autorização do Google.");
      }
    } catch (e: any) {
      if (
        e?.message?.includes("GOOGLE_CLIENT_ID") ||
        e?.message?.includes("Credenciais do Google")
      ) {
        if (isManagerOrAdmin) {
          setConfigClientId(oauthConfig?.rawClientId || "");
          setConfigClientSecret("");
          setConfigModalOpen(true);
          toast.error(
            "Credenciais do Google não configuradas. Insira o Client ID e Secret abaixo.",
          );
        } else {
          toast.error(
            "Credenciais do Google não configuradas no servidor. Solicite ao administrador do sistema.",
          );
        }
      } else {
        toast.error(e?.message ?? "Erro ao iniciar conexão com Google.");
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleConnectClick() {
    // 1. Se credenciais não estiverem configuradas e for gestor/admin, abre o modal de config
    if (oauthConfig && !oauthConfig.configured) {
      if (isManagerOrAdmin) {
        setConfigClientId(oauthConfig.rawClientId || "");
        setConfigClientSecret("");
        setConfigModalOpen(true);
        toast.info(
          "Configure as credenciais do Google Cloud para prosseguir com a integração.",
        );
        return;
      } else {
        toast.error(
          "Credenciais do Google não configuradas no servidor. Solicite ao administrador do sistema.",
        );
        return;
      }
    }

    // 2. Se o e-mail cadastrado NÃO for Gmail, requisitar o e-mail Google
    if (!isGmail(profile?.email)) {
      setGoogleEmailInput("");
      setGoogleEmailModalOpen(true);
      return;
    }

    // 3. Se for Gmail, conecta diretamente
    initiateGoogleConnect(profile?.email);
  }

  const redirectUriStr =
    typeof window !== "undefined"
      ? `${window.location.origin}/google-callback`
      : "/google-callback";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Meu Perfil</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Informações da sua conta e integrações externas
        </p>
      </div>

      {/* Dados do Usuário */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
              <CardDescription>
                Suas informações de acesso na plataforma
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <span className="text-xs text-muted-foreground">Nome Completo</span>
              <p className="font-medium text-foreground">
                {profile?.fullName || "Não informado"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <span className="text-xs text-muted-foreground">E-mail Cadastrado</span>
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {profile?.email || "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-medium text-muted-foreground">
              Permissões de Acesso:
            </span>
            {profile?.isSuperadmin ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> Superadmin
              </Badge>
            ) : (
              <Badge variant="secondary">Consultor</Badge>
            )}
            {profile?.status && (
              <Badge variant="outline" className="capitalize">
                Status: {profile.status}
              </Badge>
            )}
          </div>

          {/* Empresas Vinculadas */}
          {profile?.memberships && profile.memberships.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-medium text-muted-foreground">
                Vínculos com Empresas:
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {profile.memberships.map((m: any) => (
                  <div
                    key={m.companyId}
                    className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{m.companyName}</span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {m.role || "Membro"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integração Google Agenda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Agenda</CardTitle>
                <CardDescription>
                  Sincronização direta e envio automático de compromissos com convidados
                </CardDescription>
              </div>
            </div>

            {isManagerOrAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setConfigClientId(oauthConfig?.rawClientId || "");
                  setConfigClientSecret("");
                  setConfigModalOpen(true);
                }}
              >
                <Settings className="h-3.5 w-3.5" />
                Configuração de API (Opcional)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-sm text-blue-900 dark:text-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Sincronização com Google Agenda Ativa (100% Gratuita e Sem API Complexa)
            </div>
            <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
              Ao criar ou gerenciar reuniões na aba <strong>Agenda</strong>, o sistema identifica automaticamente data, horário, pauta, local e a lista de convidados para adicionar à sua conta Google e disparar os convites com 1 clique, sem precisar de configurações no Google Cloud.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Status da Conexão:</span>
                  {googleStatus?.connected ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" /> Não Conectado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {googleStatus?.connected
                    ? `Conectado como: ${googleStatus.email || "Conta Google"}. Seus eventos criados na agenda podem ser sincronizados diretamente.`
                    : "Conecte sua conta Google para que os compromissos criados na agenda enviem convites oficiais para os convidados."}
                </p>
                {googleStatus?.connected &&
                  googleStatus.email &&
                  profile?.email &&
                  googleStatus.email.toLowerCase() !== profile.email.toLowerCase() && (
                    <p className="text-[11px] text-muted-foreground">
                      💡 E-mail de login no Jarvis: <span className="font-semibold text-foreground">{profile.email}</span> · Conta vinculada no Google: <span className="font-semibold text-foreground">{googleStatus.email}</span>
                    </p>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {googleStatus?.connected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGoogleEmailInput(googleStatus.email || "");
                        setGoogleEmailModalOpen(true);
                      }}
                      disabled={connecting}
                    >
                      Trocar Conta Google
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => disconnectMut.mutate()}
                      disabled={disconnectMut.isPending}
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      {disconnectMut.isPending ? "Desconectando..." : "Desconectar"}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Button
                      onClick={handleConnectClick}
                      disabled={connecting || loadingGoogle}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Calendar className="mr-1.5 h-4 w-4" />
                      {connecting ? "Redirecionando..." : "Conectar Google Agenda"}
                    </Button>
                    {isGmail(profile?.email) && (
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleEmailInput("");
                          setGoogleEmailModalOpen(true);
                        }}
                        className="text-[11px] text-muted-foreground underline hover:text-foreground text-center"
                      >
                        Usar outro e-mail Google
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">💡 Como funciona a integração?</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Ao criar um evento na Agenda com convidados por e-mail, ele é gerado na sua conta Google.</li>
              <li>Os participantes recebem convites oficiais por e-mail com data, horário e local.</li>
              <li>Se o seu e-mail cadastrado não for Gmail, você pode vincular sua conta Google desejada a qualquer momento.</li>
              <li>Você pode desconectar sua conta a qualquer momento nesta página.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ─── Modal: Solicitação de E-mail Google (quando não for Gmail) ─── */}
      <Dialog
        open={googleEmailModalOpen}
        onOpenChange={(v) => {
          if (!connecting) setGoogleEmailModalOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Vincular Conta Google Agenda
            </DialogTitle>
            <DialogDescription>
              {profile?.email && !isGmail(profile.email) ? (
                <>
                  Seu e-mail cadastrado (<strong className="text-foreground">{profile.email}</strong>) não é uma conta <span className="font-mono text-xs">@gmail.com</span>.
                  Informe abaixo o e-mail da sua conta Google que você deseja utilizar para sincronizar sua agenda:
                </>
              ) : (
                <>
                  Informe o e-mail da conta Google que você deseja utilizar para sincronizar seus compromissos:
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="google-email" className="text-xs font-semibold">
                E-mail da sua Conta Google (Gmail ou Google Workspace) *
              </Label>
              <Input
                id="google-email"
                type="email"
                autoFocus
                placeholder="exemplo@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && googleEmailInput.trim()) {
                    e.preventDefault();
                    setGoogleEmailModalOpen(false);
                    initiateGoogleConnect(googleEmailInput.trim());
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Você será redirecionado para a tela oficial do Google para autorizar o acesso à agenda.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={connecting}
              onClick={() => setGoogleEmailModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={connecting || !googleEmailInput.trim() || !googleEmailInput.includes("@")}
              onClick={() => {
                setGoogleEmailModalOpen(false);
                initiateGoogleConnect(googleEmailInput.trim());
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              {connecting ? "Redirecionando..." : "Continuar para o Google"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Configuração de Credenciais Google (Client ID / Secret) ─── */}
      <Dialog
        open={configModalOpen}
        onOpenChange={(v) => {
          if (!saveOAuthConfigMut.isPending) setConfigModalOpen(v);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Configurar Credenciais do Google Cloud
            </DialogTitle>
            <DialogDescription>
              Cadastre o Client ID e Client Secret do aplicativo OAuth para habilitar a conexão com o Google Agenda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Passo a passo rápido */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="font-semibold text-foreground flex items-center justify-between">
                <span>Passo a passo no Google Cloud Console:</span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-normal text-[11px]"
                >
                  Abrir Console <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-[11px]">
                <li>Acesse o projeto no Google Cloud e certifique-se de que a <strong>Google Calendar API</strong> está ativada.</li>
                <li>Vá em <strong>APIs e Serviços &gt; Credenciais &gt; Criar Credenciais &gt; ID do cliente OAuth</strong>.</li>
                <li>Selecione Tipo de aplicativo: <strong>Aplicativo da Web</strong>.</li>
                <li>Em <strong>URIs de redirecionamento autorizados</strong>, adicione exatamente:</li>
              </ol>
              <div className="flex items-center justify-between gap-2 rounded bg-background p-2 border font-mono text-[11px]">
                <span className="truncate">{redirectUriStr}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 shrink-0 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(redirectUriStr);
                    toast.success("URI de redirecionamento copiada!");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-id" className="text-xs font-semibold">
                Google Client ID *
              </Label>
              <Input
                id="client-id"
                placeholder="Ex.: 123456789-abcdef.apps.googleusercontent.com"
                value={configClientId}
                onChange={(e) => setConfigClientId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-secret" className="text-xs font-semibold">
                Google Client Secret *
              </Label>
              <Input
                id="client-secret"
                type="password"
                placeholder="Ex.: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={configClientSecret}
                onChange={(e) => setConfigClientSecret(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                As credenciais são salvas de forma segura no servidor e utilizadas para emitir os tokens da agenda.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={saveOAuthConfigMut.isPending}
              onClick={() => setConfigModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                saveOAuthConfigMut.isPending ||
                !configClientId.trim() ||
                !configClientSecret.trim()
              }
              onClick={() =>
                saveOAuthConfigMut.mutate({
                  clientId: configClientId.trim(),
                  clientSecret: configClientSecret.trim(),
                })
              }
            >
              {saveOAuthConfigMut.isPending ? "Salvando..." : "Salvar Credenciais"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
