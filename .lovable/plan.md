# Login obrigatório para coleta e portal do cliente

## Objetivo
Proteger os links de coleta de indicadores e do portal executivo. O link continuará identificando a empresa/indicador, mas só abrirá após login de uma conta ativa vinculada àquela empresa e liberada pelo SuperAdmin para a ferramenta correta.

## Implementação
- Exigir sessão válida nas páginas `/c/{token}` e `/dashboard/{token}`; visitantes sem sessão irão para o login e retornarão ao mesmo link após entrar.
- Na coleta, validar no servidor que o usuário está ativo, pertence à empresa do indicador e possui a permissão **Indicadores**; SuperAdmin mantém acesso total.
- No portal, validar no servidor que o usuário está ativo, pertence à empresa do link e possui a permissão **Portal do cliente**; SuperAdmin mantém acesso total.
- Proteger também o envio da coleta e a abertura dos detalhes dos planos, evitando que chamadas diretas contornem a tela.
- Remover o uso anônimo privilegiado desses fluxos e registrar automaticamente o nome do usuário autenticado na coleta.
- Mostrar uma mensagem clara de acesso não liberado quando a conta não possuir a autorização necessária.

## Ajustes de navegação
- Preservar o endereço de destino no login, aceitando somente caminhos internos seguros.
- Após autenticar, retornar diretamente à coleta ou ao portal solicitado.

## Validação
- Conferir: usuário sem login, usuário de outra empresa, usuário sem permissão, cliente autorizado e SuperAdmin.
- Validar compilação e funcionamento em tela.

## Detalhes técnicos
- As leituras e gravações serão feitas por funções autenticadas, com validação de perfil, vínculo empresarial e permissão por ferramenta.
- O token continuará sendo necessário, mas deixará de funcionar como autorização isolada.
- O endpoint público de coleta deixará de aceitar lançamentos sem autenticação.
