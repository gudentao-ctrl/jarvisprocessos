import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { saveGoogleCalendarTokens } from "@/lib/google-calendar.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/google-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const { code, error } = Route.useSearch();
  const navigate = useNavigate();
  const saveTokensFn = useServerFn(saveGoogleCalendarTokens);

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (error) {
      setStatus("error");
      setErrorMessage(`O Google retornou um erro: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("Código de autorização não encontrado na resposta do Google.");
      return;
    }

    async function handleExchange() {
      try {
        const redirectUri = `${window.location.origin}/google-callback`;
        const res = await saveTokensFn({ data: { code: code!, redirectUri } });
        if (res?.ok) {
          setStatus("success");
          toast.success("Google Agenda conectado com sucesso!");
          setTimeout(() => {
            navigate({ to: "/perfil" });
          }, 1500);
        } else {
          setStatus("error");
          setErrorMessage("Falha ao salvar autorização do Google Agenda.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err?.message ?? "Erro desconhecido ao conectar conta Google.");
      }
    }

    handleExchange();
  }, [code, error, navigate, saveTokensFn]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {status === "processing" && (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            )}
            {status === "error" && (
              <AlertCircle className="h-7 w-7 text-destructive" />
            )}
          </div>
          <CardTitle className="mt-2 text-xl">
            {status === "processing" && "Conectando Google Agenda..."}
            {status === "success" && "Conexão Realizada!"}
            {status === "error" && "Erro na Conexão"}
          </CardTitle>
          <CardDescription>
            {status === "processing" && "Estamos autenticando sua conta com o Google Calendar."}
            {status === "success" && "Sua conta foi vinculada com sucesso. Redirecionando..."}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <div className="flex justify-center gap-2">
              <Button onClick={() => navigate({ to: "/perfil" })}>
                Voltar ao Perfil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
