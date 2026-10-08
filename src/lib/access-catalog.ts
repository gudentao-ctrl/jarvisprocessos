import type { ToolKey } from "@/lib/access.functions";

export const ACCESS_CATALOG: Array<{ key: ToolKey; label: string; tools: string[] }> = [
  { key: "gestao", label: "Gestão e consultoria", tools: ["Empresas", "Projetos", "Torre de controle", "Agenda", "Entrevistas", "Mapas de processos", "Fluxo de dores", "Fluxo de decisões", "Fluxo de informações", "Cronoanálise", "Análise crítica", "Matriz de oportunidades", "Causa raiz", "Priorização GUT", "Processos TO-BE", "Planos de ação", "Roadmap", "Conexão de impacto", "Relatório executivo", "Relatório executivo mensal", "Relatório de acompanhamento", "Mapa estratégico", "Modelos de documentos", "Pessoas e avaliação de perfil", "Recrutamento"] },
  { key: "portal", label: "Portal do cliente", tools: ["Portal da empresa", "Acompanhamento de ações e resultados"] },
  { key: "indicadores", label: "Indicadores", tools: ["Cadastro de indicadores", "Coleta de indicadores", "Histórico de medições"] },
  { key: "pop", label: "Procedimentos (POP)", tools: ["Procedimentos operacionais", "Edição e emissão de POP"] },
  { key: "horas", label: "Registro de horas", tools: ["Lançamentos de horas", "Ferramentas e despesas dos lançamentos"] },
  { key: "financeiro", label: "Financeiro", tools: ["Faturamentos", "Pagamentos e saldos", "Relatórios de faturamento"] },
  { key: "crm", label: "CRM comercial", tools: ["Funil de leads", "Contatos e atividades", "Contratos e empresas ativas"] },
  { key: "chamados", label: "Chamados internos", tools: ["Solicitações de melhorias", "Relatos de erros", "Acompanhamento de chamados"] },
];

export function matchesAccessSearch(text: string, search: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalize(text).includes(normalize(search.trim()));
}