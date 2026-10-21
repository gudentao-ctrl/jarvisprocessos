// Endereço alternativo e público das pesquisas NPS e eNPS (links antigos usam /pesquisa).
import { createFileRoute } from "@tanstack/react-router";
import { PublicSurveyView } from "@/components/nps/PublicSurveyView";

export const Route = createFileRoute("/pesquisa/$hash")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pesquisa de Satisfação | Maia Consultoria" },
      { name: "description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
      { property: "og:title", content: "Pesquisa de Satisfação | Maia Consultoria" },
      { property: "og:description", content: "Sua opinião é fundamental para aprimorarmos nossa entrega contínua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicSurveyRoute,
});

function PublicSurveyRoute() {
  const { hash } = Route.useParams();
  return <PublicSurveyView hash={hash} />;
}
