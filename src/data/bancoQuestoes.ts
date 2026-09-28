export interface Questao {
  id: number;
  texto: string;
  bloco: 'BIG_FIVE' | 'DISC' | 'VALIDADE';
  fator:
    | 'NEUROTICISMO'
    | 'EXTROVERSAO'
    | 'ABERTURA'
    | 'AMABILIDADE'
    | 'CONSCIENCIOSIDADE'
    | 'DOMINANCIA'
    | 'INFLUENCIA'
    | 'ESTABILIDADE'
    | 'CONFORMIDADE'
    | 'DESEJABILIDADE'
    | 'INFREQUENCIA'
    | 'VRIN';
  faceta?: string;
  invertido: boolean;
  parVrinId?: number;
}

export const bancoQuestoes: Questao[] = [
  // =========================================================================
  // 1. BIG FIVE: NEUROTICISMO (Itens 1 a 30) - 6 Facetas x 5 Itens
  // =========================================================================
  // Faceta 1: Ansiedade (1 a 5)
  { id: 1, texto: "Fico tenso com facilidade diante de situações incertas.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Ansiedade", invertido: false },
  { id: 2, texto: "Mantenho a calma e o equilíbrio mesmo sob forte pressão.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Ansiedade", invertido: true },
  { id: 3, texto: "Preocupo-me excessivamente com coisas que ainda nem aconteceram.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Ansiedade", invertido: false },
  { id: 4, texto: "Raramente sinto apreensão ou medo em meu dia a dia.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Ansiedade", invertido: true },
  { id: 5, texto: "Fico facilmente inquieto quando prazos começam a apertar.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Ansiedade", invertido: false },

  // Faceta 2: Vulnerabilidade (6 a 10)
  { id: 6, texto: "Sinto-me sobrecarregado diante de problemas operacionais complexos.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Vulnerabilidade", invertido: false },
  { id: 7, texto: "Tenho facilidade para superar contratempos e crises rapidamente.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Vulnerabilidade", invertido: true },
  { id: 8, texto: "Sob estresse agudo, sinto que perco parte do meu controle.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Vulnerabilidade", invertido: false },
  { id: 9, texto: "Sinto-me seguro e confiante para lidar com emergências profissionais.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Vulnerabilidade", invertido: true },
  { id: 10, texto: "Pequenos imprevistos no trabalho me deixam desestruturado.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Vulnerabilidade", invertido: false },

  // Faceta 3: Hostilidade (11 a 15)
  { id: 11, texto: "Irrito-me rapidamente quando as coisas saem do planejado.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Hostilidade", invertido: false },
  { id: 12, texto: "Sou uma pessoa paciente e difícil de ser tirada do sério.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Hostilidade", invertido: true },
  { id: 13, texto: "Costumo guardar ressentimento de colegas que agiram de má-fé.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Hostilidade", invertido: false },
  { id: 14, texto: "Mesmo provocado, reajo de maneira cordial e ponderada.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Hostilidade", invertido: true },
  { id: 15, texto: "Fico indignado e exaltado quando percebo incompetência alheia.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Hostilidade", invertido: false },

  // Faceta 4: Impulsividade (16 a 20)
  { id: 16, texto: "Ajo sem pensar nos impulsos do momento.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Impulsividade", invertido: false },
  { id: 17, texto: "Consigo resistir facilmente a tentações ou desvios de foco.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Impulsividade", invertido: true },
  { id: 18, texto: "Tomo decisões precipitadas quando estou sob forte cobrança.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Impulsividade", invertido: false },
  { id: 19, texto: "Penso com prudência e contenho meus impulsos imediatos.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Impulsividade", invertido: true },
  { id: 20, texto: "Falo coisas no calor da discussão das quais me arrependo depois.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Impulsividade", invertido: false },

  // Faceta 5: Depressão / Desânimo (21 a 25)
  { id: 21, texto: "Frequentemente me sinto desanimado ou com pouca energia.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Depressão", invertido: false },
  { id: 22, texto: "Costumo encarar os dias com otimismo e alto astral.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Depressão", invertido: true },
  { id: 23, texto: "Tenho momentos em que me sinto desvalorizado e impotente.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Depressão", invertido: false },
  { id: 24, texto: "Tenho facilidade para me reerguer após um dia profissional ruim.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Depressão", invertido: true },
  { id: 25, texto: "Sinto uma sensação de vazio quando as metas não são atingidas.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Depressão", invertido: false },

  // Faceta 6: Autoconsciência / Timidez Social (26 a 30)
  { id: 26, texto: "Sinto-me envergonhado com facilidade em situações públicas.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Autoconsciência", invertido: false },
  { id: 27, texto: "Sinto-me perfeitamente à vontade para falar perante grandes grupos.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Autoconsciência", invertido: true },
  { id: 28, texto: "Fico constrangido quando todos os olhares se voltam para mim.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Autoconsciência", invertido: false },
  { id: 29, texto: "Tenho postura segura e desinibida em reuniões com desconhecidos.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Autoconsciência", invertido: true },
  { id: 30, texto: "Preocupo-me muito com o julgamento que os outros fazem de mim.", bloco: "BIG_FIVE", fator: "NEUROTICISMO", faceta: "Autoconsciência", invertido: false },

  // =========================================================================
  // 2. BIG FIVE: EXTROVERSÃO (Itens 31 a 60) - 6 Facetas x 5 Itens
  // =========================================================================
  // Faceta 1: Acolhimento (31 a 35)
  { id: 31, texto: "Faço amigos com muita facilidade e crio conexões rápidas.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Acolhimento", invertido: false },
  { id: 32, texto: "Costumo manter certa distância e formalidade com pessoas novas.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Acolhimento", invertido: true },
  { id: 33, texto: "Sou genuinamente afetuoso e acolhedor com colegas de trabalho.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Acolhimento", invertido: false },
  { id: 34, texto: "Prefiro manter relações estritamente técnicas e impessoais.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Acolhimento", invertido: true },
  { id: 35, texto: "Demonstro calor humano logo no primeiro contato profissional.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Acolhimento", invertido: false },

  // Faceta 2: Gregarismo (36 a 40)
  { id: 36, texto: "Adoro estar no meio de grandes multidões e eventos corporativos.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Gregarismo", invertido: false },
  { id: 37, texto: "Prefiro trabalhar em salas silenciosas ou isoladas de ruído.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Gregarismo", invertido: true },
  { id: 38, texto: "Sinto-me energizado ao interagir com grupos volumosos de pessoas.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Gregarismo", invertido: false },
  { id: 39, texto: "Evito aglomerações e locais com excesso de estímulos sociais.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Gregarismo", invertido: true },
  { id: 40, texto: "Gosto de ambientes de trabalho movimentados e integrados.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Gregarismo", invertido: false },

  // Faceta 3: Assertividade (41 a 45)
  { id: 41, texto: "Assumo a liderança em conversas e reuniões com naturalidade.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Assertividade", invertido: false },
  { id: 42, texto: "Deixo que os outros tomem a dianteira e decidam o rumo do grupo.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Assertividade", invertido: true },
  { id: 43, texto: "Defendo meus pontos de vista com vigor, clareza e firmeza.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Assertividade", invertido: false },
  { id: 44, texto: "Tenho tendência a me calar mesmo discordando de uma decisão.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Assertividade", invertido: true },
  { id: 45, texto: "Gosto de direcionar pessoas e coordenar execuções de projetos.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Assertividade", invertido: false },

  // Faceta 4: Atividade (46 a 50)
  { id: 46, texto: "Tenho um ritmo de vida acelerado, proativo e dinâmico.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Atividade", invertido: false },
  { id: 47, texto: "Prefiro um ritmo de trabalho cadenciado e sem pressa.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Atividade", invertido: true },
  { id: 48, texto: "Estou sempre em movimento, iniciando novas ações e tarefas.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Atividade", invertido: false },
  { id: 49, texto: "Gosto de pausas prolongadas para descansar entre atividades.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Atividade", invertido: true },
  { id: 50, texto: "Sinto-me produtivo quando minha agenda está repleta de compromissos.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Atividade", invertido: false },

  // Faceta 5: Busca de Excitação (51 a 55)
  { id: 51, texto: "Adoro correr riscos calculados e buscar fortes emoções.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Busca de Excitação", invertido: false },
  { id: 52, texto: "Evito situações imprevisíveis ou que envolvam perigo e incerteza.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Busca de Excitação", invertido: true },
  { id: 53, texto: "Gosto da adrenalina de atuar em projetos com prazos desafiadores.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Busca de Excitação", invertido: false },
  { id: 54, texto: "Prefiro rotinas seguras e comprovadas a aventuras arriscadas.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Busca de Excitação", invertido: true },
  { id: 55, texto: "Fico entediado com facilidade quando não há novidade ou emoção.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Busca de Excitação", invertido: false },

  // Faceta 6: Emoções Positivas (56 a 60)
  { id: 56, texto: "Transbordo entusiasmo, bom humor e alegria no dia a dia.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Emoções Positivas", invertido: false },
  { id: 57, texto: "Não costumo me empolgar ou vibrar de forma exagerada.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Emoções Positivas", invertido: true },
  { id: 58, texto: "Vejo o lado positivo e inspirador em quase todas as situações.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Emoções Positivas", invertido: false },
  { id: 59, texto: "Sou uma pessoa sóbria e discreta em minhas comemorações.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Emoções Positivas", invertido: true },
  { id: 60, texto: "Contagio meus colegas com energia positiva e celebração de vitórias.", bloco: "BIG_FIVE", fator: "EXTROVERSAO", faceta: "Emoções Positivas", invertido: false },

  // =========================================================================
  // 3. BIG FIVE: ABERTURA À EXPERIÊNCIA (Itens 61 a 90) - 6 Facetas x 5 Itens
  // =========================================================================
  // Faceta 1: Fantasia (61 a 65)
  { id: 61, texto: "Tenho uma imaginação vívida, fértil e ativa.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Fantasia", invertido: false },
  { id: 62, texto: "Foco estritamente na realidade concreta e evito divagações.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Fantasia", invertido: true },
  { id: 63, texto: "Gosto de criar cenários hipotéticos futuristas em minha mente.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Fantasia", invertido: false },
  { id: 64, texto: "Tenho pouca paciência para ideias que não tenham aplicação imediata.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Fantasia", invertido: true },
  { id: 65, texto: "Costumo ter insights criativos inesperados durante o dia.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Fantasia", invertido: false },

  // Faceta 2: Estética (66 a 70)
  { id: 66, texto: "Aprecio profundamente arte, design, música e boa apresentação visual.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Estética", invertido: false },
  { id: 67, texto: "Não ligo muito para detalhes visuais, estética ou harmonia gráfica.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Estética", invertido: true },
  { id: 68, texto: "Fico fascinado por padrões inovadores de arquitetura e design.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Estética", invertido: false },
  { id: 69, texto: "Prefiro funcionalidade bruta a qualquer embelezamento estético.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Estética", invertido: true },
  { id: 70, texto: "Valorizo relatórios e entregas com acabamento gráfico impecável.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Estética", invertido: false },

  // Faceta 3: Sentimentos (71 a 75)
  { id: 71, texto: "Dou valor crucial às minhas emoções internas e intuições.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Sentimentos", invertido: false },
  { id: 72, texto: "Raramente presto atenção aos meus estados emocionais no trabalho.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Sentimentos", invertido: true },
  { id: 73, texto: "Sinto emoções com grande intensidade e profundidade reflexiva.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Sentimentos", invertido: false },
  { id: 74, texto: "Tomo decisões baseando-me puramente em frieza lógica.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Sentimentos", invertido: true },
  { id: 75, texto: "Reconheço nuances sutis nas emoções dos meus interlocutores.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Sentimentos", invertido: false },

  // Faceta 4: Ações (76 a 80)
  { id: 76, texto: "Adoro testar novas rotinas, softwares e caminhos diferentes.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ações", invertido: false },
  { id: 77, texto: "Prefiro manter hábitos consolidados a arriscar novas abordagens.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ações", invertido: true },
  { id: 78, texto: "Tenho curiosidade de experimentar ferramentas de IA e tecnologia.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ações", invertido: false },
  { id: 79, texto: "Fico desconfortável quando mudam processos que já funcionavam.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ações", invertido: true },
  { id: 80, texto: "Adapto-me rapidamente a novidades estruturais na empresa.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ações", invertido: false },

  // Faceta 5: Ideias (81 a 85)
  { id: 81, texto: "Adoro resolver problemas conceituais, teóricos e complexos.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ideias", invertido: false },
  { id: 82, texto: "Prefiro lidar apenas com tarefas práticas do que com debates conceituais.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ideias", invertido: true },
  { id: 83, texto: "Gosto de ler livros e artigos fora da minha área de atuação.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ideias", invertido: false },
  { id: 84, texto: "Discussões puramente filosóficas me parecem perda de tempo.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ideias", invertido: true },
  { id: 85, texto: "Tenho facilidade para conectar conceitos abstratos a soluções práticas.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Ideias", invertido: false },

  // Faceta 6: Valores (86 a 90)
  { id: 86, texto: "Estou disposto a reexaminar crenças e valores estabelecidos.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Valores", invertido: false },
  { id: 87, texto: "Acredito que tradições e normas consagradas devem ser mantidas.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Valores", invertido: true },
  { id: 88, texto: "Acolho com naturalidade pontos de vista divergentes dos meus.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Valores", invertido: false },
  { id: 89, texto: "Considero perigoso flexibilizar regras morais ou sociais consolidadas.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Valores", invertido: true },
  { id: 90, texto: "Incentivo a diversidade cultural e a pluralidade de ideias nas equipes.", bloco: "BIG_FIVE", fator: "ABERTURA", faceta: "Valores", invertido: false },

  // =========================================================================
  // 4. BIG FIVE: AMABILIDADE / AGRADABILIDADE (Itens 91 a 120) - 6 Facetas x 5 Itens
  // =========================================================================
  // Faceta 1: Confiança (91 a 95)
  { id: 91, texto: "Acredito que a maioria das pessoas tem boas intenções fundamentais.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Confiança", invertido: false },
  { id: 92, texto: "Desconfio com facilidade de motivos ocultos em elogios ou favores.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Confiança", invertido: true },
  { id: 93, texto: "Costumo conceder o benefício da dúvida antes de julgar alguém.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Confiança", invertido: false },
  { id: 94, texto: "Acho prudente não confiar totalmente em parceiros de negócio.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Confiança", invertido: true },
  { id: 95, texto: "Acredito na integridade básica dos meus colegas e liderados.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Confiança", invertido: false },

  // Faceta 2: Franqueza (96 a 100)
  { id: 96, texto: "Sou totalmente direto, sincero e transparente ao me expressar.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Franqueza", invertido: false },
  { id: 97, texto: "Às vezes omito fatos ou uso diplomacia excessiva para evitar atritos.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Franqueza", invertido: true },
  { id: 98, texto: "Prefiro falar a verdade mesmo sabendo que ela pode incomodar.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Franqueza", invertido: false },
  { id: 99, texto: "Costumo florear mensagens para não ferir o ego de superiores.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Franqueza", invertido: true },
  { id: 100, texto: "Minha postura profissional é baseada em transparência absoluta.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Franqueza", invertido: false },

  // Faceta 3: Altruísmo (101 a 105)
  { id: 101, texto: "Sinto grande satisfação em ajudar os outros sem esperar nada em troca.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Altruísmo", invertido: false },
  { id: 102, texto: "Priorizo rigorosamente meus próprios interesses antes de socorrer outros.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Altruísmo", invertido: true },
  { id: 103, texto: "Dedico tempo com frequência para mentoriar colegas novatos.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Altruísmo", invertido: false },
  { id: 104, texto: "Não gosto de gastar minha energia resolvendo problemas de terceiros.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Altruísmo", invertido: true },
  { id: 105, texto: "Compartilho meus materiais e conhecimentos abertamente com o time.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Altruísmo", invertido: false },

  // Faceta 4: Conformidade / Cooperação (106 a 110)
  { id: 106, texto: "Evito conflitos diretos e prefiro ceder para manter a harmonia.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Conformidade", invertido: false },
  { id: 107, texto: "Em debates, prefiro vencer a discussão do que poupar sentimentos.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Conformidade", invertido: true },
  { id: 108, texto: "Busco consensos construtivos onde todos saiam ganhando.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Conformidade", invertido: false },
  { id: 109, texto: "Posso ser rígido e intransigente quando acredito que estou com a razão.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Conformidade", invertido: true },
  { id: 110, texto: "Facilito o diálogo cooperativo entre áreas com atritos.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Conformidade", invertido: false },

  // Faceta 5: Modéstia (111 a 115)
  { id: 111, texto: "Evito me vangloriar de minhas conquistas e resultados.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Modéstia", invertido: false },
  { id: 112, texto: "Faço questão de que todos reconheçam meu talento superior.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Modéstia", invertido: true },
  { id: 113, texto: "Prefiro que meu trabalho e métricas falem por si mesmos.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Modéstia", invertido: false },
  { id: 114, texto: "Gosto de chamar a atenção para meu status e realizações.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Modéstia", invertido: true },
  { id: 115, texto: "Reconheço humildemente os méritos de toda a equipe pelas vitórias.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Modéstia", invertido: false },

  // Faceta 6: Sensibilidade / Empatia (116 a 120)
  { id: 116, texto: "Sinto compaixão profunda por quem passa por dificuldades.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Sensibilidade", invertido: false },
  { id: 117, texto: "Consigo ser frio e indiferente a dramas pessoais no trabalho.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Sensibilidade", invertido: true },
  { id: 118, texto: "Preocupo-me de verdade com o bem-estar psicológico das pessoas.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Sensibilidade", invertido: false },
  { id: 119, texto: "Acho que as pessoas costumam se vitimizar por problemas banais.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Sensibilidade", invertido: true },
  { id: 120, texto: "Percebo prontamente quando um colega de equipe está desmotivado.", bloco: "BIG_FIVE", fator: "AMABILIDADE", faceta: "Sensibilidade", invertido: false },

  // =========================================================================
  // 5. BIG FIVE: CONSCIENCIOSIDADE (Itens 121 a 150) - 6 Facetas x 5 Itens
  // =========================================================================
  // Faceta 1: Competência (121 a 125)
  { id: 121, texto: "Sinto-me altamente preparado e capaz para as tarefas que assumo.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Competência", invertido: false },
  { id: 122, texto: "Frequentemente duvido da minha capacidade de entregar com perfeição.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Competência", invertido: true },
  { id: 123, texto: "Tenho facilidade para dominar processos técnicos e gerenciais.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Competência", invertido: false },
  { id: 124, texto: "Cometo erros operacionais por desatenção com frequência indesejada.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Competência", invertido: true },
  { id: 125, texto: "Sou reconhecido como referência de excelência em minha especialidade.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Competência", invertido: false },

  // Faceta 2: Ordem (126 a 130)
  { id: 126, texto: "Mantenho meus arquivos, mesa e ambiente de trabalho impecavelmente organizados.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Ordem", invertido: false },
  { id: 127, texto: "Deixo anotações e pastas espalhadas e desordenadas no computador.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Ordem", invertido: true },
  { id: 128, texto: "Gosto de seguir listas estruturadas de tarefas com método claro.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Ordem", invertido: false },
  { id: 129, texto: "Trabalho muito bem mesmo em meio ao caos e à desorganização visual.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Ordem", invertido: true },
  { id: 130, texto: "Categorizo informações meticulosamente para encontrá-las em segundos.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Ordem", invertido: false },

  // Faceta 3: Sentido de Dever (131 a 135)
  { id: 131, texto: "Cumpro minhas promessas, compromissos e obrigações rigorosamente à risca.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Dever", invertido: false },
  { id: 132, texto: "Às vezes deixo de cumprir regulamentos quando os acho burocráticos.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Dever", invertido: true },
  { id: 133, texto: "Tenho um senso ético inegociável em todas as minhas entregas.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Dever", invertido: false },
  { id: 134, texto: "Tento achar atalhos mesmo que desrespeitem pequenas regras corporativas.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Dever", invertido: true },
  { id: 135, texto: "Sinto dever moral de entregar resultados mesmo sem ninguém fiscalizando.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Dever", invertido: false },

  // Faceta 4: Esforço para Realização (136 a 140)
  { id: 136, texto: "Trabalho duro e com obstinação para alcançar metas profissionais ambiciosas.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Esforço para Realização", invertido: false },
  { id: 137, texto: "Sinto-me satisfeito apenas em fazer o mínimo exigido pelo cargo.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Esforço para Realização", invertido: true },
  { id: 138, texto: "Tenho ambição clara de crescer continuamente na hierarquia corporativa.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Esforço para Realização", invertido: false },
  { id: 139, texto: "Não me interesso por assumir responsabilidades extras voluntariamente.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Esforço para Realização", invertido: true },
  { id: 140, texto: "Busco superar expectativas e entregar mais valor do que o contratado.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Esforço para Realização", invertido: false },

  // Faceta 5: Autodisciplina (141 a 145)
  { id: 141, texto: "Persisto em tarefas burocráticas ou cansativas até finalizá-las por completo.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Autodisciplina", invertido: false },
  { id: 142, texto: "Costumo procrastinar e adiar o início de projetos até a última hora.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Autodisciplina", invertido: true },
  { id: 143, texto: "Mantenho o foco prolongado sem me distrair com redes sociais ou conversas.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Autodisciplina", invertido: false },
  { id: 144, texto: "Desisto com facilidade de rotinas quando elas se tornam monótonas.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Autodisciplina", invertido: true },
  { id: 145, texto: "Tenho força de vontade comprovada para cumprir cronogramas exigentes.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Autodisciplina", invertido: false },

  // Faceta 6: Deliberação (146 a 150)
  { id: 146, texto: "Penso cuidadosamente em todas as consequências possíveis antes de agir.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Deliberação", invertido: false },
  { id: 147, texto: "Ajo pelo instinto inicial sem avaliar impactos colaterais.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Deliberação", invertido: true },
  { id: 148, texto: "Analiso dados e cenários comparativos antes de bater o martelo.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Deliberação", invertido: false },
  { id: 149, texto: "Tomo decisões arriscadas sem calcular detalhadamente a margem de erro.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Deliberação", invertido: true },
  { id: 150, texto: "Sou criterioso e prudente em compromissos contratuais e financeiros.", bloco: "BIG_FIVE", fator: "CONSCIENCIOSIDADE", faceta: "Deliberação", invertido: false },

  // =========================================================================
  // 6. BLOCO DISC (Itens 151 a 210) - 4 Fatores x 15 Itens
  // =========================================================================
  // Dominância (D - 151 a 165)
  { id: 151, texto: "Busco o controle e a liderança direta de situações operacionais difíceis.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 152, texto: "Foco obstinadamente na superação de metas e resultados numéricos.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 153, texto: "Sinto-me motivado diante de desafios competitivos e grandes barreiras.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 154, texto: "Tomo decisões rápidas e pragmáticas, mesmo com escassez de dados.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 155, texto: "Confronto abertamente ideias e posicionamentos contrários às metas.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 156, texto: "Não hesito em cobrar agilidade e postura combativa da equipe.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 157, texto: "Assumo riscos calculados para conquistar posições de mercado.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 158, texto: "Prefiro direcionar e delegar a executar tarefas operacionais rotineiras.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 159, texto: "Fico impaciente com lentidão, rodeios ou desculpas operacionais.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 160, texto: "Mantenho foco implacável no objetivo final, contornando qualquer burocracia.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 161, texto: "Tenho perfil naturalmente pioneiro em novos negócios e iniciativas.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 162, texto: "Posso soar enérgico demais ao demandar urgência dos meus pares.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 163, texto: "Gosto de ter autonomia irrestrita para conduzir minha divisão.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 164, texto: "Desafio processos tradicionais que emperram o ritmo dos negócios.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },
  { id: 165, texto: "A liderança pelo exemplo prático e firme é minha principal marca.", bloco: "DISC", fator: "DOMINANCIA", invertido: false },

  // Influência (I - 166 a 180)
  { id: 166, texto: "Convenço e me comunico com facilidade e empatia com qualquer público.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 167, texto: "Adoro criar e expandir redes de contatos e relacionamentos interpessoais.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 168, texto: "Transmito entusiasmo, energia contagiante e inspiração para o time.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 169, texto: "Tenho facilidade para vender ideias, projetos e novos conceitos executivos.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 170, texto: "Gosto de atuar em ambientes colaborativos onde a comunicação seja fluida.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 171, texto: "Utilizo o bom humor e a persuasão positiva para destravar impasses.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 172, texto: "Sinto-me estimulado por reconhecimento público e aplauso pelo meu trabalho.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 173, texto: "Construo pontes de confiança sólidas entre setores que não conversavam.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 174, texto: "Gosto de apresentações vibrantes e eventos de alinhamento com toda a empresa.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 175, texto: "Valorizo o clima organizacional agradável tanto quanto as metas numéricas.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 176, texto: "Integro novas pessoas à equipe de forma rápida e descontraída.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 177, texto: "Prefiro reuniões dinâmicas e brainstorming a relatórios estatísticos frios.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 178, texto: "Tenho carisma e facilidade para engajar parceiros estratégicos.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 179, texto: "Falo com expressividade corporal e riqueza de metáforas motivadoras.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },
  { id: 180, texto: "Estimulo o espírito de equipe através de celebrações e reconhecimento constante.", bloco: "DISC", fator: "INFLUENCIA", invertido: false },

  // Estabilidade (S - 181 a 195)
  { id: 181, texto: "Prefiro ambientes de trabalho previsíveis, seguros, harmônicos e constantes.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 182, texto: "Sou um ouvinte paciente, leal e empático para com meus colegas.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 183, texto: "Mantenho excelente desempenho em tarefas consistentes de longo prazo.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 184, texto: "Fico desconfortável com mudanças bruscas e sem planejamento prévio.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 185, texto: "Trabalho muito bem apoiando bastidores e garantindo a continuidade do negócio.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 186, texto: "Sou considerado uma presença pacificadora e confiável na equipe.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 187, texto: "Gosto de finalizar uma tarefa com calma antes de assumir outra responsabilidade.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 188, texto: "Demonstro lealdade firme à liderança e às diretrizes da empresa.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 189, texto: "Evito rivalidades e cultivo relações profissionais duradouras.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 190, texto: "Tenho alta tolerância para rotinas repetitivas que demandem persistência.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 191, texto: "Prefiro receber instruções claras e detalhadas antes de iniciar um trabalho.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 192, texto: "Dedico-me com serenidade a apoiar meus liderados em momentos de dificuldade.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 193, texto: "Costumo resistir a inovações que pareçam arriscar a segurança do time.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 194, texto: "Sou pontual e previsível na entrega dos meus compromissos.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },
  { id: 195, texto: "Construo uma base estável sobre a qual a empresa pode crescer com segurança.", bloco: "DISC", fator: "ESTABILIDADE", invertido: false },

  // Conformidade / Cautela (C - 196 a 210)
  { id: 196, texto: "Busco a perfeição técnica, a acurácia e a precisão nos mínimos detalhes.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 197, texto: "Sigo normas, regulamentos, checklists e procedimentos operacionais à risca.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 198, texto: "Tomo decisões alicerçadas em dados consolidados, evidências e fatos.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 199, texto: "Identifico inconsistências e erros em relatórios com muita agilidade.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 200, texto: "Prefiro planejar minuciosamente antes de autorizar qualquer execução prática.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 201, texto: "Exijo alto padrão de qualidade tanto de mim mesmo quanto de fornecedores.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 202, texto: "Mantenho postura analítica, questionadora e prudente em projetos críticos.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 203, texto: "Documento e registro todas as etapas de processos para fins de auditoria.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 204, texto: "Evito expressar opiniões pessoais sem respaldo estatístico ou empírico.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 205, texto: "Sou cauteloso ao lidar com orçamentos e prazos complexos.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 206, texto: "Prezo pela conformidade legal, governança e conformidade regulatória.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 207, texto: "Reviso meu trabalho múltiplas vezes para garantir erro zero.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 208, texto: "Fico desconfortável em ambientes onde impera o improviso amador.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 209, texto: "Desenvolvo métodos lógicos que reduzem a variabilidade de processos.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },
  { id: 210, texto: "Garantir a integridade metodológica das entregas é minha prioridade número um.", bloco: "DISC", fator: "CONFORMIDADE", invertido: false },

  // =========================================================================
  // 7. ESCALA DE VALIDADE E CONTROLE DE RESPOSTA (Itens 211 a 240) - 30 Itens
  // =========================================================================
  // Desejabilidade Social / Escala L (211 a 220) - 10 Itens
  { id: 211, texto: "Nunca menti em toda a minha vida, nem mesmo para ser educado.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 212, texto: "Jamais senti raiva, ciúmes ou inveja de ninguém em momento algum.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 213, texto: "Nunca me atrasei para qualquer compromisso ao longo de toda a minha carreira.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 214, texto: "Sempre cumpro todas as regras da sociedade com prazer e sem reclamação.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 215, texto: "Nunca falei mal de nenhum chefe, colega ou familiar pelas costas.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 216, texto: "Jamais cometi qualquer erro por menor que fosse em minha profissão.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 217, texto: "Nunca hesitei ou tive medo diante de um desafio.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 218, texto: "Amo todas as pessoas igualmente e com generosidade total.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 219, texto: "Nunca tomei uma decisão precipitada da qual tenha me arrependido.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },
  { id: 220, texto: "Tenho paciência absolutamente infinita e inabalável com qualquer ser humano.", bloco: "VALIDADE", fator: "DESEJABILIDADE", invertido: false },

  // Atenção / Infrequência (221 a 230) - 10 Itens
  { id: 221, texto: "Para confirmar sua atenção nesta questão, marque a opção 2 (Discordo Parcialmente).", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 222, texto: "Consigo voar sem auxílio de qualquer tipo de aparelho ou avião.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 223, texto: "Nesta afirmação, marque exatamente a opção 4 (Concordo Parcialmente) para validar o teste.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 224, texto: "Consigo respirar normalmente embaixo d'água sem nenhum equipamento.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 225, texto: "Para atestar leitura criteriosa, assinale a opção 1 (Discordo Totalmente).", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 226, texto: "Tenho mais de duzentos anos de idade.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 227, texto: "Neste item de checagem, selecione a opção 5 (Concordo Totalmente).", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 228, texto: "Nunca utilizei energia elétrica ou aparelhos eletrônicos em minha vida.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 229, texto: "Para confirmar que você está atento, marque a opção 3 (Neutro).", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },
  { id: 230, texto: "Consigo atravessar paredes de concreto sólido sem sofrer nenhum arranhão.", bloco: "VALIDADE", fator: "INFREQUENCIA", invertido: false },

  // Pares de Inconsistência - VRIN (231 a 240) - 5 Pares (10 Itens)
  // Par 1: Pareado com item 126 (Ordem)
  { id: 231, texto: "Sou extremamente metódico e organizado com meus instrumentos de trabalho.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 126 },
  // Par 2: Pareado com item 11 (Hostilidade)
  { id: 232, texto: "Irrito-me facilmente quando as coisas dão errado no escritório.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 11 },
  // Par 3: Pareado com item 41 (Assertividade)
  { id: 233, texto: "Gosto de tomar o controle da conversa e assumir a liderança natural.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 41 },
  // Par 4: Pareado com item 91 (Confiança)
  { id: 234, texto: "Costumo acreditar na boa índole das pessoas ao meu redor.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 91 },
  // Par 5: Pareado com item 141 (Autodisciplina)
  { id: 235, texto: "Levo minhas obrigações até o fim mesmo quando estou desmotivado.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 141 },
  // Par 6: Pareado com item 61 (Fantasia)
  { id: 236, texto: "Tenho imaginação rica e gosto de vislumbrar novas possibilidades.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 61 },
  // Par 7: Pareado com item 1 (Ansiedade)
  { id: 237, texto: "Sinto preocupação e tensão diante do desconhecido.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 1 },
  // Par 8: Pareado com item 152 (Dominância)
  { id: 238, texto: "Minha prioridade primordial é bater metas e entregar resultados palpáveis.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 152 },
  // Par 9: Pareado com item 166 (Influência)
  { id: 239, texto: "Comunico-me com facilidade e consigo persuadir meus interlocutores.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 166 },
  // Par 10: Pareado com item 196 (Conformidade)
  { id: 240, texto: "Prezo pela precisão rigorosa e atenção meticulosa aos detalhes técnicos.", bloco: "VALIDADE", fator: "VRIN", invertido: false, parVrinId: 196 },
];

export const LIKERT_OPTIONS = [
  { value: 1, label: "Discordo Totalmente", short: "1" },
  { value: 2, label: "Discordo Parcialmente", short: "2" },
  { value: 3, label: "Neutro / Não sei opinar", short: "3" },
  { value: 4, label: "Concordo Parcialmente", short: "4" },
  { value: 5, label: "Concordo Totalmente", short: "5" },
];
