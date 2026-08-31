@AGENTS.md

# AutoCalculoConceito — Documentação do Sistema

> **Para qualquer IA (Claude ou outra) que abrir este projeto**: este arquivo é a fonte
> única de verdade sobre o que o sistema faz, como está estruturado, e por quê certas
> decisões foram tomadas. Leia isto inteiro antes de mexer em qualquer coisa.
>
> **Regra permanente**: toda vez que uma mudança relevante for feita no sistema (nova
> feature, mudança de arquitetura, correção de bug não-óbvio, nova dependência, mudança
> de schema no banco), **atualize este arquivo na mesma sessão** — a seção relevante
> (não só o Histórico no final). Um CLAUDE.md desatualizado é pior que nenhum, porque
> engana. Se não tiver certeza se algo é "relevante" o suficiente, é melhor anotar do
> que deixar passar.

## 1. Visão Geral

**AutoCalculoConceito** é um sistema interno de orçamentos para uma empresa de
**divisórias de vidro**. O dono (Gabriel) e sua equipe de vendedores usam para calcular
o preço de projetos de forma rápida e consistente, salvar orçamentos gerados, e
consultá-los depois. Não é um produto público — é uma ferramenta interna, de uso restrito
(login obrigatório, sem cadastro público).

O sistema tem duas formas de orçar, pensadas pra momentos diferentes da venda:

- **Orçamento Detalhado** (`/`): calcula material por material (vidro, perfis, tubos,
  ferragens) a partir dos vãos reais do projeto e de uma fórmula específica por modelo de
  divisória. Uso: quando se quer o preço técnico, engenheirado.
- **Orçamento Simplificado** (`/simplificado`): preço fechado por m², comparando lado a
  lado vários modelos ao mesmo tempo. Uso: cotação rápida pro cliente, sem entrar em
  detalhe de material.

Ambos permitem salvar o orçamento (com código, vendedor e cliente/empresa) e revisitar
depois em **"Meus Orçamentos"** (`/orcamentos`).

## 2. Stack Técnica

- **Next.js 16.3.3** (App Router, Turbopack) — **atenção**: esta versão tem mudanças que
  não batem com o treinamento de modelos de IA (ver `AGENTS.md`, importado no topo deste
  arquivo). Antes de usar qualquer API do Next, confira
  `node_modules/next/dist/docs/` primeiro. Exemplo real que já pegou: `middleware.ts` foi
  **descontinuado e renomeado pra `proxy.ts`** nesta versão (função exportada chama-se
  `proxy`, não `middleware`).
- **React 19**, **TypeScript** (strict).
- **Tailwind CSS v4** (config via CSS em `app/globals.css`, não `tailwind.config`).
- **Zustand** (`zustand/middleware persist`) — todo estado do lado cliente (rascunhos,
  catálogo de produtos, modelos) vive em localStorage via Zustand, não em banco.
- **Supabase** — dois usos bem separados:
  - **Auth** (login obrigatório, `@supabase/ssr`) — ver seção 6.
  - **Postgres** (só a tabela `orcamentos`, orçamentos salvos) — ver seção 5.
- **lucide-react** (ícones), **next-themes** (dark mode).
- Deploy: **GitHub → Vercel** (auto-deploy a cada push na branch `main`).

## 3. Estrutura de Pastas

```
app/
  page.tsx                    Server Component: checa login, renderiza HomeContent
  simplificado/page.tsx       idem, renderiza SimplificadoContent
  orcamentos/page.tsx         Server Component: checa login, busca lista do Supabase
  login/page.tsx              Client Component: form de login (sem cadastro público)
  api/orcamentos/route.ts     GET (listar) / POST (criar) — checa sessão antes de tudo
  api/orcamentos/[id]/route.ts GET (um) / DELETE — idem
  layout.tsx                  Root layout: fontes, ThemeProvider
  globals.css                 Tema (cores, fundo com grade, animação "reveal")

components/
  HomeContent.tsx              Conteúdo real da Detalhado (Client) — movido de app/page.tsx
  SimplificadoContent.tsx      Conteúdo real da Simplificado (Client)
  ProjectCalculator.tsx        Calculadora Detalhado: vãos + ferragens/opcionais + resumo
  SimplifiedCalculator.tsx     Calculadora Simplificado: vãos + card por modelo
  ProductCatalog.tsx           CRUD do catálogo de produtos (por modelo selecionado)
  ModeloCatalog.tsx            CRUD de modelos de divisória (usado na Simplificado)
  ModeloSelector.tsx           Dropdown de modelo (usado na Detalhado)
  VaoRow.tsx / VaoSimplesRow.tsx   Linha de vão (largura/altura/tipo) de cada calculadora
  SalvarOrcamentoDialog.tsx    Modal de salvar (cliente/empresa, vendedor, código)
  OrcamentosSalvos.tsx         Lista "Meus Orçamentos" (busca, abrir, excluir)
  AppHeader.tsx                Cabeçalho: nav, seletor de tema, e-mail logado + Sair
  LogoutButton.tsx             Botão de logout (client, chama supabase.auth.signOut)
  theme-toggle.tsx / theme-provider.tsx   Dark mode
  ui/                          Design system local: Button, Card, Input, Label, Checkbox,
                                Select, Tabs, Dialog — todos escritos à mão (sem shadcn/
                                radix instalado), estilo Tailwind direto

lib/
  types.ts                     Todos os tipos de domínio (Product, Vao, ProjectInputs...)
  store.ts                     Zustand: useProductStore, useModeloStore,
                                useOrcamentoDetalhadoDraft, useOrcamentoSimplificadoDraft
  useCalculator.ts              Cálculo do Detalhado: chama a estratégia do modelo +
                                soma ferragens/opcionais universais
  useSimplifiedCalculator.ts    Cálculo do Simplificado: área × valorM2 + opcionais por modelo
  calculators/                  Strategy pattern — uma fórmula estrutural por modelo
    types.ts                    Interface EstrategiaCalculoModelo
    slim.ts                     Fórmula Slim (10mm e 8mm — mesma fórmula, catálogo separado)
    miterglass.ts                Fórmula MiterGlass (modulada em peças de ~1m)
    sacada.ts                    Fórmula Sacada (vidro por cor + kit combinado por largura)
    index.ts                     obterEstrategia(modeloId) — fallback pra Slim se não mapeado
  dal.ts                        getUsuarioLogado() — única fonte de verdade sobre sessão
                                no servidor (cache() do React, usa getUser() não getSession())
  supabase/
    client.ts                   Cliente browser (Client Components — só login e logout)
    server.ts                   Cliente server (Server Components/Route Handlers — usa
                                cookies via next/headers)
    proxyAuth.ts                updateSession() — usado pelo proxy.ts pra renovar sessão
                                e redirecionar quem não está logado
  supabaseAdmin.ts               Cliente com a SECRET key (bypassa RLS) — só usado dentro
                                de Route Handlers/Server Components, NUNCA em código client
  utils.ts                       cn() (merge de classes) e formatBRL()

supabase/
  schema.sql                    Schema completo da tabela `orcamentos` (do zero)
  migration_002_vendedor_codigo.sql   Migração incremental (colunas codigo/nome_vendedor)

proxy.ts                        Roda em toda página (exceto /api, estáticos): redireciona
                                pra /login quem não está autenticado (checagem "otimista",
                                não é a única defesa — ver seção 6)
```

## 4. Conceitos de Domínio

### Vão
Um módulo/abertura da divisória: `largura`, `altura`, e (no Detalhado) um `tipo`:
`"Fixo" | "Porta de Abrir" | "Porta de Correr"`. Um projeto tem 1+ vãos, cada um
contribui pra área de vidro e pro cálculo estrutural. O Simplificado usa `VaoSimples`
(só largura/altura, sem tipo — o preço é por m² fechado, não importa o tipo).

### Modelo (Divisória Slim / Slim 8mm / MiterGlass / BlindGlass / Sacada)
Cada modelo tem:
- Sua **própria fórmula estrutural** (Strategy pattern, `lib/calculators/`) — como
  vidro/perfis/tubos são calculados a partir dos vãos.
- Seu **próprio catálogo de produtos**, totalmente independente dos outros modelos
  (`useProductStore.productsByModelo[modeloId]`). Editar o preço da fechadura no Slim
  NUNCA afeta o preço da fechadura no MiterGlass. Um modelo novo criado pelo usuário
  nasce com catálogo vazio.
- Seu **valorM2** (usado só no Simplificado — a Sacada tem isso como placeholder `0`,
  já que não é precificada por m² fechado, ver seção "Sacada" abaixo).

Modelos-semente (`SEED_MODELO_IDS` em `lib/store.ts`): `slim`, `slim8mm`, `miterglass`,
`blindglass`, `sacada`. Usuário pode criar modelos novos livremente (`ModeloCatalog.tsx`)
— esses caem na estratégia de cálculo da Slim por padrão (`obterEstrategia` faz
fallback), até ganharem fórmula própria. **Importante**: pra uma estratégia nova ficar
de fato vinculada a um modelo, o `id` do modelo tem que bater literalmente com a chave
usada em `ESTRATEGIAS` (`lib/calculators/index.ts`) — um modelo criado manualmente pela
UI ganha um `crypto.randomUUID()` como id, então nunca vai casar sozinho com uma
estratégia nova. É por isso que a Sacada foi adicionada como modelo-semente (id fixo
`"sacada"`), não como algo que o usuário criaria à mão.

### Estratégia de cálculo (Strategy pattern)
`lib/calculators/index.ts` mapeia `modeloId → EstrategiaCalculoModelo`. Cada estratégia:
- Recebe o **`ProjectInputs` inteiro** (não só `vaos`) e uma função `getValor(key)`
  (preço do produto pela `ProductKey`) — o objeto inteiro é passado porque algumas
  estratégias precisam de outros campos de projeto além dos vãos (ex.: Sacada lê
  `inputs.corVidroSacada`).
- Devolve uma lista de `CalculoItem` (label, detalhe, subtotal, **grupo**) — só a parte
  **estrutural** (vidro, perfis, tubos — sempre `grupo: "estrutural"`). Ferragens/
  opcionais universais (puxador, fechadura, película, porta premium, kits de porta, lã
  de vidro, adicional noturno, RT, ART, caixa de ar-condicionado, respiro) são somados
  **depois**, igual pra qualquer modelo, em `lib/useCalculator.ts`, sempre com
  `grupo: "opcional"`. Esse campo `grupo` é o que alimenta o toggle Agrupado/Separado do
  resumo (ver seção "Ferragens e Opcionais" e Passo 2 no Histórico).
- Tem uma flag `usaTipoVao`: se falso, o campo "Tipo do Vão" fica oculto no formulário
  — MAS `ProjectCalculator.tsx` força esse campo visível mesmo assim se algum produto do
  catálogo tiver `tipoVaoAssociado` setado (senão o vínculo nunca teria como funcionar).
- Tem uma flag `usaCorVidro`: se verdadeiro, mostra um seletor de cor do vidro (Incolor/
  Verde) no cabeçalho do card de Vãos. Hoje só a Sacada usa.

**Fórmula Slim (10mm e 8mm — mesma fórmula, `lib/calculators/slim.ts`)**:
- Vidro = soma de `largura × altura` de cada vão.
- Perfil U = perímetro total (`2×largura + 2×altura` de cada vão) → barras de 6m.
- Estrutura em U invertido (laterais + topo, sem o vão de baixo):
  - `Fixo` / `Porta de Abrir`: tudo em Tubo 2x2 (`2×altura + largura` por vão).
  - `Porta de Correr`: laterais em Tubo 2x2 (`2×altura`), topo/trilho em Perfil
    Engenharia (`largura`).

**Fórmula MiterGlass (`lib/calculators/miterglass.ts`)** — modulada em peças de ~1m, não
usa tipo de vão (`usaTipoVao: false`). Múltiplos vãos = tratado como uma parede contínua:
`L` = soma das larguras, `H` = maior altura entre os vãos; área de vidro soma cada vão
individualmente.
- `peças = max(1, round(L))` — 1 peça a cada ~1m de largura.
- Perfil U: cada peça emoldurada individualmente (`2×larguraPorPeça + 2×H`) × nº peças.
- Tubo 2x2 = **topo** (`L`, uma vez) **+ verticais** (`peças + 1` verticais de altura `H`
  cada — as duas bordas externas + uma divisória entre cada peça). Fórmula corrigida em
  2026-08-28 depois de bater com conta manual do usuário (ver Histórico) — antes só
  contava os verticais, esquecendo o tubo de cima.
- Exemplo de referência (validado): 6,00m × 3,00m → 6 peças, Tubo = 6 (topo) + 7×3 = 21
  (verticais) = 27m → 5 barras de 6m.

**Fórmula Sacada (`lib/calculators/sacada.ts`)** — não usa tipo de vão (`usaTipoVao:
false`), usa cor do vidro (`usaCorVidro: true`). Cada vão da Sacada é um módulo
independente (diferente do MiterGlass, aqui NÃO vira uma parede contínua):
- Vidro: soma `largura × altura` de cada vão × preço da cor escolhida —
  `vidroSacadaIncolor` (R$780/m²) ou `vidroSacadaVerde` (R$930/m²), conforme
  `inputs.corVidroSacada`. Cor é uma escolha única pro orçamento inteiro, não por vão.
- Kit: **cada vão calcula seu próprio kit (ou combinação de kits) pela LARGURA dele**,
  depois soma-se entre vãos. Tabela de faixas (`kitSacada2m/3m/4m/6m` no catálogo):
  até 2m → R$2.080 · até 3m → R$2.990 · até 4m → R$3.900 · até 6m → R$5.460.
  Acima de 6m: combina kits gulosamente — desconta um kit de 6m enquanto sobrar mais de
  6m, depois aplica a faixa certa no que restou. Ex. validado: vão de 7m = 1 kit de 6m
  (R$5.460) + 1 kit de até 2m pro 1m restante (R$2.080) = R$7.540. Lógica isolada e
  testada em `combinarKits()` — cobre também os limites exatos (2/3/4/6m) e múltiplos de
  6m (12m = dois kits de 6m).

### Catálogo de Produtos (`ProductKey`)
Chaves fixas que o sistema sabe calcular automaticamente: `vidro`, `perfilU`, `tubo2x2`,
`perfilEngenharia`, `puxadorH`, `fechadura`, `pelicula`, `adicionalNoturno`,
`portaPremium`, `laDeVidro`, `kitPortaSimples`, `kitPortaDupla`, `vidroSacadaIncolor`,
`vidroSacadaVerde`, `kitSacada2m`, `kitSacada3m`, `kitSacada4m`, `kitSacada6m`,
`artEngenheiro`, `caixaArCondicionado`, `respiroAluminio`. Produtos cadastrados
manualmente pelo usuário sem uma dessas chaves (`key: null`) não entram no cálculo
automaticamente — a menos que tenham um `tipoVaoAssociado` (aí entram 1x por vão daquele
tipo, ver `lib/useCalculator.ts`). Todas as chaves-semente (incluindo as novas) são
copiadas pra **todo** modelo, mesmo os que não usam (ex.: Slim carrega os kits de Sacada
no catálogo sem usá-los) — é o mesmo comportamento que já existia antes (ex.: MiterGlass
sempre teve "Perfil Engenharia" no catálogo mesmo não usando).

### Ferragens e Opcionais (Detalhado)
Card reorganizado em 5 subgrupos visuais (`ProjectCalculator.tsx`, componente
`GrupoFerragens`): **Ferragens** (Puxador H, Fechadura PT Correr), **Kits de Porta**
(Porta Premium, Kit Porta Simples R$600/un, Kit Porta Dupla R$920/un), **Acabamentos**
(Película, Lã de Vidro — checkbox + preço editável inline), **Serviços** (Instalação
Noturna), **Outros** (Reserva Técnica — RT, valor digitado livremente e somado direto ao
total, sem passar pelo catálogo; Caixa Ar Condicionado R$4.550/un com qtd.; Respiro
Alumínio R$780/m² com m² digitado manualmente, independente da área dos vãos; ART
Engenheiro R$450 fixo via checkbox).

**Agrupado vs Separado**: o card "Resumo do Orçamento" tem um toggle (dois botões estilo
segmented control, igual ao da navegação do `AppHeader`) que troca entre mostrar
`resultado.itens` corrido (Agrupado, padrão) ou dividido em duas listas por `item.grupo`
com um subtotal cada — **Subtotal da Divisória** (`resultado.subtotalEstrutural`, soma
dos itens `grupo: "estrutural"`) e **Subtotal de Opcionais**
(`resultado.subtotalOpcionais`, soma dos `grupo: "opcional"`) — mais o Total Final
(`resultado.total`, sempre visível no rodapé do card independente do modo). Esse
`modoResumo` é estado local do componente (não persiste no Zustand) — reseta pra
Agrupado a cada F5, de propósito, pra não ser mais uma coisa pra migrar no `merge()`.
**Regra de arredondamento**: todo valor exibido passa por `formatBRL()`
(`lib/utils.ts`), que já arredonda pra inteiro (`Math.round`, sem centavos) — isso é
regra de negócio explícita, qualquer novo valor exibido em R$ deve usar essa função, não
formatar na mão.

### Orçamento Simplificado — opcionais por modelo
Diferente do Detalhado (ferragens globais), aqui cada modelo tem seus próprios opcionais
independentes (`SimplifiedInputs.opcionaisPorModelo`, chaveado por `modeloId`): Película,
Lã de Vidro, Porta Premium, Adicional Noturno. Ligar Película no MiterGlass não liga no
Slim.

## 5. Persistência de Dados

Duas camadas **bem separadas** — não confundir:

### Client-only (Zustand + localStorage, nunca toca o Supabase)
- `useProductStore` — catálogo de produtos por modelo.
- `useModeloStore` — lista de modelos + qual está selecionado.
- `useOrcamentoDetalhadoDraft` / `useOrcamentoSimplificadoDraft` — o rascunho em
  andamento de cada calculadora (o que aparece na tela agora).
- Tudo isso é **por navegador/dispositivo**. Não sincroniza entre celular e PC, some se
  limpar o cache. `skipHydration: true` + `.persist.rehydrate()` manual em `useEffect`
  em cada página (evita mismatch de hidratação SSR — ver Armadilhas).
- Toda mudança de shape ao longo do tempo tem uma função `merge()` cuidadosa que faz
  backfill de campos novos sem perder o que o usuário já tinha customizado. **Ao
  adicionar um campo novo a `ProjectInputs`/`SimplifiedInputs`/`Product`, sempre
  atualizar o `merge()` correspondente em `lib/store.ts`** — senão quem já tem dado
  salvo local não ganha o campo novo.

### Supabase Postgres (só orçamentos SALVOS de propósito, via botão "Salvar Orçamento")
Tabela única `orcamentos` (schema em `supabase/schema.sql` + migrações incrementais em
`supabase/migration_00N_*.sql` — **rode cada migração nova no SQL Editor do Supabase
manualmente**, o Codex/Claude não tem a senha do Postgres, só as API keys):

```sql
orcamentos
├── id            uuid, PK
├── tipo           text  ("detalhado" | "simplificado")
├── codigo         text  (sugerido automaticamente: ORC-AAAAMMDD-HHMM, editável)
├── nome_vendedor  text
├── nome_cliente   text  (cliente ou empresa)
├── total          numeric (custo total no Detalhado; null no Simplificado — compara
                    vários modelos, não tem "um" total)
├── dados          jsonb  (ProjectInputs ou SimplifiedInputs completo — o suficiente pra
                    recarregar o rascunho igualzinho ao abrir de novo)
└── criado_em      timestamptz
```

RLS **ligado, sem nenhuma policy** — só a `service_role` (secret key, usada
exclusivamente em `lib/supabaseAdmin.ts`, só em código de servidor) consegue ler/
escrever. Mesmo que a anon key vaze, a tabela continua inacessível a partir dela.

Acesso: `app/api/orcamentos/*` (Route Handlers) e `app/orcamentos/page.tsx` (Server
Component, lista inicial) — todos usam `supabaseAdmin()` **depois** de confirmar sessão
via `getUsuarioLogado()`.

## 6. Autenticação (Supabase Auth)

Adicionado pra impedir acesso não autorizado ao sistema (era 100% aberto antes). Decisões
importantes:

- **Sem tela de cadastro público, de propósito.** Contas só são criadas manualmente pelo
  dono no painel do Supabase (Authentication → Users → Add user, com "Auto Confirm User"
  marcado). Isso é intencional — é a forma mais simples de garantir que só gente
  autorizada tenha login.
- **Duas camadas de defesa** (nunca confiar só numa):
  1. `proxy.ts` (roda em toda página, exceto `/api/*` e estáticos) — checagem
     "otimista", só lê/renova o cookie de sessão, redireciona pra `/login` quem não
     está autenticado. Rápido, mas não é a autoridade final (ver docs do Next.js sobre
     isso — Proxy não deve ser a única linha de defesa).
  2. Cada Route Handler (`app/api/orcamentos/*`) e Server Component protegido
     (`app/page.tsx`, `app/simplificado/page.tsx`, `app/orcamentos/page.tsx`) chama
     `getUsuarioLogado()` (`lib/dal.ts`) de novo, independentemente — devolve 401
     (API) ou `redirect("/login")` (página) se não autenticado. Essa é a checagem que
     realmente importa.
  - Rotas de API ficam **fora do matcher do proxy** de propósito: um redirect pra HTML
    confundiria quem chama `fetch()` esperando JSON. Por isso 401 em JSON ali, redirect
    nas páginas.
- `getUsuarioLogado()` usa `supabase.auth.getUser()`, não `getSession()` — `getUser()`
  revalida o token direto com o servidor do Supabase; `getSession()` só decodifica o
  cookie local, o que não é seguro pra autorização (é ok só pra UI, tipo mostrar o
  e-mail).
- **"Manter conectado"** (checkbox no login, `app/login/page.tsx`): controla o `maxAge`
  do cookie de sessão passado pro `createClient()` do browser
  (`lib/supabase/client.ts`) — marcado (padrão) = cookie de 30 dias; desmarcado = cookie
  de sessão (some ao fechar o navegador de vez).
- `AppHeader` recebe `userEmail` como prop vinda do Server Component da página (não
  busca no client via effect — evitaria o problema descrito na seção 7 sobre
  `set-state-in-effect`). Por isso `app/page.tsx` e `app/simplificado/page.tsx` viram
  Server Components finos que só checam sessão e passam pro Client Component real
  (`HomeContent.tsx` / `SimplificadoContent.tsx`).
- Logout: `components/LogoutButton.tsx`, client, chama `supabase.auth.signOut()` e
  redireciona pra `/login`.
- Não tem fluxo de "esqueci minha senha" implementado ainda — se precisar, o dono reseta
  manualmente pelo painel do Supabase por enquanto.

## 7. Padrões e Armadilhas Conhecidas (não repetir os mesmos erros)

- **Seletor Zustand nunca pode devolver array/objeto literal novo (`?? []`) direto** —
  gera uma referência nova a cada render, `useSyncExternalStore` acha que sempre mudou →
  loop infinito ("Maximum update depth exceeded"). Sempre usar uma constante estável em
  nível de módulo (ver `EMPTY_PRODUCTS` em `lib/store.ts`).
- **`react-hooks/set-state-in-effect` (ESLint deste projeto) é estrito** — flagra
  praticamente qualquer `setState` alcançável de dentro de um `useEffect`, mesmo via
  função async chamada de dentro dele (não só o padrão óbvio). Pra buscar dado inicial
  numa página protegida: busque no **Server Component** (direto, com `await`) e passe
  como prop pro Client Component — não faça fetch-then-setState num `useEffect` no
  client. Efeito só é o lugar certo pra **assinar** algo (ex.: `onAuthStateChange`,
  addEventListener) com cleanup, não pra buscar dado uma vez.
- **Diálogos nativos (`prompt()`, `confirm()`, `alert()`) travam automação de
  navegador** — CDP fica preso esperando o dialog nativo. `confirm()` ainda é usado (é
  síncrono e barato) pra confirmações simples, mas qualquer form com mais de 1 campo
  usa um modal de verdade (`components/ui/dialog.tsx` — desmontado/montado pelo pai via
  `{aberto && <Dialog>...}`, nunca recebe prop `open`, assim o estado interno sempre
  nasce limpo sem precisar de `useEffect` pra resetar).
- **`middleware.ts` foi renomeado pra `proxy.ts`** nesta versão do Next (16) — função
  exportada chama-se `proxy`, não `middleware`. Ver seção 2.
- **`cookies()` do `next/headers` é assíncrona** (`await cookies()`).
- Linha de comando `create-next-app .` falha com letra maiúscula no nome da pasta —
  scaffold numa pasta minúscula à parte e mova os arquivos.
- Se a tela travar/ficar branca durante teste no navegador automatizado, **feche a aba e
  abra outra** antes de assumir que é bug de código — HMR/WebSocket do Turbopack já
  travou o console do Chrome DevTools Protocol umas 2 vezes nesta sessão sem ter nada a
  ver com o código.
- Depois de `npm run build`, sempre parar o processo na porta 3000 antes de rodar
  `next dev` de novo (evita conflito com o `.next` gerado pelo build de produção).
- Git neste projeto (Windows) sempre avisa `LF will be replaced by CRLF` — é só o
  `autocrlf` do Git for Windows normalizando, não é erro.
- **Nunca** entrar senha/credencial de login por conta própria (nem via automação de
  navegador) — mesmo que o usuário peça. Isso vale pra criar contas do Supabase Auth: só
  o próprio usuário faz isso no painel.

## 8. Deploy e Infraestrutura

- **Repositório**: [github.com/GabrielMartinsFerreira/AutoCalculoProjetos](https://github.com/GabrielMartinsFerreira/AutoCalculoProjetos)
  (branch `main`).
- **Vercel**: projeto `auto-calculo-projetos` (time `Sistema CRM's projects`), domínio
  [auto-calculo-projetos.vercel.app](https://auto-calculo-projetos.vercel.app). Conectado
  ao GitHub — todo push em `main` dispara deploy automático.
- **Env vars** (mesmas no `.env.local` local e no painel da Vercel — ver
  `.env.local.example` pro template): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente + auth), `SUPABASE_SECRET_KEY` (só servidor,
  bypassa RLS — nunca `NEXT_PUBLIC_`, nunca em código client).
- **Projeto Supabase**: ref `wtdzdsxgebdumyuwvkql`.
- Sempre que uma mudança precisar de uma migração SQL nova (`supabase/migration_00N_*.sql`),
  **avisar explicitamente no fim da resposta** que precisa rodar no SQL Editor do
  Supabase — o deploy sobe o código, mas não roda migração nenhuma sozinho.

## 9. Pendências Conhecidas

- Sem fluxo de "esqueci minha senha" na UI (reset é manual, pelo painel do Supabase).
- Nenhum dos opcionais/campos exclusivos do Detalhado tem equivalente no Simplificado —
  Kits de Porta, RT, ART Engenheiro, Caixa Ar Condicionado, Respiro Alumínio, e a própria
  Sacada (Simplificado só tem Película/Lã de Vidro/Porta Premium/Adicional Noturno por
  modelo). Não foi pedido ainda, mas é uma assimetria a considerar se pedirem.
- `valorM2` da Sacada está com placeholder `0` — não é um preço real, só existe porque
  todo `Modelo` precisa desse campo. Se for usar Sacada no Simplificado, precisa de um
  valor de verdade lá (ou repensar se a Sacada faz sentido nessa tela — a lógica dela é
  bem diferente de "preço fechado por m²").
- `supabase/migration_002_vendedor_codigo.sql` precisa ter sido rodada manualmente pelo
  usuário no Supabase pra "Meus Orçamentos" funcionar (colunas `codigo`/`nome_vendedor`).
- **Sacada, RT, toggle Agrupado/Separado e os novos opcionais (Passo 1-3 de
  2026-08-28) foram validados por `tsc`/`eslint`/`build` e um teste isolado da lógica de
  combinação de kits — mas NÃO foram verificados na UI renderizada, porque o sistema
  agora exige login (ver seção 6) e não existe conta criada ainda. Testar na tela assim
  que houver uma conta.**

## 10. Histórico de Mudanças

> Entradas resumidas, mais recente primeiro. Não precisa repetir o que já está descrito
> nas seções acima — só registrar o quê e (se não-óbvio) o porquê.

- **2026-08-28** — Novo modelo/estratégia **Sacada** (`lib/calculators/sacada.ts`):
  vidro por m² com cor (Incolor R$780 / Verde R$930) + kit por largura do vão, com
  combinação gulosa de kits acima de 6m (ver seção 4). Novo campo **RT (Reserva
  Técnica)** — valor livre somado direto ao total, sem catálogo. Novos opcionais
  universais: ART Engenheiro (R$450 fixo), Caixa Ar Condicionado (R$4.550/un),
  Respiro Alumínio (R$780/m², m² digitado manualmente). `CalculoItem` ganhou o campo
  `grupo` ("estrutural" | "opcional") e `EstrategiaCalculoModelo.calcularEstrutura`
  passou a receber o `ProjectInputs` inteiro em vez de só `vaos` (pra Sacada conseguir
  ler a cor do vidro). `ResultadoCalculo` ganhou `subtotalEstrutural`/
  `subtotalOpcionais`, e o Resumo do Orçamento ganhou um toggle Agrupado/Separado pra
  mostrar esses subtotais separados. 9 `ProductKey` novas, todas com migração
  retroativa no `merge()` do `useProductStore`. Não verificado na UI (ver Pendências).
- **2026-08-28** — Sistema de login obrigatório com Supabase Auth (proxy.ts + DAL,
  "manter conectado", sem cadastro público). Ver seção 6.
- **2026-08-28** — Ferragens/Opcionais reorganizado em subgrupos; "Qtd. Fechaduras" →
  "Fechadura PT Correr"; novos opcionais Kit Porta Simples (R$600) e Kit Porta Dupla
  (R$920); `SalvarOrcamentoDialog` substitui o `prompt()` nativo, agora coleta
  cliente/empresa + vendedor + código do orçamento (sugerido automaticamente); "Meus
  Orçamentos" ganhou busca e mostra código/vendedor.
- **2026-08-28** — Correção da fórmula do Tubo 2x2 do MiterGlass: faltava somar o topo
  (só contava os verticais). Validado contra conta manual do usuário (6×3m → 27m → 5
  barras). Ver seção 4.
- **2026-08-28** — Persistência de orçamentos via Supabase (tabela `orcamentos`, RLS sem
  policy, acesso só via secret key no servidor). Página "Meus Orçamentos"
  (salvar/listar/abrir/excluir).
- **2026-08-28** — Deploy inicial: GitHub (AutoCalculoProjetos) → Vercel
  (auto-calculo-projetos.vercel.app).
- **Anterior** (sessões antes deste arquivo existir, reconstruído por contexto):
  projeto criado (Next.js + Tailwind v4 + Zustand), sistema de Orçamento Detalhado com
  cálculo por vão e catálogo de produtos, dark mode, redesign visual (referência
  `claude-cookbooks-main` — repo de docs/código da Anthropic, não tem assets de design;
  a inspiração foi o estilo técnico/minimalista: cyan/teal, mono pros dados, fundo com
  grade sutil), vínculo de produtos por tipo de vão, sistema de Modelos (Slim/Slim8mm/
  MiterGlass/BlindGlass) com catálogo de produtos independente por modelo, Orçamento
  Simplificado (preço fechado por m², múltiplos vãos somáveis, opcionais por modelo),
  Strategy pattern pra separar fórmula de cálculo por modelo, fórmula específica do
  MiterGlass (modulada em peças ~1m).
