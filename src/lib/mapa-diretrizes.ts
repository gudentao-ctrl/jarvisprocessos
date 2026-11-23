export const OFFICIAL_DIRETRIZES = [
  {
    number: 1,
    title: "Cumprir integralmente as responsabilidades de contratos e delegações;",
  },
  {
    number: 2,
    title: "Fortalecer a governança institucional com mecanismos de continuidade administrativa;",
  },
  {
    number: 3,
    title:
      "Expandir a carta de serviços e produtos com foco em iluminação pública, iluminação cênica, eficiência energética, infraestrutura elétrica e lógica em próprios públicos e tecnologias para cidades inteligentes;",
  },
  {
    number: 4,
    title:
      "Aproximação/Articulação com o governo federal, estadual, concessionárias de rodovias, geração e distribuição de energia e saneamento para captação/manutenção de contratos.",
  },
  {
    number: 5,
    title:
      "Fomentar projetos de pesquisa e desenvolvimento com instituições tecnológicas, governo municipal, governo estadual e governo federal.",
  },
  {
    number: 6,
    title:
      "Ser protagonista no projeto de cidades inteligentes, sendo responsável pela infraestrutura de sensores e câmeras com sistemas de IA (Inteligência Artificial) focada em zeladoria e segurança e melhoria nos processos baseados em dados;",
  },
  {
    number: 7,
    title:
      "Desenvolver e implantar ferramentas de BI e IA para gestão assertiva e eficiente no processo decisório interno e nos órgãos e secretarias de administração pública dos municípios;",
  },
  {
    number: 8,
    title:
      "Desenvolver e implantar soluções inovadoras para infraestrutura de cabeamento subterrâneo, visando segurança e conforto visual das cidades;",
  },
  {
    number: 9,
    title:
      "Estabelecer gestão eficiente e responsável dos recursos com foco em eficiência estrutural, tecnológica, atualização de frotas, ferramentas, e sistemas.",
  },
  {
    number: 10,
    title:
      "Desenvolver e reestruturar processos para clientes internos e externos, mapear competências e capacitar as pessoas para eficiência da gestão pública de cidades inteligentes e eficientes;",
  },
  {
    number: 11,
    title:
      "Desenvolver e implantar políticas de gestão meritocrática alinhada ao plano de carreira e de remuneração estratégica baseada em indicadores;",
  },
  {
    number: 12,
    title:
      "Desenvolver e promover políticas de gestão de pessoas que favoreçam a saúde mental, bem estar e segurança do trabalho (implantação NR 01).",
  },
  {
    number: 13,
    title:
      "Desenvolver e implementar políticas de comunicação interna e endomarketing alinhado a estratégia do negócio;",
  },
  {
    number: 14,
    title:
      "Desenvolver e implementar planejamento de mão de obra qualificada e equalizado com o crescimento da empresa;",
  },
  {
    number: 15,
    title:
      "Reposicionar a marca com plano estratégico de marketing focado na excelência dos serviços e satisfação do cidadão;",
  },
  {
    number: 16,
    title: "Atuar de maneira responsável em relação às questões sociais e ambientais.",
  },
] as const;

export function matchOfficialDiretriz(title?: string | null, rawOrder?: number | null): number | null {
  if (!title) return rawOrder && rawOrder > 0 ? (rawOrder === 17 ? 16 : rawOrder) : null;
  const t = title.toLowerCase();

  // 1. Verificação semântica prioritária (reconciliação precisa e permanente)
  if (t.includes("contratos e delegações") || t.includes("responsabilidades de contratos")) return 1;
  if (t.includes("governança institucional") || t.includes("continuidade administrativa")) return 2;
  if (
    t.includes("carta de serviços") ||
    t.includes("iluminação pública") ||
    t.includes("iluminação cênica") ||
    t.includes("infraestrutura elétrica")
  )
    return 3;
  if (
    t.includes("aproximação/articulação") ||
    t.includes("articulação com o governo") ||
    t.includes("concessionárias de rodovias") ||
    t.includes("distribuição de energia")
  )
    return 4;
  if (t.includes("fomentar projetos de pesquisa") || t.includes("pesquisa e desenvolvimento"))
    return 5;
  if (
    t.includes("protagonista no projeto de cidades inteligentes") ||
    t.includes("sensores e câmeras") ||
    (t.includes("zeladoria e segurança") && t.includes("dados"))
  )
    return 6;
  if (
    t.includes("ferramentas de bi") ||
    t.includes("bi e ia") ||
    t.includes("processo decisório interno")
  )
    return 7;
  if (t.includes("cabeamento subterrâneo") || t.includes("conforto visual das cidades"))
    return 8;
  if (
    t.includes("gestão eficiente e responsável dos recursos") ||
    t.includes("atualização de frotas") ||
    t.includes("eficiência estrutural")
  )
    return 9;
  if (
    t.includes("reestruturar processos para clientes") ||
    t.includes("mapear competências") ||
    t.includes("capacitar as pessoas")
  )
    return 10;
  if (
    t.includes("meritocrática") ||
    t.includes("remuneração estratégica") ||
    t.includes("plano de carreira")
  )
    return 11;
  if (
    t.includes("saúde mental") ||
    t.includes("bem estar e segurança do trabalho") ||
    t.includes("nr 01") ||
    t.includes("nr-01") ||
    t.includes("nr01")
  )
    return 12;
  if (t.includes("comunicação interna") || t.includes("endomarketing"))
    return 13;
  if (t.includes("mão de obra qualificada") || t.includes("planejamento de mão de obra"))
    return 14;
  if (
    t.includes("reposicionar a marca") ||
    t.includes("satisfação do cidadão") ||
    t.includes("estratégico de marketing")
  )
    return 15;
  if (t.includes("sociais e ambientais") || t.includes("questões sociais"))
    return 16;

  // 2. Prefixo numérico no título (ex: "Diretriz 1:", "1. ", "D1")
  const prefixMatch = title.match(/^(?:diretriz\s*|d)?(\d+)(?:[.\s:-]|$)/i);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[1], 10);
    if (num >= 1 && num <= 16) return num;
    if (num === 17) return 16;
  }

  // 3. Fallback para rawOrder (se antigo 17, converte para 16)
  if (rawOrder && rawOrder > 0) {
    if (rawOrder === 17) return 16;
    return rawOrder;
  }

  return null;
}
