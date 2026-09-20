import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMe } from "@/lib/access.functions";
import {
  getGoogleCalendarStatus,
  getGoogleAuthUrl,
  disconnectGoogleCalendar,
} from "@/lib/google-calendar.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Mail, Shield, Building, Calendar, CheckCircle2, AlertCircle, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const qc = useQueryClient();
  const getMeFn = useServerFn(getMe);
  const getStatusFn = useServerFn(getGoogleCalendarStatus);
  const getAuthUrlFn = useServerFn(getGoogleAuthUrl);
  const disconnectFn = useServerFn(disconnectGoogleCalendar);

  const [connecting, setConnecting] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });

  const { data: googleStatus, isLoading: loadingGoogle } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => getStatusFn(),
  });

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

  async function handleConnectGoogle() {
    try {
      setConnecting(true);
      const redirectUri = `${window.location.origin}/google-callback`;
      const res = await getAuthUrlFn({ data: { redirectUri } });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Não foi possível gerar a URL de autorização do Google.");
      }
    } catch (e: any) {
      toast.error(
        e?.message?.includes("GOOGLE_CLIENT_ID")
          ? "Credenciais do Google não configuradas no servidor (GOOGLE_CLIENT_ID)."
          : e?.message ?? "Erro ao iniciar conexão com Google.",
      );
    } finally {
      setConnecting(false);
    }
  }

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
              <CardDescription>Suas informações de acesso na plataforma</CardDescription>
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
              <span className="text-xs text-muted-foreground">E-mail</span>
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {profile?.email || "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-medium text-muted-foreground">Permissões de Acesso:</span>
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Agenda</CardTitle>
              <CardDescription>
                Conecte sua conta do Google para sincronizar reuniões e enviar convites oficiais
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
              </div>

              <div>
                {googleStatus?.connected ? (
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => disconnectMut.mutate()}
                    disabled={disconnectMut.isPending}
                  >
                    <LogOut className="mr-1.5 h-4 w-4" />
                    {disconnectMut.isPending ? "Desconectando..." : "Desconectar"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={connecting || loadingGoogle}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Calendar className="mr-1.5 h-4 w-4" />
                    {connecting ? "Redirecionando..." : "Conectar Google Agenda"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">💡 Como funciona a integração?</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Ao criar um evento na Agenda com convidados por e-mail, ele é gerado na sua conta Google.</li>
              <li>Os participantes recebem convites oficiais por e-mail com data, horário e local.</li>
              <li>Você pode desconectar sua conta a qualquer momento nesta página.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
