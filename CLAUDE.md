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
  ProjectCalculator.tsx        Calculadora Detalhado: "carrinho" de itens (Divisória/Box/
                                Espelho) + resumo do item ativo + Total Geral do projeto
  SimplifiedCalculator.tsx     Calculadora Simplificado: vãos + card por modelo
  ProductCatalog.tsx           CRUD do catálogo de produtos (por modelo selecionado)
  ModeloCatalog.tsx            CRUD de modelos de divisória (usado na Simplificado)
  ModeloSelector.tsx           Dropdown de modelo (usado na Detalhado)
  VaoRow.tsx / VaoSimplesRow.tsx   Linha de vão (largura/altura/tipo) de cada calculadora
  EspelhoPecaRow.tsx           Linha de peça de espelho (largura/altura/quantidade) no item Espelhos
  AdicionarItemDialog.tsx      Modal "Adicionar Item": grade com TODOS os modelos + tipo/descrição
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
    utils.ts                    calcularPlanoDeCorte() — bin-packing 1D compartilhado (Tubo 2x2/Perfil U)
    slim.ts                     Fórmula Slim (10mm e 8mm — mesma fórmula, catálogo separado)
    miterglass.ts                Fórmula MiterGlass (modulada em peças de ~1m)
    sacada.ts                    Fórmula Sacada (vidro por cor + kit combinado por largura)
    box.ts                       Fórmula Box Padrão (preço fechado: medida frontal × pagamento)
    boxFlex.ts                   Fórmula Box Flex (m² + custo fixo + lucro + taxa 15%, sem catálogo)
    espelho.ts                   Fórmula Espelhos (m² com piso de 0,3m², modelo base/especial)
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

### Carrinho de Itens (Orçamento Detalhado)
Desde a reforma "Carrinho" (2026-09-01), o Orçamento Detalhado não é mais "um projeto =
um modelo = um cálculo" — é um **array de itens independentes**
(`OrcamentoDetalhadoDados.itens: ItemOrcamentoDetalhado[]`), cada um com seu próprio
`ambiente` (nome livre, ex. "Banheiro Suíte"), seu próprio `modeloId` e seu próprio
`inputs: ProjectInputs`. Um projeto real vira um orçamento só, com vários itens: uma
Divisória Slim pro banheiro, um Box Padrão pra outro banheiro, um Espelho pra sala —
cada um calculado pela sua própria estratégia e catálogo, sem se misturar.
- **`ProjectInputs` é o mesmo formato pros quatro tipos de item** (Divisória, Box, Box
  Flex, Espelho) — cada estratégia (`lib/calculators/`) só lê os campos que lhe
  interessam (ex.: Box lê só `medidaFrontalBox`/`tipoPagamentoBox`, ignora `vaos`).
  Evita um segundo formato de inputs por tipo e mantém o Strategy pattern intacto. O
  "tipo" de um item não é um campo separado — é **derivado do `modeloId`**: `"box"`,
  `"boxFlex"` e `"espelho"` são ids fixos e reservados (`MODELOS_FECHADOS` +
  `ehItemFechado()` em `lib/calculators/index.ts` — única fonte de verdade, usada pelo
  cálculo e pela UI); qualquer outro `modeloId` é tratado como Divisória.
- **RT (Reserva Técnica) não é mais por item** — é do **projeto inteiro**
  (`OrcamentoDetalhadoDraftStore.tipoRT`/`.valorRT`, nível do carrinho, não dentro de
  cada `inputs`). Aplicada **uma única vez**, sobre a soma de todos os itens (ver
  subseção RT abaixo).
- Estado no Zustand (`useOrcamentoDetalhadoDraft`, `lib/store.ts`): `itens[]`,
  `itemAtivoId` (qual item está sendo editado na tela), `tipoRT`/`valorRT` do projeto.
  Ações: `addItem(modeloId)`, `removeItem`, `duplicarItem` (cópia logo após o original,
  ids novos pra vãos/peças, vira o ativo), `renomearItem`, `trocarModeloItem`,
  `selecionarItem`, `setInputsItem`, `addVaoItem`/`updateVaoItem`/`removeVaoItem`,
  `addPecaEspelhoItem`/`updatePecaEspelhoItem`/`removePecaEspelhoItem` (todas com o `id`
  do item como primeiro parâmetro — não existe mais um `setInputs` global), `setRT`,
  `setDraft(dados: unknown)` (substitui o carrinho inteiro, usado só ao abrir um
  orçamento salvo em "Meus Orçamentos" — **normaliza o payload**, ver abaixo), `reset`.
  Sempre sobra pelo menos 1 item (`removeItem`) e pelo menos 1 peça por Espelho
  (`removePecaEspelhoItem`).
- **Normalização única de dados externos** (`normalizarDadosDetalhado()` +
  `normalizarInputsItem()`, exportadas de `lib/store.ts`): TODO dado que entra no
  rascunho vindo de fora — rascunho antigo no localStorage (via `merge()`) ou `dados` de
  um orçamento salvo no Supabase (via `setDraft()`) — passa pela mesma função. Ela
  reconhece o formato atual (`{ itens, tipoRT, valorRT }`) e o antigo "single-item"
  (um `ProjectInputs` direto, com `tipoRT`/`valorRT` dentro — o modelo não era salvo
  nesse formato, assume `"slim"`), faz backfill de todo campo novo com o padrão de
  `INPUTS_ITEM_INICIAL` (spread genérico — **ao criar um campo novo em `ProjectInputs`
  basta colocar o default lá**), migra o Espelho de medida única
  (`larguraEspelho`/`alturaEspelho`/`quantidade`) pra `pecasEspelho[]` e garante pelo
  menos 1 item. Antes desta função existir, `setDraft` jogava `dados` cru no estado e
  abrir um orçamento salvo no formato antigo quebrava a tela (`dados.itens` undefined).
- `lib/useCalculator.ts` reflete essa separação em duas funções: `calcularOrcamento`
  (um item, sem RT) e `calcularResumoCarrinho`/`useResumoCarrinho` (agrega todos os
  itens do carrinho — cada um pode usar um modelo/catálogo diferente — e só então
  aplica a RT do projeto).
- UI (`ProjectCalculator.tsx`): card "Itens do Orçamento" no topo (chips pra trocar de
  item ativo, com botões de duplicar e excluir — excluir pede `confirm()`; botão
  "Adicionar Item" abre o modal `AdicionarItemDialog` com **todos** os modelos
  cadastrados, cada um com badge de tipo e descrição da fórmula — é modal, não dropdown,
  de propósito: ver Armadilhas, seção 7); abaixo, formulário do item ativo (Vãos, ou
  Box, ou Box Flex, ou Espelhos, dependendo do `modeloId`); na coluna lateral, "Resumo
  do Item Ativo" (Agrupado/Separado, como antes, mas escopado a só um item) e "Total do
  Projeto" (lista clicável de todos os itens com o subtotal de cada um + RT + Total
  Geral + botão Salvar, que salva o carrinho inteiro). O `ModeloSelector` do cabeçalho
  só aparece na aba "Cadastro de Produtos" (ele escolhe qual catálogo está sendo
  editado, não o modelo do orçamento — na calculadora confundia).

### Vão
Um módulo/abertura da divisória: `largura`, `altura`, e (no Detalhado) um `tipo`:
`"Fixo" | "Porta de Abrir" | "Porta de Correr"`. Um projeto tem 1+ vãos, cada um
contribui pra área de vidro e pro cálculo estrutural. O Simplificado usa `VaoSimples`
(só largura/altura, sem tipo — o preço é por m² fechado, não importa o tipo).

### Modelo (Divisória Slim / Slim 8mm / MiterGlass / BlindGlass / Sacada / Box Padrão / Box Flex / Espelhos)
Cada modelo tem:
- Sua **própria fórmula estrutural** (Strategy pattern, `lib/calculators/`) — como
  vidro/perfis/tubos (ou preço fechado/composto, no caso do Box e do Box Flex) são
  calculados a partir dos inputs do item.
- Seu **próprio catálogo de produtos**, totalmente independente dos outros modelos
  (`useProductStore.productsByModelo[modeloId]`). Editar o preço da fechadura no Slim
  NUNCA afeta o preço da fechadura no MiterGlass. Um modelo novo criado pelo usuário
  nasce com catálogo vazio. **Exceção: Box Flex não lê o catálogo nenhum** — sua fórmula
  usa constantes fixas no código, ver "Fórmula Box Flex" abaixo; o catálogo dele em
  Cadastro de Produtos existe (herda as chaves genéricas do seed) mas é decorativo.
- Seu **valorM2** (usado só no Simplificado — Sacada, Box, Box Flex e Espelho têm isso
  como placeholder `0`, já que nenhum é precificado por m² fechado, ver seções abaixo).

Modelos-semente (`SEED_MODELO_IDS` em `lib/store.ts`): `slim`, `slim8mm`, `miterglass`,
`blindglass`, `sacada`, `box`, `boxFlex`, `espelho`. Usuário pode criar modelos novos
livremente (`ModeloCatalog.tsx`) — esses caem na estratégia de cálculo da Slim por
padrão (`obterEstrategia` faz fallback), até ganharem fórmula própria. **Importante**:
pra uma estratégia nova ficar de fato vinculada a um modelo, o `id` do modelo tem que
bater literalmente com a chave usada em `ESTRATEGIAS` (`lib/calculators/index.ts`) — um
modelo criado manualmente pela UI ganha um `crypto.randomUUID()` como id, então nunca vai
casar sozinho com uma estratégia nova. É por isso que Sacada, Box, Box Flex e Espelho
foram adicionados como modelos-semente (ids fixos `"sacada"`/`"box"`/`"boxFlex"`/
`"espelho"`), não como algo que o usuário criaria à mão. `"box"`, `"boxFlex"` e
`"espelho"` também são tratados como ids **reservados** pelo carrinho do Detalhado — é
assim que um item sabe renderizar o formulário certo (ver "Carrinho de Itens" acima).
**Box Flex é intencionalmente separado do Box Padrão** — ids, estratégias, catálogos e
fórmulas totalmente independentes, apesar do nome parecido; nunca compartilham código.

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

**Plano de Corte compartilhado** (`calcularPlanoDeCorte()`, `lib/calculators/utils.ts`)
— usado pelo Tubo 2x2 e pelo Perfil U do Slim e do MiterGlass (não pelo Perfil
Engenharia, que fica fora do escopo, soma linear simples). Bin-packing 1D First Fit
contra barras de 6m, com uma regra de negócio que a soma linear (`metragemTotal ÷ 6`,
`Math.ceil`) não tinha: **sobra menor que 2,00m é descartada como retalho assim que
aparece** — não fica disponível pros próximos cortes, mesmo que um corte *futuro* menor
ainda coubesse nela (a regra é sobre o tamanho da sobra no momento em que ela surge, não
uma otimização global do plano inteiro). Corte maior que a barra conta
`Math.ceil(corte / 6)` barras cheias sem sobra (emenda/barra especial na prática); corte
`<= 0` não consome barra. Essa regra de descarte é o que corrige o erro de negócio do
mundo real: a soma linear presumia 100% de reaproveitamento de qualquer sobra, por
menor que fosse, subestimando o consumo real de barras (relatado pelo usuário: 21
barras calculadas contra 24 reais numa obra).

**Fórmula Slim (10mm e 8mm — mesma fórmula, `lib/calculators/slim.ts`)**:
- Vidro = soma de `largura × altura` de cada vão.
- Estrutura em U invertido (laterais + topo, sem o vão de baixo):
  - `Fixo` / `Porta de Abrir`: as duas laterais (altura) + o topo (largura), tudo em
    Tubo 2x2.
  - `Porta de Correr`: só as duas laterais (altura) em Tubo 2x2 — o topo/trilho vira
    Perfil Engenharia (`largura`, soma linear simples, barras de 6m, fora do escopo do
    Plano de Corte).
- **Tubo 2x2 = Plano de Corte isolado por vão** (`planoCorteTubo2x2()` em `slim.ts`,
  delega pra `calcularPlanoDeCorte()`): diferente do Perfil U, o Tubo 2x2 não permite
  emenda — cada peça (lateral ou topo) tem que sair de uma única barra de 6m, inteira.
  Por isso o plano de corte roda **por vão isoladamente** — a sobra de um vão nunca é
  reaproveitada pelo próximo (cada vão é uma frente de corte separada, como na obra
  real) — e o total de barras do projeto é a SOMA das barras de cada vão, não um plano
  de corte único sobre a metragem total. Exemplo de referência (validado): vão Fixo de
  2,80m×1,00m → cortes [2,80; 2,80; 1,00] → a barra que sobrou 2,80m depois do primeiro
  corte fica com 0,40m, onde o topo de 1,00m não cabe → abre uma 2ª barra só pro topo →
  **2 barras (12m cobrados)**.
- **Perfil U = Plano de Corte único pro projeto inteiro** (não isolado por vão, porque
  permite emenda entre peças): os cortes de topo, base e as duas laterais de CADA vão
  (`[largura, largura, altura, altura]`) entram no mesmo plano de corte. Substituiu a
  soma linear (`perímetro total ÷ 6`) em 2026-09-03. Exemplo de referência (validado):
  3 vãos de 1×1m → 12 cortes de 1m → a soma linear ingênua diria 2 barras (12m/6m), mas
  o plano real precisa de **3**: depois do 5º corte de 1m numa barra a sobra vira
  exatamente 1,00m e é descartada na hora (mesmo cabendo mais um corte de 1m — a regra
  de descarte não faz lookahead).

**Fórmula MiterGlass (`lib/calculators/miterglass.ts`)** — modulada em peças de ~1m, não
usa tipo de vão (`usaTipoVao: false`). Múltiplos vãos = tratado como uma parede contínua:
`L` = soma das larguras, `H` = maior altura entre os vãos; área de vidro soma cada vão
individualmente.
- `peças = max(1, round(L))` — 1 peça a cada ~1m de largura.
- Tubo 2x2 = **topo** (`L`, um corte só) **+ verticais** (`peças + 1` cortes de altura
  `H` cada — as duas bordas externas + uma divisória entre cada peça), tudo no MESMO
  Plano de Corte (não isolado — MiterGlass já trata o projeto como uma parede contínua,
  não por vão). Fórmula da metragem corrigida em 2026-08-28 (ver Histórico); o cálculo
  de barras passou de soma linear pro Plano de Corte em 2026-09-03.
- Perfil U = cada peça emoldurada individualmente (2 cortes de `larguraPorPeça` + 2 de
  `H`) — os cortes de **todas** as peças entram no mesmo Plano de Corte (permite emenda
  entre peças, como no Slim). Substituiu a soma linear em 2026-09-03.
- Exemplo de referência (validado): 6,00m × 3,00m → 6 peças. Tubo = cortes [6 (topo),
  3×7 (verticais)] → **5 barras** (mesmo resultado da soma linear antiga: 27m/6m=5,
  porque os cortes redondos não geram retalho descartável aqui). Perfil U = 6 peças ×
  [1, 1, 3, 3] → **9 barras** (a soma linear ingênua diria 48m/6m=8 — a intercalação de
  cortes de 1m e 3m gera desperdício real que a divisão linear escondia; é exatamente o
  tipo de divergência que motivou a correção).

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
  6m (12m = dois kits de 6m). Vão com largura 0 (ainda não preenchido) **não tem kit**
  (`combinarKits(0)` devolve `[]`) — antes caía na faixa de 2m e cobrava R$2.080 por um
  vão vazio.
- **Kit em cor diferente (+15%)**: `inputs.kitCorDiferenteSacada` (checkbox em
  "Opcionais da Sacada") emite a linha "Kit em Cor Diferente (+15%)" com
  `custoKits × PERCENTUAL_KIT_COR_DIFERENTE` (0,15) — incide **só sobre a soma dos
  kits**, o vidro não entra na base. `grupo: "estrutural"`, como a Junção do Espelho
  (é um acréscimo sobre a estrutura, não uma ferragem).

**Fórmula Box Padrão (`lib/calculators/box.ts`)** — não usa vãos nem m² (`usaTipoVao:
false`, `usaCorVidro: false`): é **preço fechado**, cruzando "Medida Frontal"
(`inputs.medidaFrontalBox`, restrita às 8 opções da tabela — dropdown, não texto livre)
com "Tipo de Pagamento" (`inputs.tipoPagamentoBox`: `"vista" | "cartao"`). Cada uma das
16 combinações (8 medidas × 2 formas de pagamento) tem sua própria `ProductKey` no
catálogo (ex.: `box900Vista`, `box900Cartao`, ..., `box2200Cartao`) — os preços de
tabela são só o **valor inicial** desses produtos, totalmente editáveis depois em
Cadastro de Produtos, igual a qualquer outro preço do sistema. `OPCOES_MEDIDA_BOX`
(exportado do próprio `box.ts`) é a única fonte de verdade do mapeamento
medida→(keyVista, keyCartao) — usado tanto pelo cálculo quanto pelo dropdown da UI. Item
Box **não tem ferragens/opcionais universais** (puxador, fechadura, kits de porta...) —
só o preço de tabela, isolado exatamente como os opcionais da Sacada (ver
`lib/useCalculator.ts`, `ehItemFechado`).

**Fórmula Box Flex (`lib/calculators/boxFlex.ts`)** — não usa vãos nem tipo de vão
(`usaTipoVao: false`, `usaCorVidro: false`); recebe `inputs.larguraBoxFlex`/
`.alturaBoxFlex` (um par só) e `inputs.dobradicaAvulsa` (checkbox "Até o teto - Inclui
Dobradiça Avulsa"). **Totalmente separada do Box Padrão** — fórmula proprietária de
composição de custo, não preço de tabela por medida. Usa `inputs.quantidade` como
multiplicador de unidades idênticas (hoje é o único modelo que lê esse campo — o
Espelho passou a ter quantidade por peça).
- **Cascata fixa, nessa ordem exata**: `custoVidro = m² × R$180/m²` (m² = largura ×
  altura) → soma **Custo Fixo** de R$2.630 (Kit Padrão R$1.300 + Silicone R$30 + Lucro
  Operacional R$1.300, uma constante única, não 3 linhas separadas) → soma Dobradiça
  Avulsa se marcada (+R$550) → isso é o subtotal de UMA unidade → multiplica pela
  `quantidade` → **arredonda** (`Math.round`) esse subtotal geral → só então aplica a
  **Taxa NF e Cartão de 15%** sobre esse valor já redondo → total = subtotal geral + taxa.
  A ordem importa: a taxa incide sobre o subtotal geral (já multiplicado pela
  quantidade), nunca sobre o valor de uma unidade isolada.
- **Única estratégia do sistema que não usa `getValor`/catálogo** — os 4 números da
  fórmula (R$180, R$2.630, R$550, 15%) são constantes fixas em `boxFlex.ts`, decisão
  explícita (valores não editáveis pelo usuário comum). Nenhuma `ProductKey` nova existe
  pra ela.
- 4 `CalculoItem` sempre expostos no resumo (transparência pro vendedor): "Vidro Box
  Flex", "Kit Padrão, Silicone e Lucro", "Dobradiça Avulsa" (só se marcada) e "Taxa NF e
  Cartão (15%)" — todos `grupo: "estrutural"`, mesmo isolamento de ferragens/opcionais
  universais do Box Padrão (`ehItemFechado` em `lib/useCalculator.ts`). Quando
  `quantidade > 1`, cada `detalhe` avisa "já multiplicado por N un".

**Fórmula Espelhos (`lib/calculators/espelho.ts`)** — não usa vãos nem tipo de vão
(`usaTipoVao: false`, `usaCorVidro: false`); recebe `inputs.pecasEspelho: PecaEspelho[]`
— **várias peças de medidas diferentes num item só**, cada uma com `largura`, `altura` e
`quantidade` (peças idênticas àquela medida). Modelo/acabamento e adicionais são do
item, valem pra todas as peças (ver Pendências). `larguraEspelho`/`alturaEspelho`/
`quantidade` são o formato antigo (uma medida por item), mantidos como opcionais
`@deprecated` só pra `normalizarInputsItem` migrar pra 1 peça — e `pecasDoEspelho()`
ainda cai neles como fallback se um payload cru chegar sem `pecasEspelho`.
- **Uma linha de resumo por peça** ("Espelho #01 — Guardian 4mm — Lapidado", ou sem o
  "#" quando há só uma), com `detalhe` "N un × R$X (L×A = a m² [→ mín. 0,30] ×
  R$/m²)", subtotal `Math.round(unitário × quantidade)`.
- **Área mínima cobrada POR PEÇA**: `AREA_MINIMA_M2 = 0.3` — se `largura × altura <
  0.3m²`, aquela peça cobra como se fosse 0,3m² (`areaCobradaPeca()`); a quantidade
  multiplica por fora, não infla o piso. Helpers exportados e reusados pelos adicionais
  em `lib/useCalculator.ts`: `totalEspelhosDoItem()` (Σ quantidades) e
  `areaCobradaTotalEspelho()` (Σ área cobrada × quantidade).
- **Modelo Base × Modelo Especial**: `inputs.espelhoModeloBase` (uma das 9 chaves de
  `MODELOS_BASE_ESPELHO` — combinações de material+acabamento, ex. "Guardian 4mm —
  Bizote", preço por m²) é o padrão; se `inputs.espelhoModeloEspecial` também estiver
  setado (uma das 9 chaves de `MODELOS_ESPECIAIS_ESPELHO`, ex. "Orgânico c/ Led"), ele
  **anula** o base — é outro preço fechado por m², não uma soma dos dois.
- **Junção/Revestimento/Modelo**: `inputs.incluirJuncaoRevestimentoEspelho` soma +20%
  sobre a **soma dos subtotais base de todas as peças** (já arredondados) — não incide
  sobre os adicionais avulsos abaixo (são hardware itemizado à parte).
- **Adicionais** (só existem quando `modeloId === "espelho"`, mesmo isolamento da
  Sacada/Box — ver `lib/useCalculator.ts`): as quantidades informadas (Recorte CX de
  Luz R$/un, Chassis Perfil U R$/peça, Touch Screen R$/peça) são **por espelho** e o
  total cobrado é `qtdInformada × valor × totalEspelhosDoItem` (Σ quantidades de todas
  as peças); Desembaçador Elétrico (checkbox) é `R$/m² × areaCobradaTotalEspelho`
  (Σ área cobrada × quantidade, com o piso de 0,3m² por peça). Tudo com `Math.round`
  explícito na multiplicação.
- Todas as 22 `ProductKey` de Espelho (9 base + 9 especiais + 4 adicionais) são
  editáveis em Cadastro de Produtos, mesmo padrão do Box acima.

### Catálogo de Produtos (`ProductKey`)
Chaves fixas que o sistema sabe calcular automaticamente: as estruturais/universais
(`vidro`, `perfilU`, `tubo2x2`, `perfilEngenharia`, `puxadorH`, `fechadura`, `pelicula`,
`adicionalNoturno`, `portaPremium`, `laDeVidro`, `kitPortaSimples`, `kitPortaDupla`), as
da Sacada (`vidroSacadaIncolor`, `vidroSacadaVerde`, `kitSacada2m/3m/4m/6m`,
`artEngenheiro`, `caixaArCondicionado`, `respiroAluminio`), as do Box (16 chaves
`box{medida}{Vista|Cartao}`, ver "Fórmula Box Padrão" acima) e as do Espelho (22 chaves
`espelho*`, ver "Fórmula Espelhos" acima). Produtos cadastrados manualmente pelo usuário
sem uma dessas chaves (`key: null`) não entram no cálculo automaticamente — a menos que
tenham um `tipoVaoAssociado` (aí entram 1x por vão daquele tipo, ver
`lib/useCalculator.ts`). Todas as chaves-semente (incluindo as novas) são copiadas pra
**todo** modelo, mesmo os que não usam (ex.: Slim carrega as 38 chaves de Sacada/Box/
Espelho no catálogo sem usá-las) — é o mesmo comportamento que já existia antes (ex.:
MiterGlass sempre teve "Perfil Engenharia" no catálogo mesmo não usando). **Na tela**,
porém, o Cadastro de Produtos mostra por padrão só os produtos que entram no cálculo do
modelo selecionado (+ os manuais, `key: null`), com um botão "Mostrar todos (N)" pro
resto: a lista vem de `chavesCatalogoDoModelo(modeloId)` (`lib/calculators/index.ts`),
que junta `EstrategiaCalculoModelo.chavesCatalogo` (chaves da fórmula estrutural,
declaradas em cada estratégia) com as dos opcionais somados em `lib/useCalculator.ts`
(universais de divisória, Sacada, Espelho). É filtro de exibição, não afeta o dado nem
o cálculo. Pro Box Flex a lista é vazia e o card avisa que o catálogo não afeta o
cálculo. **Ao criar uma estratégia ou um opcional novo que leia uma `ProductKey`,
atualizar essa lista** — senão o produto some da tela do modelo (fica só em "Mostrar
todos").

### Ferragens e Opcionais (Detalhado)
Card em subgrupos visuais (`ProjectCalculator.tsx`, componente `GrupoFerragens`) — só
aparece quando o item ativo é uma **Divisória** (`modeloId` diferente de `"box"`/
`"espelho"`; Box não tem ferragens, e Espelho tem seus próprios "Adicionais do Espelho"
dentro do card "Espelho", ver "Fórmula Espelhos" acima): **Ferragens** (Puxador H,
Fechadura PT Correr), **Kits de Porta** (Porta Premium, Kit Porta Simples R$600/un, Kit
Porta Dupla R$920/un), **Acabamentos** (Película, Lã de Vidro — checkbox + preço
editável inline), **Serviços** (Instalação Noturna), e **Opcionais da Sacada** (Caixa Ar
Condicionado, Respiro Alumínio, ART Engenheiro) — esse último grupo **só renderiza
quando `itemAtivo.modeloId === "sacada"`**, e o cálculo espelha isso:
`lib/useCalculator.ts` só soma esses 3 itens (e só os inclui em `resultado.itens`)
dentro do mesmo `if (modeloId === "sacada")`. Pra qualquer outro modelo esses 3 itens
simplesmente não existem no orçamento — nem aparecem, nem contam pro total. A Reserva
Técnica **não mora mais aqui** — ver subseção abaixo.

**Reserva Técnica (RT) — Fixo vs Porcentagem, e do PROJETO INTEIRO no Detalhado**: desde
a reforma "Carrinho" (2026-09-01), a RT do Detalhado deixou de ser por item e passou a
ser do **projeto inteiro** (`OrcamentoDetalhadoDraftStore.tipoRT`/`.valorRT`, card "Total
do Projeto" na coluna lateral de `ProjectCalculator.tsx`, fora do form de qualquer item).
No Simplificado continua igual a antes: `SimplifiedInputs.tipoRT`/`.valorRT`. Em ambos,
toggle de dois botões (R$ / %, mesmo estilo segmented control da navegação do
`AppHeader`) ao lado do input de valor.
- `tipoRT: "fixo"` → `valorRT` é somado direto ao total, em R$.
- `tipoRT: "percentual"` → `valorRT` é uma porcentagem (0-100) aplicada sobre o total de
  tudo mais já somado (**nunca sobre si mesma**).
- **No Detalhado**: `calcularResumoCarrinho()` (`lib/useCalculator.ts`) soma o `.total`
  de **todos os itens do carrinho** primeiro (`totalGeralAntesDoRT`) — cada item pode
  usar um modelo/catálogo diferente — e só então aplica a RT do projeto **uma única
  vez** sobre essa soma (`valorRTCalculado`), chegando no `totalGeralFinal`. A RT não é
  mais um `CalculoItem` dentro de `resultado.itens` de item nenhum — vive só no
  `ResumoCarrinho`, mostrada no card "Total do Projeto" (com preview inline quando
  `tipoRT === "percentual"`, igual antes).
- **No Simplificado**: a RT continua **configurada uma vez só** (um tipo/valor global
  pra página inteira, no card "Comparador de Modelos"), mas **calculada
  individualmente por modelo** — cada card usa o próprio total
  (`custoBase + custoOpcionaisTotal`) como base do percentual, então o R$ da RT muda de
  card pra card mesmo com a mesma porcentagem configurada. Isso fica em
  `ResultadoSimplificadoItem.custoRT` (campo separado de `opcionais`/
  `custoOpcionaisTotal` porque o card do Simplificado não itera genericamente sobre
  `opcionais[]` — cada opcional tem sua própria UI curada à mão). Esse comportamento
  **não mudou** na reforma "Carrinho" — só o Detalhado virou carrinho, o Simplificado
  segue "single-shot" por design (compara modelos, não tem conceito de "itens").

**Agrupado vs Separado** (só Detalhado, escopado ao **item ativo**): o card "Resumo do
Item Ativo" tem um toggle que troca entre mostrar `resultado.itens` corrido (Agrupado,
padrão) ou dividido em duas listas por `item.grupo` com um subtotal cada — **Subtotal da
Divisória** (`resultado.subtotalEstrutural`) e **Subtotal de Opcionais**
(`resultado.subtotalOpcionais`) — mais o "Subtotal do Item" (`resultado.total`, sempre
visível no rodapé do card independente do modo; **não inclui mais a RT**, que agora só
existe no nível do projeto, ver acima). Esse `modoResumo` é estado local do componente
(não persiste no Zustand) — reseta pra Agrupado a cada F5/troca de item, de propósito,
pra não ser mais uma coisa pra migrar no `merge()`.

**Regra de arredondamento (Regra de Ouro)**: desde a reforma "Carrinho", o
arredondamento não é só na exibição — `calcularOrcamento()` (`lib/useCalculator.ts`)
aplica `Math.round()` em **cada `CalculoItem.subtotal`** no momento em que os itens são
montados, antes até de somar os subtotais agregados (`subtotalEstrutural`,
`subtotalOpcionais`, `total`) — então o sistema nunca mais trabalha com centavos em
nenhum item ou subtotal individual, a partir do core. `calcularResumoCarrinho()`
arredonda também o `valorRTCalculado` do projeto. Além disso, todo valor exibido
continua passando por `formatBRL()` (`lib/utils.ts`, também `Math.round`) — é
redundante com o arredondamento do core, mas intencional (dupla proteção, sem custo).
Regra de negócio explícita: qualquer novo subtotal ou valor exibido em R$ deve seguir
esse padrão, não formatar/arredondar na mão. Desde 2026-09-03 o Simplificado segue a
mesma regra: `calcularOrcamentoSimplificado()` arredonda base, cada opcional e a RT no
core, e o total é a soma das parcelas redondas — antes só arredondava na exibição e a
soma das linhas do card podia diferir do total mostrado em R$1.

### Orçamento Simplificado — opcionais por modelo + Comparador Seletivo
Diferente do Detalhado (ferragens globais), aqui cada modelo tem seus próprios opcionais
independentes (`SimplifiedInputs.opcionaisPorModelo`, chaveado por `modeloId`): Película,
Lã de Vidro, Porta Premium, Adicional Noturno. Ligar Película no MiterGlass não liga no
Slim.

**Comparador seletivo**: o Simplificado não mostra mais todos os modelos automaticamente
— um card "Comparador de Modelos" no topo da página (`SimplifiedCalculator.tsx`) tem um
painel de chips (um por modelo) que liga/desliga cada um da comparação. Só os
marcados aparecem na grade de cards abaixo. Implementado como **lista de exclusão**
(`SimplifiedInputs.modelosDesmarcados: string[]`), não de seleção — um modelo criado
depois entra automaticamente mostrado, sem precisar atualizar nada. `sacada`, `box` e
`espelho` começam nessa lista por padrão (ficam desmarcados), porque nenhum tem cálculo
por m² de verdade (`valorM2` é `0`) — o usuário pode reativar qualquer um a qualquer
momento, inclusive sozinho (desmarcando todo o resto), pra orçá-lo "solo" sem poluir a
comparação — isso já é comportamento natural de chips independentes, não precisou de um
modo "solo" à parte. `MODELOS_SEM_M2_RETROATIVOS` (`lib/store.ts`) é a lista dos ids
adicionados depois que já existiam usuários com rascunho salvo (hoje: `box`, `espelho`)
— o `merge()` sempre os une ao array persistido, pra não aparecerem de surpresa pra
quem já usava o Simplificado antes deles existirem (nunca reintroduz um id que o
usuário já tenha reativado, porque não dá pra ter removido da lista algo que ainda não
existia).

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
- Toda mudança de shape ao longo do tempo tem uma normalização cuidadosa que faz
  backfill de campos novos sem perder o que o usuário já tinha customizado. Pros dois
  rascunhos de orçamento ela é uma função exportada e **compartilhada entre o `merge()`
  (localStorage) e o `setDraft()` (payload `dados` do Supabase, que NÃO passa pelo
  merge)**: `normalizarDadosDetalhado()`/`normalizarInputsItem()` e
  `normalizarSimplifiedInputs()` em `lib/store.ts`. Nunca jogue um payload externo
  direto no estado sem passar por elas. **Ao adicionar um campo novo a
  `ProjectInputs`, basta pôr o default em `INPUTS_ITEM_INICIAL`** (spread genérico);
  em `SimplifiedInputs`/`Product`, atualizar a normalização/`merge()` correspondente —
  senão quem já tem dado salvo (local ou no banco) não ganha o campo novo e a tela pode
  quebrar num `undefined`. A do Detalhado é a mais delicada: reconhece o formato atual e
  o "single-item" pré-carrinho, e migra o Espelho de medida única pra `pecasEspelho[]` —
  ver "Carrinho de Itens" na seção 4.

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
├── dados          jsonb  (OrcamentoDetalhadoDados — o carrinho inteiro, itens[] + RT do
                    projeto — ou SimplifiedInputs completo, conforme `tipo`; o suficiente
                    pra recarregar o rascunho igualzinho ao abrir de novo)
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
- **Menu/dropdown `absolute` dentro de um `Card` fica escondido atrás do card seguinte.**
  O `Card` usa `backdrop-blur`, que cria um stacking context próprio — um `z-index` alto
  dentro dele não vale contra os irmãos, e o card seguinte (pintado depois) cobre o menu
  que "vaza" pra fora. Foi exatamente o bug do "Adicionar Item" (só os primeiros modelos
  apareciam). Regra: qualquer coisa que precise flutuar sobre outros cards vira modal
  (`components/ui/dialog.tsx`, `fixed` + `z-50`), como o `AdicionarItemDialog`.
- **Payload de orçamento salvo (`dados` do Supabase) nunca entra cru no estado** — passa
  por `normalizarDadosDetalhado()`/`normalizarSimplifiedInputs()` (ver seção 5). O
  `merge()` do Zustand só roda pro localStorage; quem esquece disso quebra a tela ao
  abrir um orçamento salvo antes de uma mudança de formato (já aconteceu com
  `dados.itens` e com `modelosDesmarcados`, ambos `undefined` em payloads antigos).
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
- Kits de Porta e os opcionais exclusivos da Sacada (ART, Caixa AC, Respiro) só existem
  no Detalhado — RT já foi estendida pros dois (ver seção 4). Não foi pedido estender o
  resto ainda, mas é uma assimetria a considerar se pedirem. Box e Espelho também só
  existem no Detalhado (não têm `valorM2` real, ver abaixo) — mesma assimetria.
- `valorM2` de Sacada, Box e Espelho está com placeholder `0` — não é um preço real, só
  existe porque todo `Modelo` precisa desse campo. Os três ficam desmarcados por padrão
  no Comparador do Simplificado por causa disso (ver seção 4), mas se o usuário
  reativar algum lá, o card dele vai mostrar "Base: R$0" até alguém colocar um valorM2
  de verdade em Modelos.
- A migração do formato "single-item" pro "carrinho" (`normalizarDadosDetalhado()`, ver
  seção 4) assume `modeloId: "slim"` pro item migrado, porque o modelo antigo vivia só
  no `useModeloStore` (fora do draft) e não dá pra recuperar com certeza. Vale tanto
  pro rascunho local quanto pra orçamentos **salvos** no Supabase nesse formato antigo
  (que agora abrem sem quebrar, mas chegam como Slim): quem salvou com outro modelo
  (MiterGlass, Sacada...) precisa reselecionar o modelo do item depois de abrir.
- No item Espelhos com várias peças, o Modelo/Acabamento, o Desembaçador, a Junção e as
  quantidades de Recorte/Chassis/Touch são do **item** (valem pra todas as peças; as
  quantidades "por espelho" multiplicam pelo total de espelhos do item). Peças com
  acabamento diferente ou com desembaçador só em algumas ainda precisam de itens
  separados — se isso incomodar, o próximo passo é levar esses campos pra dentro de
  `PecaEspelho`.
- A regra "Se for Espelho 4mm pequeno, o valor base fixo é R$700/m²" do briefing original
  foi interpretada como um exemplo ilustrativo da regra de área mínima (0,3m²), não como
  uma faixa de preço própria — nenhuma `ProductKey` dedicada foi criada pra ela. Se a
  intenção era outra (uma faixa de preço fixo separada pra espelhos 4mm pequenos),
  avisar que precisa ser ajustado em `lib/calculators/espelho.ts`.
- `supabase/migration_002_vendedor_codigo.sql` precisa ter sido rodada manualmente pelo
  usuário no Supabase pra "Meus Orçamentos" funcionar (colunas `codigo`/`nome_vendedor`).
- **Nada que envolve renderização de tela foi verificado ao vivo desde que o login virou
  obrigatório** (Sacada, toggle Agrupado/Separado, RT fixo/percentual nas duas
  calculadoras, Comparador Seletivo, Carrinho de itens + Box + Box Flex + Espelhos, e
  agora o modal "Adicionar Item", as peças múltiplas do Espelho, o +15% da Sacada, o
  catálogo filtrado por modelo e a abertura de orçamentos salvos antigos — tudo dos
  últimos commits). Só dá pra validar por `tsc`/`eslint`/`build` (limpos) e testes
  isolados da lógica pura (todos batendo). Testar de verdade na tela assim que existir
  uma conta — em especial o fluxo "Meus Orçamentos → Abrir" com um orçamento salvo em
  agosto (formato antigo).
- Inputs numéricos controlados (`value={n}` + `Number(e.target.value)`) não aceitam
  ficar vazios: apagar o campo mostra `0` na hora. Funciona (selecionar tudo e digitar
  substitui), mas é um atrito de digitação em todo o app. Trocar pra estado em string
  com parse no blur é uma melhoria de UX pendente, deliberadamente não feita nesta
  revisão por ser transversal (todos os inputs) e sem verificação ao vivo possível.

## 10. Histórico de Mudanças

> Entradas resumidas, mais recente primeiro. Não precisa repetir o que já está descrito
> nas seções acima — só registrar o quê e (se não-óbvio) o porquê.

- **2026-09-03** — Plano de Corte global com descarte de retalho < 2,00m (Tubo 2x2 e
  Perfil U), aplicado ao MiterGlass e ao Slim/Slim 8mm. Corrige um segundo erro de
  regra de negócio na mesma família do bug do Tubo 2x2 do Slim (ver entrada de
  2026-09-01 abaixo): a soma linear (metragem total ÷ 6, `Math.ceil`) — ainda usada no
  MiterGlass inteiro e no Perfil U do Slim — presumia que QUALQUER sobra, por menor que
  fosse, era 100% reaproveitável no próximo corte. Na obra real, um retalho pequeno
  demais é descartado — reportado pelo usuário como 21 barras calculadas contra 24
  reais numa obra com verticais de 2,68m.
  - Nova função utilitária `calcularPlanoDeCorte(cortes: number[], tamanhoBarra = 6)`
    em `lib/calculators/utils.ts` — bin-packing 1D First Fit com uma regra nova: toda
    sobra menor que `SOBRA_MINIMA_REAPROVEITAVEL_M` (2,00m) é descartada como retalho
    assim que aparece, não fica disponível pros próximos cortes (mesmo que um corte
    *futuro* menor ainda coubesse nela — a regra é sobre o tamanho da sobra no
    momento, não uma otimização global). Corte `> tamanhoBarra` continua contando
    `Math.ceil(corte / tamanhoBarra)` barras cheias sem sobra (mesma defesa já existente
    pro Tubo 2x2 do Slim); corte `<= 0` não consome barra.
  - **`lib/calculators/slim.ts`**: `planoCorteTubo2x2()` (isolado por vão, zero emendas)
    foi refatorado pra delegar pra `calcularPlanoDeCorte()` em vez da função local
    `barrasNecessarias()` (removida) — mesmo comportamento de antes, agora com a regra
    de descarte também. **Perfil U deixou de ser soma linear**: os cortes de topo, base
    e as duas laterais de CADA vão (`[largura, largura, altura, altura]`) entram num
    único plano de corte pro projeto inteiro (Perfil U permite emenda entre peças,
    diferente do Tubo 2x2 — por isso não é isolado por vão como ele).
  - **`lib/calculators/miterglass.ts`**: Tubo 2x2 (topo + verticais, já era um plano
    único pro "wall" contínuo) e Perfil U (2 cortes de `larguraPorPeça` + 2 de altura,
    por peça, todas as peças no mesmo plano) passam a usar `calcularPlanoDeCorte()` em
    vez de `Math.ceil(metragemTotal / 6)`.
  - Perfil Engenharia (Slim) fica **fora do escopo**, de propósito — continua soma
    linear simples, não foi pedido nem tem a mesma urgência de negócio.
  - Exemplos de referência recalculados (todos validados por script isolado): MiterGlass
    6,00×3,00m → Tubo continua 5 barras (cortes redondos, sem retalho descartado), mas
    Perfil U sobe de 8 para **9 barras** (a intercalação de cortes de 1m e 3m gera
    desperdício real que a divisão linear escondia). Slim: 3 vãos de 1×1m → Perfil U
    linear diria 2 barras (12m/6m), o plano de corte real precisa de **3** (depois do 5º
    corte de 1m numa barra a sobra vira exatamente 1,00m e é descartada na hora, mesmo
    cabendo mais um corte de 1m — é a regra "não fica pro futuro" fazendo exatamente o
    que devia). Cenário original do usuário (verticais de 2,68m): confirmado que cada
    par de 2,68m consome 1 barra inteira (sobra de 0,64m sempre descartada), sem exceção.
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado (`tsx`, 20 asserções):
    `calcularPlanoDeCorte` isolada (retalho exatamente 2,00m ainda reaproveitável,
    1,99m descartado, corte 0m ignorado, corte > barra), os dois exemplos de referência
    do MiterGlass, o cenário de 2,68m do usuário propagado no Slim, o caso dos 12 cortes
    de 1m no Perfil U do Slim, e zero centavos em todo subtotal mesmo com preços
    fracionados nos dois modelos — todos batendo. Dev server sobe sem erros; UI segue
    não verificada ao vivo (login).

- **2026-09-03** — Detalhamento por Vão no Orçamento Simplificado: cada card de modelo
  ganhou uma seção sanfonada ("Detalhamento por Vão", `<details>`/`<summary>` nativo,
  sem estado novo no React) listando "Vão N: X m² → R$Y" pra cada vão cadastrado,
  calculado com o `valorM2` **daquele modelo específico** (os vãos são globais da
  página, mas o preço por m² é por modelo — por isso o detalhamento mora dentro de cada
  card, não uma vez só no topo).
  - `lib/useSimplifiedCalculator.ts`: `custoBase` deixou de ser
    `Math.round(áreaTotal × valorM2)` e passou a ser a **soma** de
    `detalhamentoPorVao[].valor` (cada vão já `Math.round(áreaDoVão × valorM2)`
    individualmente). Não é só estética — arredondar por vão e depois somar, em vez de
    somar e arredondar uma vez, evita a divergência de R$1-2 entre a lista exibida e o
    Subtotal Base que os dois métodos podem produzir (ex. validado: 3 vãos com medidas
    quebradas fecham em R$8.653 somando por vão, contra R$8.654 se arredondasse só a
    área total — a Regra de Ouro exige que a lista bata exatamente com o total, então
    manter dois métodos diferentes não era opção).
  - `ResultadoSimplificadoItem.detalhamentoPorVao: DetalheVaoSimplificado[]`
    (`{ vaoId, largura, altura, area, valor }`) novo em `lib/types.ts` — `area` fica sem
    arredondar (é m², não dinheiro), só `valor` passa por `Math.round`.
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado (`tsx`) com 3 vãos de
    medidas propositalmente quebradas (2,88 / 1,36 / 4,87 m²): cada linha bate com o
    valor esperado, a soma das linhas fecha exatamente com `custoBase`, vão zerado e
    lista vazia não quebram, e o mesmo vão gera valores diferentes em modelos com
    `valorM2` diferente (Slim R$950/m² vs. MiterGlass R$1.270/m²) — confirma que o
    detalhamento é por modelo, não um dado global reaproveitado. Dev server sobe sem
    erros; UI segue não verificada ao vivo (login).

- **2026-09-03** — Revisão geral do projeto + 3 pedidos do usuário (Sacada +15%,
  Espelho multi-peças, "Adicionar Item" mostrando tudo). Bugs corrigidos:
  - **"Adicionar Item" só mostrava os primeiros modelos**: o menu era um `div absolute`
    dentro do card, e o `backdrop-blur` do `Card` cria stacking context — o card seguinte
    cobria o menu. Virou modal (`components/AdicionarItemDialog.tsx`) com todos os
    modelos, badge de tipo (Divisória/Box/Espelho) e descrição da fórmula. Armadilha
    registrada na seção 7.
  - **Abrir orçamento salvo antigo quebrava a tela**: `setDraft` do Detalhado fazia
    `dados.itens.length` (undefined no formato single-item de agosto) e o Simplificado
    fazia `modelosDesmarcados.includes` (undefined em saves pré-Comparador). Criadas
    `normalizarDadosDetalhado()`/`normalizarInputsItem()`/`normalizarSimplifiedInputs()`
    em `lib/store.ts`, usadas tanto pelo `merge()` quanto pelo novo `setDraft()` de cada
    store — `OrcamentosSalvos.tsx` passou a chamar `setDraft` (Simplificado ganhou o
    seu). Uma porta de entrada só pra dado externo (seção 5).
  - **Sacada cobrava kit de 2m pra vão com largura 0** (`combinarKits(0)` caía na
    primeira faixa) — agora vão sem largura não tem kit ("sem kit" no detalhe).
  - **Slim/plano de corte**: corte de 0m abria uma barra inteira (vão ainda não
    preenchido); peça maior que 6m era "encaixada" numa barra só com sobra negativa —
    agora corte ≤ 0 é ignorado e peça > 6m conta `ceil(corte/6)` barras sem sobra
    (exige emenda/barra especial na prática, melhor cobrar a mais que fingir).
  - **Simplificado sem Regra de Ouro**: base/opcionais/RT eram arredondados só na
    exibição, então a soma das linhas do card podia diferir do total mostrado em R$1.
    `calcularOrcamentoSimplificado` agora arredonda cada parcela no core e o total é a
    soma das parcelas redondas (mesma regra do Detalhado).
  Pedidos implementados:
  - **Sacada — "Kit em cor diferente (+15%)"**: `ProjectInputs.kitCorDiferenteSacada`
    (checkbox em "Opcionais da Sacada"); `lib/calculators/sacada.ts` emite a linha
    "Kit em Cor Diferente (+15%)" com `custoKits × 0.15` — **só sobre os kits, o vidro
    não entra** (`PERCENTUAL_KIT_COR_DIFERENTE`), `grupo: "estrutural"` como a Junção do
    Espelho.
  - **Espelhos com várias medidas num item só**: `ProjectInputs.pecasEspelho:
    PecaEspelho[]` (`{ id, largura, altura, quantidade }`, quantidade agora é POR PEÇA)
    substitui `larguraEspelho`/`alturaEspelho` (mantidos opcionais só pra migração —
    `@deprecated`). `lib/calculators/espelho.ts` emite uma linha por peça ("Espelho #01
    — …", piso de 0,3m² avaliado por peça) e a Junção +20% sobre a soma; os adicionais
    em `lib/useCalculator.ts` multiplicam pelo total de espelhos do item
    (`totalEspelhosDoItem`) e o Desembaçador pela área faturável total
    (`areaCobradaTotalEspelho`). UI: `EspelhoPecaRow.tsx` + botão "Adicionar Espelho";
    ações `addPecaEspelhoItem`/`updatePecaEspelhoItem`/`removePecaEspelhoItem` no
    store (sempre sobra 1 peça). Payloads antigos migram pra 1 peça automaticamente.
  Melhorias e facilidades:
  - `ehItemFechado()`/`MODELOS_FECHADOS` em `lib/calculators/index.ts` — regra única de
    "item fechado" (antes duplicada no cálculo e na UI).
  - **Cadastro de Produtos filtrado por modelo**: `EstrategiaCalculoModelo.chavesCatalogo`
    (novo campo obrigatório em cada estratégia) + `chavesCatalogoDoModelo()`; a tela
    mostra só o que entra no cálculo do modelo, com "Mostrar todos (N)"; Box Flex ganha
    um aviso de que o catálogo não afeta o cálculo dele (seção 4, "Catálogo").
  - **Duplicar item** (`duplicarItem`, ícone de cópia no chip) e `confirm()` antes de
    remover um item.
  - "Total do Projeto" lista todos os itens com subtotal (clicável pra editar).
  - `ModeloSelector` e o subtítulo com nome do modelo só aparecem na aba "Cadastro de
    Produtos" (`HomeContent.tsx`); na calculadora o subtítulo mostra a quantidade de
    itens no carrinho.
  - `nomeItemPadrao` chama Box Flex de "Box N" também.
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado com 44 asserções
    (Sacada +15% só no kit e vão 0; Espelho com 3 peças, piso por peça, junção sobre a
    soma, adicionais × total de espelhos, fallback legado; normalização dos formatos
    antigos de Detalhado e Simplificado, inclusive não reintroduzir Sacada reativada;
    Slim vão 0 e peça > 6m; Simplificado inteiro e fechando a soma; chaves de catálogo
    por modelo) — todos batendo. Dev server sobe sem erros; UI segue não verificada ao
    vivo (login).

- **2026-09-01** — Nova estratégia isolada **Box Flex** (`lib/calculators/boxFlex.ts`),
  modelo-semente com id fixo `"boxFlex"`, totalmente separado do Box Padrão (fórmula,
  estratégia e id diferentes — nunca compartilham código nem catálogo):
  - **Fórmula proprietária, cascata fixa**: `custoVidro = m² × R$180` (m² = largura ×
    altura do item) + `custoFixo = R$2.630` (Kit Padrão R$1.300 + Silicone R$30 + Lucro
    Operacional R$1.300, constante única) + Dobradiça Avulsa opcional (+R$550, checkbox
    "Até o teto - Inclui Dobradiça Avulsa") = subtotal de 1 unidade → multiplica pela
    `quantidade` do item (mesmo campo já usado pelo Espelho, reaproveitado aqui) →
    **arredonda** esse subtotal geral → só então aplica a Taxa NF/Cartão de 15% sobre
    esse valor já redondo (`Math.round` explícito antes da taxa, pra ela nunca nascer de
    uma dízima) → total do item = subtotal geral + taxa.
  - **Única estratégia do sistema que NÃO lê o catálogo de produtos**: os 4 valores da
    fórmula (R$180/m², R$2.630, R$550, 15%) são constantes fixas em `boxFlex.ts`, não
    `ProductKey`/`getValor` — decisão explícita do briefing ("valores base não devem ser
    editáveis pelo usuário comum"). Nenhuma `ProductKey` nova foi criada; o catálogo de
    Box Flex em Cadastro de Produtos mostra as mesmas chaves genéricas de todo modelo
    (herdadas do seed), mas nenhuma delas tem efeito no cálculo — puramente decorativo
    pra esse modelo específico.
  - 4 `CalculoItem` sempre transparentes no resumo: "Vidro Box Flex", "Kit Padrão,
    Silicone e Lucro", "Dobradiça Avulsa" (só quando marcada) e "Taxa NF e Cartão
    (15%)" — todos `grupo: "estrutural"` (mesmo tratamento do Box Padrão: item fechado,
    sem ferragens/opcionais universais de divisória, via `ehItemFechado` em
    `lib/useCalculator.ts`, que ganhou `"boxFlex"` na condição). Quando `quantidade > 1`,
    o `detalhe` de cada item avisa explicitamente "já multiplicado por N un".
  - `ProjectInputs` ganhou `larguraBoxFlex`, `alturaBoxFlex`, `dobradicaAvulsa` (boolean,
    fallback `false`) — `quantidade` já existia (feature anterior) e foi só reaproveitado.
    `INPUTS_ITEM_INICIAL` (`lib/store.ts`) ganhou os 3 campos novos com default seguro;
    como o `merge()` de `useOrcamentoDetalhadoDraft` já fazia (e continua fazendo) spread
    genérico `{ ...INPUTS_ITEM_INICIAL, ...inputsPersistidos }`, isso sozinho já
    backfilla `dobradicaAvulsa: false` (e as medidas) em rascunhos antigos no
    localStorage sem lógica nova de merge — mesmo mecanismo já usado pra `quantidade`.
  - Box Flex entra em `SEED_MODELO_IDS`/`SEED_MODELOS` (`valorM2: 0`, mesma ressalva de
    Sacada/Box/Espelho) e em `MODELOS_SEM_M2_RETROATIVOS`/`modelosDesmarcados` do
    Simplificado (desmarcado por padrão, com union retroativo no `merge()` — não existe
    cálculo por m² fechado de verdade pra ele).
  - UI (`ProjectCalculator.tsx`): card "Box Flex" condicional (Largura/Altura/Quantidade
    + checkbox de Dobradiça), aparece no lugar do card de Vãos/Box/Espelho quando o item
    ativo usa esse modelo; aparece também no menu "Adicionar Item" (lista genérica de
    `modelos`, nenhuma mudança de UI adicional precisou ser feita ali).
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado (`tsx`) cobrindo: caso
    simples (1un, sem dobradiça: R$2.810 + taxa R$422 = R$3.232), com dobradiça, com
    quantidade 3 (cada item multiplicado corretamente, taxa sobre o subtotal geral já
    multiplicado), m² com decimais feios (1,23×2,07 — confirma que a taxa nunca gera
    dízima, todo subtotal e o total saem inteiros), quantidade ausente/zero/negativa
    caindo pro piso de 1, e confirmação de que nenhum item universal de divisória
    (Puxador, Película...) vaza pro Box Flex — todos batendo.

- **2026-09-01** — Multiplicador de Quantidade no modelo Espelhos:
  - `ProjectInputs` ganhou `quantidade?: number` (opcional, fallback pra 1 em todo lugar
    que lê) — hoje só usado pelo Espelho, pra cotar N peças idênticas (mesma medida e
    acabamento) num item só do carrinho, em vez de duplicar o item várias vezes. Campo
    opcional de propósito: orçamentos abertos de "Meus Orçamentos" (Supabase) chamam
    `setDraft()` direto, sem passar pelo `merge()` do Zustand — então um payload salvo
    antes desse campo existir também precisa de um fallback seguro em runtime, não só no
    merge do localStorage.
  - `lib/store.ts`: `INPUTS_ITEM_INICIAL` ganhou `quantidade: 1` — como o `merge()` de
    `useOrcamentoDetalhadoDraft` já fazia (e continua fazendo) um spread genérico
    `{ ...INPUTS_ITEM_INICIAL, ...inputsPersistidos }` pra qualquer item antigo, isso já
    era suficiente pra backfillar `quantidade: 1` em rascunhos salvos no localStorage
    antes desse campo existir — nenhuma lógica nova de merge precisou ser escrita, só o
    valor padrão novo no objeto que o merge já espalha.
  - `lib/calculators/espelho.ts`: novo helper `quantidadeEspelho(inputs)` (exportado,
    sempre inteiro ≥ 1 — corrige/arredonda valor ausente, zerado, negativo ou
    fracionário). O subtotal estrutural (vidro base + Junção/Revestimento +20%) agora é
    `Math.round(subtotalUnitário × quantidade)`, com `detalhe` explícito no formato
    "N un × R$X (área × R$/m²)". A área mínima de 0,3m² continua avaliada POR UNIDADE
    (`areaCobradaEspelho`, inalterada) — a quantidade multiplica por fora, não infla o
    piso de nenhuma peça individual.
  - `lib/useCalculator.ts`: o bloco de Adicionais do Espelho (Desembaçador, Recorte CX
    de Luz, Chassis Perfil U, Touch Screen) também passou a multiplicar pela mesma
    `quantidadeEspelho(inputs)` — cada quantidade informada nesses campos já era "por
    peça de espelho" (ex.: "2 recortes"), então o total cobrado é
    `(valorUnitário × qtdInformada) × quantidadeDeEspelhos`, com `Math.round` aplicado
    na própria multiplicação (redundante com o arredondamento central de todo
    `CalculoItem.subtotal` que já existe ali, mas explícito de propósito). Esse arquivo
    precisou ser tocado porque os Adicionais do Espelho são calculados nele, não em
    `espelho.ts` (mesma separação estrutural/opcional já documentada na seção 4) — só o
    bloco `if (modeloId === "espelho")` foi alterado, nenhuma outra estratégia é afetada.
  - UI (`ProjectCalculator.tsx`): novo campo "Quantidade (un)" no card "Espelho", ao
    lado de Largura/Altura (grid próprio, `min={1}`).
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado (`tsx`) reproduzindo o
    exemplo de referência do briefing (3 espelhos de R$500 → R$1500, detalhe "3 un ×
    R$500,00"), quantidade ausente/zerada/negativa caindo pro piso de 1, opcionais por
    unidade multiplicados corretamente (2 recortes/espelho × 3 espelhos = 6 un), área do
    Desembaçador multiplicada pela quantidade, arredondamento inteiro em todo subtotal
    afetado, e o backfill do `merge()` simulado sobre um item sem o campo — todos
    batendo.

- **2026-09-01** — Correção do cálculo do Tubo 2x2 no modelo Slim
  (`lib/calculators/slim.ts`): a fórmula antiga somava as metragens linearmente e
  dividia por 6m (`Math.ceil(metragemTotal / 6)`), o que presume emendas/junções
  infinitas dentro da mesma peça — irreal pro Tubo 2x2 (só Perfil U e Perfil
  Engenharia, vendidos por metro corrido, podem ter emenda). Substituído por um
  algoritmo de **Plano de Corte** (`planoCorteTubo2x2()`): bin-packing 1D (First Fit)
  contra barras de 6m, **isolado por vão** (a sobra de um vão nunca é reaproveitada
  pelo próximo) e **sem emendas** (um corte nunca é dividido entre duas barras). Em
  projetos com vários vãos pequenos ou alturas próximas de submúltiplos de 6m, isso
  cobra mais barras do que a fórmula linear antiga (ela subestimava o consumo real).
  Só o Tubo 2x2 mudou — Perfil U e Perfil Engenharia continuam soma linear + `Math.ceil`
  (permitem emenda de verdade). Mudança isolada em `lib/calculators/slim.ts`
  (`lib/useCalculator.ts` não foi tocado — o arredondamento pra inteiro de cada
  `CalculoItem.subtotal` já é feito lá, de forma centralizada pra qualquer estratégia,
  desde a reforma "Carrinho" abaixo). Como Slim 8mm reusa a mesma estratégia da Slim
  10mm (`slim8mm: estrategiaSlim` em `lib/calculators/index.ts`), a correção vale pros
  dois automaticamente. Validado por `tsc`/`eslint`/`build` (limpos) + script isolado
  (`tsx`) reproduzindo o exemplo de referência do briefing (vão 2,80m×1,00m → 2 barras,
  12m cobrados) e casos de borda (Porta de Correr sem topo, isolamento entre vãos
  pequenos que juntos caberiam numa barra só mas são cortados separados, vão sem
  cortes) — todos batendo.

- **2026-09-01** — Reforma "Carrinho" do Orçamento Detalhado + módulos Box Padrão e
  Espelhos:
  - `useOrcamentoDetalhadoDraft` deixou de guardar um único `inputs: ProjectInputs` e
    passou a guardar `itens: ItemOrcamentoDetalhado[]` (cada um com `id`, `ambiente`,
    `modeloId`, `inputs`) + `itemAtivoId` + `tipoRT`/`valorRT` do **projeto inteiro**
    (RT saiu de dentro de `ProjectInputs` e subiu pro nível do draft/carrinho). Migração
    do formato antigo tratada com cuidado no `merge()` — ver seção 4 ("Carrinho de
    Itens") e seção 9 (Pendências) pro detalhe da limitação do `modeloId` migrado.
  - `lib/useCalculator.ts` ganhou `calcularResumoCarrinho()`/`useResumoCarrinho()`, que
    agregam todos os itens (cada um podendo usar um modelo/catálogo diferente) e só
    então aplicam a RT do projeto uma única vez sobre a soma — `calcularOrcamento()` (um
    item) não calcula mais RT nenhuma.
  - **Regra de Ouro do arredondamento**: `calcularOrcamento()` agora aplica
    `Math.round()` em cada `CalculoItem.subtotal` no próprio core, antes de agregar
    `subtotalEstrutural`/`subtotalOpcionais`/`total` — não é mais só arredondamento na
    exibição (`formatBRL`). `calcularResumoCarrinho()` arredonda também a RT do projeto.
  - Dois modelos-semente novos, **Box Padrão** (`lib/calculators/box.ts`) e **Espelhos**
    (`lib/calculators/espelho.ts`), ids reservados `"box"`/`"espelho"` — ambos com preço
    fechado/por m² vindo do catálogo (nunca hardcoded), seguindo o mesmo padrão da
    Sacada. Box: 16 `ProductKey` novas (8 medidas frontais × 2 formas de pagamento).
    Espelho: 22 `ProductKey` novas (9 modelos base + 9 especiais + 4 adicionais), área
    mínima cobrada de 0,3m², Modelo Especial anula o Base, +20% opcional de Junção/
    Revestimento/Modelo sobre o subtotal base do vidro. Ambos isolados de
    ferragens/opcionais universais de Divisória (mesmo isolamento já usado pela Sacada).
    Total: 38 `ProductKey` novas, todas com backfill retroativo no `merge()` de
    `useProductStore` e injetadas em todo modelo (mesmo padrão da Sacada).
    `SimplifiedInputs.modelosDesmarcados` ganhou `box`/`espelho` como padrão desmarcado
    (mesma razão da Sacada: sem `valorM2` real), com union retroativo no `merge()`.
  - `ProjectCalculator.tsx` reescrito: card "Itens do Orçamento" (chips + adicionar/
    remover item + trocar modelo/ambiente do item ativo), formulário condicional por
    tipo de item (Vãos / Box / Espelho), "Resumo do Item Ativo" (Agrupado/Separado
    escopado a um item) e "Total do Projeto" (RT do projeto + Total Geral + Salvar, que
    salva o carrinho inteiro). `OrcamentosSalvos.tsx` atualizado pro novo
    `OrcamentoDetalhadoDados` (era `ProjectInputs` direto).
  - Validado por `tsc`/`eslint`/`build` (limpos) + script isolado (`tsx`) cobrindo preços
    de Box (à vista/cartão, várias medidas), área mínima e Junção do Espelho, Modelo
    Especial anulando o Base, arredondamento inteiro em todo item, e agregação de RT do
    carrinho (fixo e percentual) sobre itens de **modelos diferentes** — todos batendo.
    Servidor dev sobe sem erros e o proxy/DAL seguem redirecionando corretamente pra
    `/login`; UI atrás do login segue não verificada ao vivo (ver Pendências).

- **2026-08-28** — Isolamento dos opcionais da Sacada, RT Fixo/Porcentagem, e
  Comparador Seletivo no Simplificado:
  - ART Engenheiro, Caixa Ar Condicionado e Respiro Alumínio agora só aparecem e só
    contam quando `modeloId === "sacada"` — antes eram universais (apareciam pra
    qualquer modelo). Ver `lib/useCalculator.ts` e o grupo condicional em
    `ProjectCalculator.tsx`.
  - RT ganhou um segundo modo: `ProjectInputs.tipoRT`/`SimplifiedInputs.tipoRT`
    (`"fixo" | "percentual"`). Em modo percentual, o valor é uma % aplicada sobre o
    total de tudo mais já somado — por isso a RT é sempre o último item calculado nas
    duas calculadoras (nunca incide sobre si mesma). Estendida pro Simplificado
    também: configuração global (um tipo/valor pra página), mas calculada por modelo
    (`ResultadoSimplificadoItem.custoRT`, novo campo).
  - Simplificado deixou de mostrar todos os modelos automaticamente: novo card
    "Comparador de Modelos" no topo com chips liga/desliga por modelo
    (`SimplifiedInputs.modelosDesmarcados`, lista de exclusão). Sacada começa
    desmarcada por padrão (não tem `valorM2` de verdade).
  - Validado por `tsc`/`eslint`/`build` + teste isolado da matemática de RT (fixo e
    percentual, incluindo casos com resultado quebrado tipo R$62,50, pra confirmar que
    só arredonda na exibição). Não verificado na UI (ver Pendências).
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
