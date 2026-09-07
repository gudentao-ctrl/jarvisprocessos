# JARVIS

Crie um módulo de Entrevistas Operacionais para uma plataforma de consultoria de processos chamada JARVIS.

O objetivo é capturar entrevistas em áudio, transcrever automaticamente e aplicar inteligência para estruturar o conteúdo em informações operacionais úteis para diagnóstico de processos.

🎨 IDENTIDADE VISUAL (OBRIGATÓRIO)

O sistema deve seguir rigorosamente a identidade visual:

 Cor primária: laranja

 Cor secundária: cinza claro

 Interface limpa, moderna e minimalista

 Alto contraste para uso em campo

 Foco em legibilidade e uso rápido

 Estilo corporativo de consultoria operacional

👉 Não usar outras cores como padrão principal da interface.

🎙️ 1. CAPTURA DE ENTREVISTA

O sistema deve permitir:

 gravação de áudio diretamente no navegador

 upload de áudio

 associação da entrevista a uma empresa e setor

 título da entrevista

 data

 participante (nome ou cargo)

Interface deve ser simples, mobile-first e otimizada para uso em reunião.

🧾 2. TRANSCRIÇÃO AUTOMÁTICA

Após captura:

 gerar transcrição automática do áudio

 exibir transcrição em tela editável

 permitir correções manuais

 manter histórico de edição

🧠 3. IA APLICADA NA TRANSCRIÇÃO

Após gerar a transcrição, o sistema deve aplicar IA para estruturar o conteúdo.

A IA deve analisar o texto e extrair apenas informações presentes na transcrição, organizando em categorias:

🟥 Dores

Problemas, dificuldades, reclamações e frustrações mencionadas.

🟨 Problemas operacionais

Falhas de processo, atrasos, retrabalho, ineficiências.

🔵 Decisões

Regras, critérios de aprovação e decisões citadas.

🟢 Fluxos de processo

Sequências de atividades (ex: comercial → PCP → produção).

⚙️ Sistemas citados

Ferramentas, sistemas, planilhas e meios de comunicação.

📊 4. SAÍDA ESTRUTURADA

Exibir resultado da IA em blocos:

 lista de dores

 lista de problemas operacionais

 lista de decisões

 lista de fluxos de processo

 lista de sistemas citados

Todos os itens devem ser editáveis manualmente.

🧠 5. RESUMO AUTOMÁTICO

Gerar automaticamente:

 resumo executivo da entrevista (máx. 10 linhas)

 principais insights operacionais

 pontos críticos identificados

📱 6. USABILIDADE (MOBILE-FIRST)

 interface otimizada para celular

 uso em entrevistas ao vivo

 botões grandes e acessíveis

 navegação simples e vertical

 foco em velocidade de captura e validação

 mínima complexidade de navegação

🎯 7. OBJETIVO DO MÓDULO

Transformar entrevistas em dados estruturados para análise de processos, identificação de causas sistêmicas e suporte à melhoria operacional.

⚙️ 8. REGRAS IMPORTANTES

 não inventar informações fora da transcrição

 IA apenas organiza e estrutura o conteúdo

 transcrição sempre editável

 sistema deve ser rápido e utilizável em campo

 não criar telas complexas desnecessárias

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jarvisprocessos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c5c75c62-6ee2-440a-a6d0-7d3597001f90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
