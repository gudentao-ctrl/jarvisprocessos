import type { Me, ToolKey } from "@/lib/access.functions";
import { ALL_PERMISSION_TOOLS, canUsePermission, toolsForPath } from "./permission-catalog";

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
    pathname.startsWith("/mapa") ||
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
    pathname.startsWith("/impacto") ||
    pathname.startsWith("/relatorio-executivo-mensal") ||
    pathname.startsWith("/diagnostico") ||
    pathname.startsWith("/roadmap") ||
    pathname.startsWith("/template-documentos") ||
    pathname.startsWith("/pessoas") ||
    pathname.startsWith("/projetos")
  )
    return "gestao";
  return null;
}

export function hasToolPermission(profile: Me | undefined, permission: ToolKey | null) {
  if (!permission) return true;
  return (
    !!profile?.isSuperadmin ||
    (profile?.status === "active" && !!profile.memberships.some((membership) => ALL_PERMISSION_TOOLS.filter((tool) => tool.category === permission).some((tool) => canUsePermission(membership.granularPermissions ?? membership.permissions, tool.key))))
  );
}

export function hasPathPermission(profile: Me | undefined, pathname: string, companyId?: string | null) {
  if (profile?.isSuperadmin) return true;
  if (profile?.status !== "active") return false;
  const keys = toolsForPath(pathname);
  return profile.memberships.filter((membership) => !companyId || membership.company_id === companyId).some((membership) => keys.some((key) => canUsePermission(membership.granularPermissions ?? membership.permissions, key)));
}
