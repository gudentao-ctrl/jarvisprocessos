# Avaliação de Pessoas — rigor, consentimento e relatório integrado

## Objetivo
Evoluir a avaliação de pessoas usando como referência a profundidade visual e analítica dos dois laudos enviados, sem copiar conteúdo proprietário e sem afirmar equivalência a instrumentos psicológicos licenciados.

## O que será construído
- Criar uma etapa obrigatória antes do questionário com nome, e-mail, CPF, data de nascimento, instruções completas e aceite da Política de Privacidade.
- Permitir apenas um início por convite, registrar início/conclusão no servidor e retomar respostas salvas após atualização acidental da página.
- Manter os 240 itens já existentes, pois eles já cobrem cinco fatores, facetas, DISC e controles de validade; adicionar verificação de respostas repetitivas e retirar métricas artificiais.
- Proteger CPF, nascimento, respostas e resultado: o navegador público não terá acesso direto à lista de candidatos nem poderá alterar livremente um teste concluído.
- Reformular o relatório e PDF com: identificação e validade, síntese executiva, cinco fatores e facetas, estilo comportamental natural/adaptado, forças, motivadores observáveis, ambiente ideal, comunicação, riscos, desenvolvimento e perguntas para entrevista.
- Mostrar metodologia e limites de uso claramente: ferramenta interna de apoio, baseada em autorrelato, não substitui avaliação psicológica nem reproduz normas dos testes enviados.

## Segurança e confiabilidade
- Validar todos os dados no navegador e novamente no servidor.
- Usar o link individual como credencial de acesso, retornar ao candidato apenas os campos necessários e bloquear nova tentativa após o início.
- Calcular validade e resultados no servidor para não expor chaves de atenção e regras de pontuação.
- Não exibir percentis “normativos”, alfa de Cronbach, TRI ou precisão científica sem estudo amostral próprio; usar índices internos e faixas descritivas transparentes.

## Validação
- Testar o cadastro, aceite, início único, salvamento, retomada e conclusão em desktop e celular.
- Gerar um PDF real, converter as páginas em imagens e revisar cortes, sobreposições, acentos e legibilidade.
- Confirmar a compilação final e o funcionamento da prévia.

## Detalhes técnicos
- Nova evolução da tabela de candidatos para e-mail, versão/data do aceite, início e conclusão.
- Funções seguras para carregar convite, iniciar, salvar progresso e concluir a avaliação.
- O relatório continuará disponível somente na área autorizada do consultor.