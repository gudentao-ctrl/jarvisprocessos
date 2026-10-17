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

## Avaliação de Pessoas
- Dados pessoais, respostas e resultados de candidatos ficam somente no banco protegido; links públicos usam token e funções validadas para impedir exposição e repetição da tentativa.
- Relatórios de Pessoas só podem ser exibidos após conclusão real; nunca gerar escores de demonstração ou preencher resultados ausentes.
- Assessment demographics must come from the candidate record, with calendar age calculated by the shared assessment-age helper; this prevents fixed dates and divergent report ages.
- Assessment PDFs must use embedded Unicode fonts, paginated text, explicit protocol alerts and descriptive-scale labels; this preserves legibility and prevents unsupported normative claims.

## Access management
- Treat the versioned per-user, per-company permission matrix as the authorization source; enforce its tool and CRUD actions in both server functions and database policies so navigation controls are never the security boundary.

- Keep access editing exclusively on `/admin/permissoes`; the SuperAdmin overview links there instead of duplicating permission forms. This prevents legacy controls from conflicting with the granular matrix.
- Public assessment writes must revalidate invitation and candidate identity, use server-measured elapsed time and update only unfinished records; this prevents invitation-only tampering and duplicate completion.
- Pin audited transitive dependency versions with package overrides and use the official patched SheetJS distribution; registry-only scans cannot verify that distribution.
- Validate password-recovery redirects against explicit application origins in the shared URL helper; never trust all tenants of a shared hosting domain.
- Keep Google credentials and user tokens in service-role-only tables accessed through authenticated server-only helpers; shared document stores must never contain OAuth secrets.
- People modules persist through company-and-action-scoped database policies, never local data fallbacks; public surveys expose token-scoped definitions and validated transactional submissions only.
- Preserve answered survey question identities and semantics; delete surveys transactionally after authorization to avoid partial removal and foreign-key failures.
