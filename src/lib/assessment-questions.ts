export interface Question {
  id: number;
  text: string;
  factor: "E" | "M" | "C" | "N" | "A";
  direction: "+" | "-";
}

export interface FactorScore {
  name: string;
  factor: "A" | "C" | "E" | "M" | "N";
  value: number; // 0 to 100 %
  rawScore: number; // 10 to 50
  description: string;
  classification: string;
}

// 50 Questões Fixas validadas segundo a Metodologia Big Five (OCEAN)
// Letras e sinais são exclusivos de programação e nunca mostrados ao usuário
export const BIG_FIVE_QUESTIONS: Question[] = [
  // Fator E: Extroversão (10 itens)
  { id: 1, text: "Sou o centro das atenções em eventos sociais e corporativos.", factor: "E", direction: "+" },
  { id: 2, text: "Puxo assunto facilmente com pessoas estranhas.", factor: "E", direction: "+" },
  { id: 3, text: "Sinto-me à vontade em assumir a liderança e direcionar grupos.", factor: "E", direction: "+" },
  { id: 4, text: "Tenho muita energia e gosto de estar rodeado de muita gente.", factor: "E", direction: "+" },
  { id: 5, text: "Falo bastante e de forma expressiva em reuniões.", factor: "E", direction: "+" },
  { id: 6, text: "Fico calado e reservado perto de pessoas desconhecidas.", factor: "E", direction: "-" },
  { id: 7, text: "Não gosto de chamar a atenção para mim.", factor: "E", direction: "-" },
  { id: 8, text: "Prefiro atividades solitárias ou bastidores a eventos em grupo.", factor: "E", direction: "-" },
  { id: 9, text: "Sinto-me esgotado após interagir com muitas pessoas seguidamente.", factor: "E", direction: "-" },
  { id: 10, text: "Tenho dificuldade ou desconforto em me expressar em público.", factor: "E", direction: "-" },

  // Fator M: Amabilidade (10 itens)
  { id: 11, text: "Respeito e importo-me profundamente com os sentimentos alheios.", factor: "M", direction: "+" },
  { id: 12, text: "Faço as pessoas se sentirem à vontade no ambiente de trabalho.", factor: "M", direction: "+" },
  { id: 13, text: "Tenho empatia e gosto de ajudar colegas que estão com dificuldades.", factor: "M", direction: "+" },
  { id: 14, text: "Acredito que a maioria das pessoas tem boas intenções.", factor: "M", direction: "+" },
  { id: 15, text: "Sou conhecido por ser um bom ouvinte e conselheiro.", factor: "M", direction: "+" },
  { id: 16, text: "Posso ser frio, cínico e indiferente em algumas situações.", factor: "M", direction: "-" },
  { id: 17, text: "Não me importo muito com os problemas pessoais dos outros.", factor: "M", direction: "-" },
  { id: 18, text: "Em debates, prefiro vencer ou provar que estou certo do que evitar magoar alguém.", factor: "M", direction: "-" },
  { id: 19, text: "Desconfio frequentemente das intenções das pessoas.", factor: "M", direction: "-" },
  { id: 20, text: "Costumo fazer críticas duras que acabam ofendendo os outros.", factor: "M", direction: "-" },

  // Fator C: Conscienciosidade (10 itens)
  { id: 21, text: "Estou sempre preparado, planejado e organizado.", factor: "C", direction: "+" },
  { id: 22, text: "Presto muita atenção aos detalhes em tudo que faço.", factor: "C", direction: "+" },
  { id: 23, text: "Concluo minhas tarefas rapidamente e respeito rigorosamente os prazos.", factor: "C", direction: "+" },
  { id: 24, text: "Sigo um cronograma ou método de trabalho com disciplina.", factor: "C", direction: "+" },
  { id: 25, text: "Sou extremamente exigente com a qualidade técnica das minhas entregas.", factor: "C", direction: "+" },
  { id: 26, text: "Deixo minhas tarefas espalhadas e meu ambiente de trabalho desorganizado.", factor: "C", direction: "-" },
  { id: 27, text: "Tenho dificuldade em manter o foco em tarefas longas ou repetitivas.", factor: "C", direction: "-" },
  { id: 28, text: "Costumo adiar o início de projetos importantes até o último minuto.", factor: "C", direction: "-" },
  { id: 29, text: "Fujo das minhas obrigações ou delego responsabilidades quando posso.", factor: "C", direction: "-" },
  { id: 30, text: "Cometo erros por distração ou pressa na execução.", factor: "C", direction: "-" },

  // Fator N: Estabilidade Emocional (10 itens)
  { id: 31, text: "Permaneço calmo e focado mesmo sob forte pressão ou cobrança.", factor: "N", direction: "+" },
  { id: 32, text: "Sou relaxado e lido muito bem com o estresse do dia a dia.", factor: "N", direction: "+" },
  { id: 33, text: "Supero rapidamente os contratempos, críticas e frustrações.", factor: "N", direction: "+" },
  { id: 34, text: "Mantenho o raciocínio lógico em momentos de crise.", factor: "N", direction: "+" },
  { id: 35, text: "Sinto-me seguro e confiante na maioria das situações profissionais.", factor: "N", direction: "+" },
  { id: 36, text: "Fico estressado, tenso e irritado com muita facilidade.", factor: "N", direction: "-" },
  { id: 37, text: "Preocupo-me excessivamente com coisas que podem dar errado.", factor: "N", direction: "-" },
  { id: 38, text: "Tenho mudanças frequentes de humor dependendo do ambiente.", factor: "N", direction: "-" },
  { id: 39, text: "Sinto-me ansioso e inseguro quando a rotina muda inesperadamente.", factor: "N", direction: "-" },
  { id: 40, text: "Levo críticas muito para o lado pessoal e me ofendo com facilidade.", factor: "N", direction: "-" },

  // Fator A: Abertura à Experiência (10 itens)
  { id: 41, text: "Tenho excelente imaginação e facilidade para ter ideias criativas.", factor: "A", direction: "+" },
  { id: 42, text: "Compreendo rapidamente conceitos complexos e teorias abstratas.", factor: "A", direction: "+" },
  { id: 43, text: "Gosto de testar novas tecnologias e métodos inovadores no trabalho.", factor: "A", direction: "+" },
  { id: 44, text: "Tenho um vocabulário rico e gosto de consumir conteúdos diversos.", factor: "A", direction: "+" },
  { id: 45, text: "Aprecio discussões estratégicas e visões de longo prazo.", factor: "A", direction: "+" },
  { id: 46, text: "Tenho dificuldade em entender ideias muito abstratas ou fora da minha rotina.", factor: "A", direction: "-" },
  { id: 47, text: "Prefiro seguir processos tradicionais e comprovados a arriscar novas formas de trabalhar.", factor: "A", direction: "-" },
  { id: 48, text: "Evito mudar a forma como sempre fiz as coisas.", factor: "A", direction: "-" },
  { id: 49, text: "Raramente procuro aprender conhecimentos técnicos que estejam fora da minha área de atuação.", factor: "A", direction: "-" },
  { id: 50, text: "Não me interesso por planejar o futuro, prefiro focar apenas na execução prática de hoje.", factor: "A", direction: "-" },
];

export const LIKERT_OPTIONS = [
  { value: 1, label: "Discordo Totalmente", short: "1" },
  { value: 2, label: "Discordo Parcialmente", short: "2" },
  { value: 3, label: "Neutro / Não sei opinar", short: "3" },
  { value: 4, label: "Concordo Parcialmente", short: "4" },
  { value: 5, label: "Concordo Totalmente", short: "5" },
];

export const FACTOR_DEFINITIONS: Record<
  "A" | "C" | "E" | "M" | "N",
  { name: string; description: string; strengths: string; blind_spots: string }
> = {
  A: {
    name: "Abertura à Experiência",
    description: "Criatividade, flexibilidade mental e capacidade de inovação estratégica.",
    strengths: "Pensamento inovador, adaptabilidade a mudanças e curiosidade intelectual.",
    blind_spots: "Pode se dispersar com excesso de novidades ou desvalorizar rotinas consolidadas.",
  },
  C: {
    name: "Conscienciosidade",
    description: "Organização, disciplina, atenção a detalhes e foco rigoroso em metas.",
    strengths: "Alto senso de dever, pontualidade, planejamento estruturado e consistência de entregas.",
    blind_spots: "Risco de inflexibilidade ou perfeccionismo excessivo diante de prazos curtos.",
  },
  E: {
    name: "Extroversão",
    description: "Sociabilidade, assertividade, energia em grupo e comunicação expressiva.",
    strengths: "Liderança natural, facilidade de articulação, engajamento e presença marcante.",
    blind_spots: "Pode monopolizar conversas ou ter dificuldade em escuta ativa prolongada.",
  },
  M: {
    name: "Amabilidade",
    description: "Empatia, cooperação, confiança mútua e orientação para o trabalho em equipe.",
    strengths: "Construção de consenso, mediação de conflitos, ambiente harmonioso e escuta atenta.",
    blind_spots: "Dificuldade em emitir feedbacks duros ou dizer 'não' para preservar o relacionamento.",
  },
  N: {
    name: "Estabilidade Emocional",
    description: "Resiliência psicológica, serenidade e alta tolerância ao estresse e pressão.",
    strengths: "Calma em crises, controle de ansiedade, postura ponderada e segurança operacional.",
    blind_spots: "Em níveis extremos, pode aparentar frieza ou demorar a reagir a alertas urgentes.",
  },
};

/**
 * Lógica de Cálculo do Big Five com Itens Reversos:
 * 1. Itens Positivos [+]: O valor selecionado (1 a 5) é somado diretamente à dimensão.
 * 2. Itens Reversos [-]: O valor é invertido (6 - valor) antes de somar.
 * 3. Consolidação: 10 itens por dimensão -> Escala bruta de 10 a 50 pontos.
 *    Percentual normalizado (0 a 100%): Math.round(((pontos - 10) / 40) * 100).
 */
export function calculateBigFiveScores(answers: Record<number, number>): {
  radar: FactorScore[];
  dominantFactor: FactorScore;
  aiSummary: {
    natural: string;
    strengths: string;
    ideal_env: string;
    blind_spots: string;
  };
} {
  const factorPoints: Record<"A" | "C" | "E" | "M" | "N", number> = {
    A: 0,
    C: 0,
    E: 0,
    M: 0,
    N: 0,
  };

  BIG_FIVE_QUESTIONS.forEach((q) => {
    const rawVal = answers[q.id] || 3; // Default neutro se não respondido
    const computedVal = q.direction === "+" ? rawVal : 6 - rawVal;
    factorPoints[q.factor] += computedVal;
  });

  const getClassification = (pct: number) => {
    if (pct >= 80) return "Muito Alto (Dominante)";
    if (pct >= 65) return "Alto";
    if (pct >= 45) return "Equilibrado";
    if (pct >= 30) return "Moderado";
    return "Em Desenvolvimento";
  };

  // Eixos na ordem OCEAN para formar o pentágono harmonioso:
  // Abertura, Conscienciosidade, Extroversão, Amabilidade, Estabilidade Emocional
  const order: Array<"A" | "C" | "E" | "M" | "N"> = ["A", "C", "E", "M", "N"];

  const radar: FactorScore[] = order.map((f) => {
    const rawScore = factorPoints[f];
    // Normalização padrão da escala Likert (10 a 50) para (0 a 100)
    const pct = Math.min(100, Math.max(0, Math.round(((rawScore - 10) / 40) * 100)));
    const def = FACTOR_DEFINITIONS[f];

    return {
      name: def.name,
      factor: f,
      value: pct,
      rawScore,
      description: def.description,
      classification: getClassification(pct),
    };
  });

  // Identificar o fator dominante
  const sorted = [...radar].sort((a, b) => b.value - a.value);
  const dominant = sorted[0];
  const secondary = sorted[1];
  const lowest = sorted[sorted.length - 1];

  const aiSummary = {
    natural: `Perfil caracterizado por destaque em ${dominant.name} (${dominant.value}%) e ${secondary.name} (${secondary.value}%). Demonstra forte alinhamento com ${dominant.description.toLowerCase()}, combinando assertividade e orientação comportamental consistente.`,
    strengths: `${FACTOR_DEFINITIONS[dominant.factor].strengths} Destaca-se também em ${secondary.name.toLowerCase()} com ${FACTOR_DEFINITIONS[secondary.factor].strengths.toLowerCase()}`,
    ideal_env: `Ambientes com autonomia proporcional, foco em entregas bem estruturadas, clareza de expectativas e espaço para exercer ${dominant.name.toLowerCase()}.`,
    blind_spots: `Ponto de atenção em ${lowest.name} (${lowest.value}%): ${FACTOR_DEFINITIONS[lowest.factor].blind_spots} Recomenda-se desenvolvimento contínuo de ${FACTOR_DEFINITIONS[lowest.factor].description.toLowerCase()}`,
  };

  return {
    radar,
    dominantFactor: dominant,
    aiSummary,
  };
}
