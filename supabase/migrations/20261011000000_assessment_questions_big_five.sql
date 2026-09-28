-- Migration: Bloco 18 - Assessment Comportamental (Modelo Big Five / OCEAN)
-- Criação da tabela assessment_questions e inserção das 50 perguntas fixas

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id SERIAL PRIMARY KEY,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  factor CHAR(1) NOT NULL CHECK (factor IN ('E', 'M', 'C', 'N', 'A')),
  direction CHAR(1) NOT NULL CHECK (direction IN ('+', '-')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Leitura pública para candidatos responderem ao teste
CREATE POLICY "Public read for assessment questions"
  ON public.assessment_questions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Inserção das 50 perguntas validadas do Big Five
INSERT INTO public.assessment_questions (id, question_order, question_text, factor, direction) VALUES
  -- Fator E: Extroversão (10 itens)
  (1, 1, 'Sou o centro das atenções em eventos sociais e corporativos.', 'E', '+'),
  (2, 2, 'Puxo assunto facilmente com pessoas estranhas.', 'E', '+'),
  (3, 3, 'Sinto-me à vontade em assumir a liderança e direcionar grupos.', 'E', '+'),
  (4, 4, 'Tenho muita energia e gosto de estar rodeado de muita gente.', 'E', '+'),
  (5, 5, 'Falo bastante e de forma expressiva em reuniões.', 'E', '+'),
  (6, 6, 'Fico calado e reservado perto de pessoas desconhecidas.', 'E', '-'),
  (7, 7, 'Não gosto de chamar a atenção para mim.', 'E', '-'),
  (8, 8, 'Prefiro atividades solitárias ou bastidores a eventos em grupo.', 'E', '-'),
  (9, 9, 'Sinto-me esgotado após interagir com muitas pessoas seguidamente.', 'E', '-'),
  (10, 10, 'Tenho dificuldade ou desconforto em me expressar em público.', 'E', '-'),

  -- Fator M: Amabilidade (10 itens)
  (11, 11, 'Respeito e importo-me profundamente com os sentimentos alheios.', 'M', '+'),
  (12, 12, 'Faço as pessoas se sentirem à vontade no ambiente de trabalho.', 'M', '+'),
  (13, 13, 'Tenho empatia e gosto de ajudar colegas que estão com dificuldades.', 'M', '+'),
  (14, 14, 'Acredito que a maioria das pessoas tem boas intenções.', 'M', '+'),
  (15, 15, 'Sou conhecido por ser um bom ouvinte e conselheiro.', 'M', '+'),
  (16, 16, 'Posso ser frio, cínico e indiferente em algumas situações.', 'M', '-'),
  (17, 17, 'Não me importo muito com os problemas pessoais dos outros.', 'M', '-'),
  (18, 18, 'Em debates, prefiro vencer ou provar que estou certo do que evitar magoar alguém.', 'M', '-'),
  (19, 19, 'Desconfio frequentemente das intenções das pessoas.', 'M', '-'),
  (20, 20, 'Costumo fazer críticas duras que acabam ofendendo os outros.', 'M', '-'),

  -- Fator C: Conscienciosidade (10 itens)
  (21, 21, 'Estou sempre preparado, planejado e organizado.', 'C', '+'),
  (22, 22, 'Presto muita atenção aos detalhes em tudo que faço.', 'C', '+'),
  (23, 23, 'Concluo minhas tarefas rapidamente e respeito rigorosamente os prazos.', 'C', '+'),
  (24, 24, 'Sigo um cronograma ou método de trabalho com disciplina.', 'C', '+'),
  (25, 25, 'Sou extremamente exigente com a qualidade técnica das minhas entregas.', 'C', '+'),
  (26, 26, 'Deixo minhas tarefas espalhadas e meu ambiente de trabalho desorganizado.', 'C', '-'),
  (27, 27, 'Tenho dificuldade em manter o foco em tarefas longas ou repetitivas.', 'C', '-'),
  (28, 28, 'Costumo adiar o início de projetos importantes até o último minuto.', 'C', '-'),
  (29, 29, 'Fujo das minhas obrigações ou delego responsabilidades quando posso.', 'C', '-'),
  (30, 30, 'Cometo erros por distração ou pressa na execução.', 'C', '-'),

  -- Fator N: Estabilidade Emocional (10 itens)
  (31, 31, 'Permaneço calmo e focado mesmo sob forte pressão ou cobrança.', 'N', '+'),
  (32, 32, 'Sou relaxado e lido muito bem com o estresse do dia a dia.', 'N', '+'),
  (33, 33, 'Supero rapidamente os contratempos, críticas e frustrações.', 'N', '+'),
  (34, 34, 'Mantenho o raciocínio lógico em momentos de crise.', 'N', '+'),
  (35, 35, 'Sinto-me seguro e confiante na maioria das situações profissionais.', 'N', '+'),
  (36, 36, 'Fico estressado, tenso e irritado com muita facilidade.', 'N', '-'),
  (37, 37, 'Preocupo-me excessivamente com coisas que podem dar errado.', 'N', '-'),
  (38, 38, 'Tenho mudanças frequentes de humor dependendo do ambiente.', 'N', '-'),
  (39, 39, 'Sinto-me ansioso e inseguro quando a rotina muda inesperadamente.', 'N', '-'),
  (40, 40, 'Levo críticas muito para o lado pessoal e me ofendo com facilidade.', 'N', '-'),

  -- Fator A: Abertura à Experiência (10 itens)
  (41, 41, 'Tenho excelente imaginação e facilidade para ter ideias criativas.', 'A', '+'),
  (42, 42, 'Compreendo rapidamente conceitos complexos e teorias abstratas.', 'A', '+'),
  (43, 43, 'Gosto de testar novas tecnologias e métodos inovadores no trabalho.', 'A', '+'),
  (44, 44, 'Tenho um vocabulário rico e gosto de consumir conteúdos diversos.', 'A', '+'),
  (45, 45, 'Aprecio discussões estratégicas e visões de longo prazo.', 'A', '+'),
  (46, 46, 'Tenho dificuldade em entender ideias muito abstratas ou fora da minha rotina.', 'A', '-'),
  (47, 47, 'Prefiro seguir processos tradicionais e comprovados a arriscar novas formas de trabalhar.', 'A', '-'),
  (48, 48, 'Evito mudar a forma como sempre fiz as coisas.', 'A', '-'),
  (49, 49, 'Raramente procuro aprender conhecimentos técnicos que estejam fora da minha área de atuação.', 'A', '-'),
  (50, 50, 'Não me interesso por planejar o futuro, prefiro focar apenas na execução prática de hoje.', 'A', '-')
ON CONFLICT (id) DO UPDATE SET
  question_text = EXCLUDED.question_text,
  factor = EXCLUDED.factor,
  direction = EXCLUDED.direction;
