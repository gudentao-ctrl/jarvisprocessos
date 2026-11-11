import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMe } from "@/lib/access.functions";
import { supabase } from "@/integrations/supabase/client";
import { GoogleAgendaFeedCard } from "@/components/GoogleAgendaFeedCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const getMeFn = useServerFn(getMe);
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });

  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      toast.success("Você saiu da sua conta com sucesso.");
      router.navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sair da conta");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Meu Perfil</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Informações da sua conta e integrações externas
          </p>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="gap-2 shadow-sm font-semibold"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? "Saindo…" : "Deslogar do Perfil"}
        </Button>
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
              <p className="font-medium text-foreground">{profile?.fullName || "Não informado"}</p>
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
                    key={m.company_id}
                    className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{m.company_name ?? "Empresa"}</span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {m.member_role || "Membro"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <GoogleAgendaFeedCard />

      {/* Sessão e Deslogar */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sessão e Desconexão
              </CardTitle>
              <CardDescription>
                Encerre sua sessão com segurança neste dispositivo para desconectar seu usuário.
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="gap-2 shrink-0 font-medium"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {loggingOut ? "Desconectando…" : "Deslogar da Conta"}
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
