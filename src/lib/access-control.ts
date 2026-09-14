import type { Me, ToolKey } from "@/lib/access.functions";

export function permissionForPath(pathname: string): ToolKey | null {
  if (pathname.startsWith("/financeiro")) return "financeiro";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/horas")) return "horas";
  if (pathname.startsWith("/chamados")) return "chamados";
  if (pathname.startsWith("/pop")) return "pop";
  if (pathname.startsWith("/indicadores")) return "indicadores";
  if (
    pathname.startsWith("/empresas") ||
    pathname.startsWith("/controle") ||
    pathname.startsWith("/calendario") ||
    pathname.startsWith("/relatorios") ||
    pathname.startsWith("/fase") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/entrevistas") ||
    pathname.startsWith("/mapas") ||
    pathname.startsWith("/processos") ||
    pathname.startsWith("/cronoanalise") ||
    pathname.startsWith("/analise-critica") ||
    pathname.startsWith("/oportunidades") ||
    pathname.startsWith("/causa-raiz") ||
    pathname.startsWith("/priorizacao") ||
    pathname.startsWith("/tobe") ||
    pathname.startsWith("/planos-acao") ||
    pathname.startsWith("/relatorio-acompanhamento") ||
    pathname.startsWith("/diagnostico") ||
    pathname.startsWith("/roadmap") ||
    pathname.startsWith("/template-documentos") ||
    pathname.startsWith("/projetos")
  ) return "gestao";
  return null;
}

export function hasToolPermission(profile: Me | undefined, permission: ToolKey | null) {
  if (!permission) return true;
  return !!profile?.isSuperadmin || !!profile?.memberships.some(
    (membership) => membership.permissions?.[permission] === true,
  );
}