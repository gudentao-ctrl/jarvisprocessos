// src/routes/p.5s.$hash.tsx
// Rota Pública Oficial 100% Deslogada para o Portal do Colaborador 5S (/p/5s/:hash)

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getFivesPortalDataByHash } from "@/lib/fives-storage";
import type { FivesPortalData } from "@/lib/fives-types";
import { PortalColaboradorView } from "@/components/fives/PortalColaboradorView";

export const Route = createFileRoute("/p/5s/$hash")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal do Colaborador 5S | Jarvis Processos" },
      {
        name: "description",
        content: "Acompanhe o Padrão Ouro, ranking de setores e ITs de limpeza do Programa 5S.",
      },
    ],
  }),
  component: PublicFivesRouteComponent,
});

function PublicFivesRouteComponent() {
  const { hash } = Route.useParams();
  const search: Record<string, string | undefined> = Route.useSearch();
  const setorFilter = search?.setor as string | undefined;

  const [portalData, setPortalData] = useState<FivesPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFivesPortalDataByHash(hash);
        if (!active) return;
        if (!data) {
          setError("Portal 5S não encontrado ou link expirado.");
        } else {
          setPortalData(data);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Erro ao carregar dados do Portal 5S.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          Carregando Portal do Colaborador 5S...
        </p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Acesso ao Portal 5S</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {error || "Não foi possível carregar os dados deste programa 5S."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 max-w-7xl mx-auto">
      <PortalColaboradorView
        portalData={portalData}
        isPublic={true}
        selectedSectorIdFilter={setorFilter}
      />
    </div>
  );
}