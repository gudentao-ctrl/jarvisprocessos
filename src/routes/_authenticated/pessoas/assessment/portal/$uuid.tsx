import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pessoas/assessment/portal/$uuid")({
  component: PortalRedirect,
});

export default function PortalRedirect() {
  const { uuid } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona o candidato para a rota padronizada e isolada /teste/:id
    navigate({
      to: "/teste/$id",
      params: { id: uuid },
      replace: true,
    });
  }, [uuid, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
      Carregando portal de avaliação...
    </div>
  );
}
