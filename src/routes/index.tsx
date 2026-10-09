import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Jarvis Processos | Gestão de empresas" },
    { name: "description", content: "Acesse a gestão de empresas e as ferramentas de consultoria do Jarvis Processos." },
    { property: "og:title", content: "Jarvis Processos | Gestão de empresas" },
    { property: "og:description", content: "Acesse a gestão de empresas e as ferramentas de consultoria do Jarvis Processos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/empresas" });
  },
});
