import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveCompany } from "@/lib/active-company";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalClientePage,
  head: () => ({
    meta: [
      { title: "Portal do Cliente | JARVIS Processo" },
      { name: "description", content: "Portal executivo de acompanhamento, indicadores e planos de ação para clientes." },
      { property: "og:title", content: "Portal do Cliente | JARVIS Processo" },
    ],
  }),
});

function PortalClientePage() {
  const { company, companyId, loading: companyLoading } = useActiveCompany();
  const [copied, setCopied] = useState(false);

  const { data: portalInfo, isLoading } = useQuery({
    queryKey: ["portal-cliente-info", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, public_token, public_enabled, public_title, public_company_logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const token = portalInfo?.public_token || (company as any)?.public_token;
  const fullUrl = typeof window !== "undefined" && token ? `${window.location.origin}/dashboard/${token}` : "";

  const handleCopy = async () => {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Link do portal copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNewTab = () => {
    if (fullUrl) {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (companyLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        Carregando portal do cliente…
      </div>
    );
  }

  if (!companyId || !company) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto my-12 space-y-3">
        <Globe className="size-10 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
        <p className="text-sm text-muted-foreground">
          Selecione a empresa no topo da tela para visualizar o portal do cliente.
        </p>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto my-12 space-y-3">
        <AlertCircle className="size-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-semibold">Portal ainda não configurado</h2>
        <p className="text-sm text-muted-foreground">
          O link público do portal desta empresa ainda não foi gerado pela consultoria.
        </p>
        <Badge variant="outline" className="mt-2">
          {company.name}
        </Badge>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Globe className="h-5 w-5 text-primary" /> Portal do Cliente
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhamento executivo de indicadores, planos de ação e resultados · <span className="font-semibold text-foreground">{company.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs gap-1.5"
            title="Copiar link do portal"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado!" : "Copiar link"}
          </Button>

          <Button
            size="sm"
            onClick={handleOpenNewTab}
            className="text-xs gap-1.5"
            title="Abrir portal em tela cheia numa nova aba"
          >
            <ExternalLink className="size-3.5" />
            Abrir em tela cheia
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <iframe
          src={`/dashboard/${token}`}
          title={`Portal do Cliente - ${company.name}`}
          className="w-full h-[calc(100vh-12rem)] min-h-[640px] border-0"
        />
      </div>
    </div>
  );
}
