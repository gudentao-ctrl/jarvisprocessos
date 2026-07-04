import { createFileRoute, redirect } from "@tanstack/react-router";

// Aba Projetos foi removida — o app agora é centrado em Empresa.
export const Route = createFileRoute("/_authenticated/projetos/")({
  beforeLoad: () => { throw redirect({ to: "/empresas" }); },
});
