// src/routes/pesquisa.$hash.tsx
// Rota Pública Oficial e Sem Autenticação para Coleta de Pesquisas NPS e eNPS

import { createFileRoute } from "@tanstack/react-router";
import { PublicSurveyView } from "@/components/nps/PublicSurveyView";

export const Route = createFileRoute("/pesquisa/$hash")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pesquisa de Satisfação | Maia Consultoria" },
      { name: "description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
    ],
  }),
  component: PublicSurveyRouteComponent,
});

function PublicSurveyRouteComponent() {
  const { hash } = Route.useParams();
  return <PublicSurveyView hash={hash} />;
}
