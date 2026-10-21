// src/routes/p.5s.$hash.tsx
// Rota Pública Oficial 100% Deslogada para o Portal do Colaborador 5S (/p/5s/:hash)
// Com Realtime Supabase: Atualiza automaticamente ao salvar auditorias/configurações

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { getFivesPortalDataByHash, subscribeFivesRealtime } from "@/lib/fives-storage";
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const companyIdRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        if (isFirstLoad.current) setLoading(true);
        else setRefreshing(true);
      }
      setError(null);
      const data = await getFivesPortalDataByHash(hash);
      if (!data) {
        setError("Portal 5S não encontrado ou link expirado.");
      } else {
        setPortalData(data);
        companyIdRef.current = data.company.id;
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar dados do Portal 5S.");
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
      setRefreshing(false);
    }
  }, [hash]);

  // Carregamento inicial
  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  // Realtime: Subscrição Supabase assim que o companyId estiver disponível
  useEffect(() => {
    if (!companyIdRef.current) return;

    let unsubscribe: (() => void) | null = null;

    // Aguarda 300ms para garantir que o companyId foi preenchido
    const timer = setTimeout(() => {
      if (!companyIdRef.current) return;
      try {
        unsubscribe = subscribeFivesRealtime(companyIdRef.current, () => {
          setConnected(true);
          void loadData(true); // Recarregar silenciosamente sem loading spinner
        });
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }, 300);

    // Escuta também eventos locais cross-tab (quando o painel interno salva)
    const handleLocalUpdate = (e: Event) => {
      const ev = e as CustomEvent;
      if (!ev.detail?.companyId || ev.detail.companyId === companyIdRef.current) {
        void loadData(true);
      }
    };
    window.addEventListener("jarvis_5s_data_updated", handleLocalUpdate);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
      window.removeEventListener("jarvis_5s_data_updated", handleLocalUpdate);
    };
  }, [portalData?.company.id, loadData]);

  // Watch portalData to update companyIdRef
  useEffect(() => {
    if (portalData?.company.id) {
      companyIdRef.current = portalData.company.id;
    }
  }, [portalData?.company.id]);

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
      {/* Indicador de Conexão Realtime */}
      {refreshing && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-primary/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Atualizando dados...
        </div>
      )}

      {!connected && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-amber-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
          <WifiOff className="h-3 w-3" />
          Modo offline
        </div>
      )}

      <PortalColaboradorView
        portalData={portalData}
        isPublic={true}
        selectedSectorIdFilter={setorFilter}
      />
    </div>
  );
}
