import { createFileRoute, redirect } from "@tanstack/react-router";

// Layout antigo de Projeto → redireciona toda a subárvore para /controle.
export const Route = createFileRoute("/_authenticated/projetos/$id")({
  beforeLoad: () => { throw redirect({ to: "/controle" }); },
});
