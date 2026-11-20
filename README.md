# todo-notes — frontend

As quatro telas do todo-notes: login, a lista em três faixas de prioridade com arrastar e
filtros, o formulário de tarefa e as preferências de exibição.

Angular com Angular Material, `@angular/cdk/drag-drop` para o arrastar e estado em signals —
sem NgRx. **Zoneless**: não há `zone.js` nas dependências, e é por signal que a tela atualiza.
A estrutura é `core/` (sessão, interceptor, guardas, API e modelos), `pages/<tela>` e
`shared/`.

A API fica no seu próprio repositório, com linha de versão própria.

## Pilha

<!-- versoes:inicio -->

| Peça | Versão |
| --- | --- |
| Angular | 21.2.0 |
| Angular Material | 21.2.14 |
| Angular CDK | 21.2.14 |
| TypeScript | 5.9.2 |
| Vitest | 4.0.8 |

<!-- versoes:fim -->

A tabela acima é escrita pelo `.github/scripts/versoes-readme.mjs`, que a lê do
`package.json` — não edite à mão. O CI confere com `--conferir`.

## Desenvolvimento

```
npm install
npm start
```

A tela abre em `http://localhost:4200`. O `proxy.conf.json` manda `/api` para a
`localhost:8080`, então **o backend precisa estar no ar** para login, lista e tudo o mais.

O proxy tem uma consequência que vale saber: em desenvolvimento o navegador vê as duas pontas
na mesma origem, e o CORS do backend não é exercitado. A configuração `CORS_ORIGENS` só passa
a valer num deploy em que frontend e API estejam em domínios diferentes.

## Testes

```
npm test -- --watch=false
```

Vitest sobre jsdom, sem navegador e sem rede: quem responde às requisições é o
`HttpTestingController`. São 31 casos, e o que eles prendem é justamente o que o navegador não
mostra — a expiração da sessão, o `localStorage` indisponível, o `401` que encerra a sessão e
o que **não** encerra na rota de login, e os seis estados da regra do arrastar.

## Build

```
npm run build
```

A configuração de produção é a que tem os orçamentos de tamanho: 500kB de aviso e 1MB de erro
no bundle inicial.

## Versões

Versão deste repositório:

<!-- x-release-please-start-version -->
0.0.0
<!-- x-release-please-end -->

Quem escreve essa linha, a versão do `package.json`, as tags e o `CHANGELOG.md` é o
`release-please`, a partir das mensagens de commit — nunca a mão. O primeiro merge do PR de
release cria a `v0.1.0`.

Antes do 1.0.0 não existe patch: `feat` e `fix` sobem a minor, e a release não sai a cada
`feat` — o PR fica aberto acumulando até haver mudança de impacto.

## Commits

Conventional Commits, descrição em português, imperativo presente, minúscula, sem ponto
final. **Assunto só em ASCII**; o corpo pode ter acento. Escopo é bounded context, não
camada, e a lista está em
[`.github/scripts/escopos-de-commit.txt`](.github/scripts/escopos-de-commit.txt).

Commit fora da convenção não quebra nada — ele só desaparece do CHANGELOG, sem aviso. Para
que isso não passe batido:

```
.github/scripts/conferir-commits.sh
```

É o mesmo script que o CI roda, e nele não há linha de coautoria: o histórico diz o que mudou,
e a autoria do repositório é de uma pessoa só.

## Formatação

O `prettier` está configurado, mas o repositório **não** está limpo: `app.config.ts`,
`main.ts` e `tarefas.html` divergem desde antes de haver CI. Por isso o `--check` ficou fora
do CI — ele quebraria o build por formatação, não por código. Arrumar o resto e ligar a
conferência é uma tarefa de uma vez só, ainda não feita.

A especificação do projeto e o diário de execução ficam fora dos repositórios, por decisão:
descrevem o projeto inteiro e não pertencem nem ao backend nem ao frontend.
