export const PERMISSION_ACTIONS = ["read", "create", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type AccessRole = "CLIENTE" | "CONSULTOR" | "GESTOR" | "SUPERADMIN" | "AUDITOR_5S";
export type PermissionMatrix = {
  version: 1;
  categories: Record<string, boolean>;
  sub_modules: Record<string, boolean>;
  actions: Record<string, Partial<Record<PermissionAction, boolean>>>;
};
export const PERMISSION_CATALOG = [
  { key: "gestao", label: "Gestão e consultoria", tools: [
    { key: "empresas", label: "Empresas", paths: ["/empresas"] },
    { key: "projetos", label: "Projetos", paths: ["/projetos"] },
    { key: "torre_controle", label: "Torre de controle", paths: ["/controle", "/dashboard"] },
    { key: "agenda", label: "Agenda", paths: ["/calendario", "/google-callback"] },
    { key: "entrevistas", label: "Entrevistas", paths: ["/entrevistas"] },
    { key: "mapas_processos", label: "Mapas de processos", paths: ["/processos"] },
    { key: "fluxo_dores", label: "Fluxo de dores", paths: ["/mapas/dores"] },
    { key: "fluxo_decisoes", label: "Fluxo de decisões", paths: ["/mapas/decisao"] },
    { key: "fluxo_informacoes", label: "Fluxo de informações", paths: ["/mapas/informacao"] },
    { key: "cronoanalise", label: "Cronoanálise", paths: ["/cronoanalise"] },
    { key: "analise_critica", label: "Análise crítica", paths: ["/analise-critica"] },
    { key: "oportunidades", label: "Matriz de oportunidades", paths: ["/oportunidades"] },
    { key: "causa_raiz", label: "Causa raiz", paths: ["/causa-raiz"] },
    { key: "gut", label: "Priorização GUT", paths: ["/priorizacao"] },
    { key: "tobe", label: "Processos TO-BE", paths: ["/tobe"] },
    { key: "planos_acao", label: "Planos de ação", paths: ["/planos-acao"] },
    { key: "roadmap", label: "Roadmap", paths: ["/roadmap"] },
    { key: "impacto", label: "Conexão de impacto", paths: ["/impacto"] },
    { key: "relatorio_executivo", label: "Relatório executivo", paths: ["/diagnostico"] },
    { key: "relatorio_mensal", label: "Relatório executivo mensal", paths: ["/relatorio-executivo-mensal"] },
    { key: "relatorio_acompanhamento", label: "Relatório de acompanhamento", paths: ["/relatorio-acompanhamento", "/relatorios"] },
    { key: "mapa_estrategico", label: "Mapa estratégico", paths: ["/mapa"] },
    { key: "modelos_documentos", label: "Modelos de documentos", paths: ["/template-documentos"] },
    { key: "analise_perfil", label: "Pessoas e avaliação de perfil", paths: ["/pessoas/assessment"] },
    { key: "recrutamento", label: "Recrutamento", paths: ["/pessoas/recrutamento"] },
    { key: "mentorias", label: "Mentorias", paths: ["/pessoas/mentorias"] },
    { key: "nps_enps", label: "Pesquisas NPS e eNPS", paths: ["/pessoas/nps"] },
    { key: "hub_5s", label: "HUB 5S Operacional", paths: ["/melhorias/5s"] },
  ] },
  { key: "portal", label: "Portal do cliente", tools: [
    { key: "portal_empresa", label: "Portal da empresa", paths: ["/c/"] },
    { key: "portal_resultados", label: "Acompanhamento de ações e resultados", paths: ["/dashboard/"] },
  ] },
  { key: "indicadores", label: "Indicadores", tools: [
    { key: "indicadores_cadastro", label: "Cadastro de indicadores", paths: ["/indicadores"] },
    { key: "indicadores_coleta", label: "Coleta de indicadores", paths: [] },
    { key: "indicadores_historico", label: "Histórico de medições", paths: [] },
  ] },
  { key: "pop", label: "Procedimentos (POP)", tools: [
    { key: "pop_leitura", label: "Procedimentos operacionais", paths: ["/pop"] },
    { key: "pop_edicao", label: "Edição e emissão de POP", paths: [] },
  ] },
  { key: "horas", label: "Registro de horas", tools: [
    { key: "horas_lancamentos", label: "Lançamentos de horas", paths: ["/horas"] },
    { key: "horas_despesas", label: "Ferramentas e despesas dos lançamentos", paths: [] },
  ] },
  { key: "financeiro", label: "Financeiro", tools: [
    { key: "faturamentos", label: "Faturamentos", paths: ["/financeiro", "/financeiro-maia"] },
    { key: "pagamentos", label: "Pagamentos e saldos", paths: [] },
    { key: "relatorios_faturamento", label: "Relatórios de faturamento", paths: [] },
  ] },
  { key: "crm", label: "CRM comercial", tools: [
    { key: "crm_leads", label: "Funil de leads", paths: ["/crm"] },
    { key: "crm_atividades", label: "Contatos e atividades", paths: [] },
    { key: "crm_contratos", label: "Contratos e empresas ativas", paths: [] },
  ] },
  { key: "chamados", label: "Chamados internos", tools: [
    { key: "chamados_melhorias", label: "Solicitações de melhorias", paths: ["/chamados"] },
    { key: "chamados_erros", label: "Relatos de erros", paths: [] },
    { key: "chamados_acompanhamento", label: "Acompanhamento de chamados", paths: [] },
  ] },
];

export const ALL_PERMISSION_TOOLS = PERMISSION_CATALOG.flatMap((group) =>
  group.tools.map((tool) => ({ ...tool, category: group.key })),
);

export function emptyPermissions(): PermissionMatrix {
  return { version: 1, categories: {}, sub_modules: {}, actions: {} };
}

export function normalizePermissions(input: unknown): PermissionMatrix {
  if (!input || typeof input !== "object") return emptyPermissions();
  const value = input as Record<string, unknown>;
  const granular = value.version === 1;
  const categories = (granular ? value.categories : value) as Record<string, unknown> | undefined;
  const modules = value.sub_modules as Record<string, unknown> | undefined;
  const actions = value.actions as Record<string, Record<string, unknown>> | undefined;
  const result = emptyPermissions();
  for (const group of PERMISSION_CATALOG) {
    result.categories[group.key] = categories?.[group.key] === true;
    for (const tool of group.tools) {
      result.sub_modules[tool.key] = granular ? modules?.[tool.key] === true : result.categories[group.key];
      result.actions[tool.key] = Object.fromEntries(PERMISSION_ACTIONS.map((action) =>
        [action, granular ? actions?.[tool.key]?.[action] === true : result.categories[group.key]],
      ));
    }
  }
  return result;
}

export function canUsePermission(input: unknown, toolKey: string, action: PermissionAction = "read"): boolean {
  const tool = ALL_PERMISSION_TOOLS.find((item) => item.key === toolKey);
  if (!tool) return false;
  const matrix = normalizePermissions(input);
  return matrix.categories[tool.category] === true && matrix.sub_modules[tool.key] === true && matrix.actions[tool.key]?.[action] === true;
}

export function setToolPermissions(matrix: PermissionMatrix, key: string, enabled: boolean): PermissionMatrix {
  const tool = ALL_PERMISSION_TOOLS.find((item) => item.key === key);
  if (!tool) return matrix;
  const next = { ...matrix, categories: { ...matrix.categories }, sub_modules: { ...matrix.sub_modules, [key]: enabled }, actions: { ...matrix.actions, [key]: Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, enabled])) } };
  next.categories[tool.category] = PERMISSION_CATALOG.find((group) => group.key === tool.category)?.tools.some((item) => next.sub_modules[item.key]) === true;
  return next;
}

export function permissionsPreset(role: AccessRole): PermissionMatrix {
  let result = emptyPermissions();
  for (const tool of ALL_PERMISSION_TOOLS) {
    const enabled = role === "SUPERADMIN" || role === "GESTOR" ||
      (role === "CONSULTOR" && !["financeiro", "crm", "portal"].includes(tool.category)) ||
      (role === "CLIENTE" && ["portal_empresa", "portal_resultados", "indicadores_historico", "mapa_estrategico", "chamados_melhorias", "chamados_erros", "chamados_acompanhamento"].includes(tool.key)) ||
      (role === "AUDITOR_5S" && tool.key === "hub_5s");
    result = setToolPermissions(result, tool.key, enabled);
    if (role === "CLIENTE" && enabled) {
      result.actions[tool.key] = { read: true, create: ["chamados_melhorias", "chamados_erros"].includes(tool.key), update: false, delete: false };
    }
    if (role === "AUDITOR_5S" && enabled) {
      result.actions[tool.key] = { read: true, create: true, update: true, delete: false };
    }
  }
  return result;
}

export function toolsForPath(pathname: string): string[] {
  if (pathname.startsWith("/pessoas/dashboard")) return ["analise_perfil", "recrutamento", "mentorias", "nps_enps"];
  if (pathname.startsWith("/indicadores")) return pathname.endsWith("/coletar") ? ["indicadores_coleta"] : ["indicadores_cadastro", "indicadores_historico"];
  if (pathname.startsWith("/pop")) return ["pop_leitura", "pop_edicao"];
  if (pathname.startsWith("/financeiro")) return ["faturamentos", "pagamentos", "relatorios_faturamento"];
  if (pathname.startsWith("/horas")) return ["horas_lancamentos", "horas_despesas"];
  if (pathname.startsWith("/crm")) return ["crm_leads", "crm_atividades", "crm_contratos"];
  if (pathname.startsWith("/chamados")) return ["chamados_melhorias", "chamados_erros", "chamados_acompanhamento"];
  const matches = ALL_PERMISSION_TOOLS.flatMap((tool) => tool.paths.filter((path) => pathname === path || pathname.startsWith(path.endsWith("/") ? path : `${path}/`)).map((path) => ({ key: tool.key, length: path.length })));
  const longest = Math.max(0, ...matches.map((match) => match.length));
  return matches.filter((match) => match.length === longest).map((match) => match.key);
}