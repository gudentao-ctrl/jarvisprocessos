<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Fluxo de Sincronização Automática com o Lovable
- **Sempre validar o build** (`npm run build`) antes de finalizar tarefas de código para garantir que o preview do Lovable não quebre.
- **Sempre realizar commit e push automático** (`git push origin main`) ao concluir qualquer alteração de código ou configuração.
- O usuário deve apenas abrir a interface do Lovable e clicar em "Publicar", sem necessidade de comandos git manuais.

## Matriz de Oportunidades
- Itens derivados dos fluxos guardam origem única; ao reverter uma aprovação, a ação é preservada e apenas desvinculada para evitar perda de trabalho.
