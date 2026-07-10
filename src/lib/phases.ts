export type PhaseSlug =
  | "controle"
  | "diagnostico"
  | "mapeamento"
  | "melhorias"
  | "execucao"
  | "gestao"
  | "encerramento";

export type Phase = {
  slug: PhaseSlug;
  label: string;
  description?: string;
};

export const PHASES: Phase[] = [
  { slug: "controle",     label: "Controle",     description: "Situação consolidada da empresa" },
  { slug: "diagnostico",  label: "Diagnóstico",  description: "Entrevistas, dores e mapas" },
  { slug: "mapeamento",   label: "Mapeamento",   description: "Processos, BPM e cronoanálise" },
  { slug: "melhorias",    label: "Melhorias",    description: "Oportunidades, causa raiz, TO BE" },
  { slug: "execucao",     label: "Execução",     description: "Planos de ação e indicadores" },
  { slug: "gestao",       label: "Gestão",       description: "Dashboard, roadmap e horas" },
  { slug: "encerramento", label: "Encerramento", description: "Resultados finais e entrega" },
];

export type PhaseTool = {
  label: string;
  description: string;
  to: string;
  icon: string;
};

export const PHASE_TOOLS: Record<Exclude<PhaseSlug, "controle">, PhaseTool[]> = {
  diagnostico: [
    { label: "Entrevistas",         description: "Realizar e transcrever entrevistas", to: "/entrevistas",       icon: "Mic" },
    { label: "Análises automáticas",description: "Resumos e insights por IA",          to: "/entrevistas",       icon: "Sparkles" },
    { label: "Mapa de dores",       description: "Pontos de dor identificados",        to: "/mapas/dores",       icon: "FileText" },
    { label: "Fluxo de informação", description: "Como a informação circula",          to: "/mapas/informacao",  icon: "Map" },
    { label: "Fluxo de decisão",    description: "Quem decide o quê",                  to: "/mapas/decisao",     icon: "GitBranch" },
  ],
  mapeamento: [
    { label: "Processos & BPM", description: "Lista estruturada e fluxograma",   to: "/processos",     icon: "Workflow" },
    { label: "Cronoanálises",   description: "Medições de tempo no campo",       to: "/cronoanalise",  icon: "Timer" },
  ],
  melhorias: [
    { label: "Análise crítica", description: "Insights e gargalos detectados pela IA", to: "/analise-critica", icon: "Sparkles" },
    { label: "Oportunidades",   description: "Backlog de melhorias",                   to: "/oportunidades",   icon: "Lightbulb" },
    { label: "Causa raiz",      description: "5 porquês e Ishikawa",                   to: "/causa-raiz",      icon: "GitBranch" },
    { label: "Priorização",     description: "Matriz impacto × esforço",               to: "/priorizacao",     icon: "Target" },
    { label: "TO BE",           description: "Processos redesenhados",                 to: "/tobe",            icon: "GitCompare" },
  ],
  execucao: [
    { label: "Planos de ação", description: "Ações em andamento e atrasadas", to: "/planos-acao", icon: "ClipboardList" },
    { label: "Indicadores",    description: "Indicadores e metas",            to: "/indicadores", icon: "BarChart3" },
    { label: "Relatório de Acompanhamento", description: "Relatório executivo periódico gerado pela IA", to: "/relatorio-acompanhamento", icon: "FileBarChart2" },
  ],
  gestao: [
    { label: "Dashboard",              description: "Visão executiva consolidada",           to: "/dashboard",     icon: "BarChart3" },
    { label: "Diagnóstico executivo",  description: "Relatório final gerado pela IA",        to: "/diagnostico",   icon: "FileText" },
    { label: "Roadmap",                description: "Iniciativas por horizonte",             to: "/roadmap",       icon: "ListTodo" },
    { label: "Horas trabalhadas",      description: "Registrar apontamentos por responsável",to: "/horas",         icon: "Clock" },
    { label: "Relatórios",             description: "Exportações e consolidados",            to: "/relatorios",    icon: "FileBarChart2" },
    { label: "Template de documentos", description: "Branding único dos PDFs (logos, cores)", to: "/template-documentos", icon: "FileText" },
  ],
  encerramento: [
    { label: "Diagnóstico executivo", description: "Consolidação final de dores, causas e ganhos", to: "/diagnostico",  icon: "FileText" },
    { label: "Roadmap concluído",     description: "Marcos entregues e pendentes",                 to: "/roadmap",      icon: "Trophy" },
    { label: "Indicadores finais",    description: "Resultado × meta ao fim do projeto",           to: "/indicadores",  icon: "BarChart3" },
    { label: "Relatórios",            description: "Exportação e histórico",                       to: "/relatorios",   icon: "FileBarChart2" },
  ],
};
