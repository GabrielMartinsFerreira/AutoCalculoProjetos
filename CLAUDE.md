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
    box.ts                       Fórmula Box Padrão (preço fechado: medida frontal × pagamento)
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
- **`ProjectInputs` é o mesmo formato pros três tipos de item** (Divisória, Box,
  Espelho) — cada estratégia (`lib/calculators/`) só lê os campos que lhe interessam
  (ex.: Box lê só `medidaFrontalBox`/`tipoPagamentoBox`, ignora `vaos`). Evita um
  segundo formato de inputs por tipo e mantém o Strategy pattern intacto. O "tipo" de um
  item não é um campo separado — é **derivado do `modeloId`**: `"box"` e `"espelho"` são
  ids fixos e reservados (modelos-semente, como `"sacada"`); qualquer outro `modeloId` é
  tratado como Divisória.
- **RT (Reserva Técnica) não é mais por item** — é do **projeto inteiro**
  (`OrcamentoDetalhadoDraftStore.tipoRT`/`.valorRT`, nível do carrinho, não dentro de
  cada `inputs`). Aplicada **uma única vez**, sobre a soma de todos os itens (ver
  subseção RT abaixo).
- Estado no Zustand (`useOrcamentoDetalhadoDraft`, `lib/store.ts`): `itens[]`,
  `itemAtivoId` (qual item está sendo editado na tela), `tipoRT`/`valorRT` do projeto.
  Ações: `addItem(modeloId)`, `removeItem`, `renomearItem`, `trocarModeloItem`,
  `selecionarItem`, `setInputsItem`, `addVaoItem`/`updateVaoItem`/`removeVaoItem`
  (todas com o `id` do item como primeiro parâmetro — não existe mais um `setInputs`
  global), `setRT`, `setDraft` (substitui o carrinho inteiro, usado só ao abrir um
  orçamento salvo em "Meus Orçamentos"), `reset`. Sempre sobra pelo menos 1 item —
  `removeItem` não deixa o carrinho vazio.
- **Migração do formato antigo ("single-item")**: o `merge()` de `useOrcamentoDetalhadoDraft`
  detecta o formato pré-carrinho (um único `inputs` direto no rascunho, com `tipoRT`/
  `valorRT` dentro dele) e migra automaticamente pro novo formato — o `inputs` antigo
  vira o item único `itens[0]`, e a RT que morava nele sobe pro nível do draft. O modelo
  usado antigamente **não** estava salvo nesse draft (vivia só no `useModeloStore`
  global, fora dele) — não dá pra recuperar com certeza, então a migração assume
  `"slim"` como fallback; o usuário troca o modelo do item pelo seletor, se precisar.
- `lib/useCalculator.ts` reflete essa separação em duas funções: `calcularOrcamento`
  (um item, sem RT) e `calcularResumoCarrinho`/`useResumoCarrinho` (agrega todos os
  itens do carrinho — cada um pode usar um modelo/catálogo diferente — e só então
  aplica a RT do projeto).
- UI (`ProjectCalculator.tsx`): card "Itens do Orçamento" no topo (chips pra trocar de
  item ativo + excluir + botão "Adicionar Item" com um menu de todos os modelos
  disponíveis); abaixo, formulário do item ativo (Vãos, ou Box, ou Espelho, dependendo
  do `modeloId`); na coluna lateral, "Resumo do Item Ativo" (Agrupado/Separado, como
  antes, mas escopado a só um item) e "Total do Projeto" (RT + Total Geral + botão
  Salvar, que salva o carrinho inteiro).

### Vão
Um módulo/abertura da divisória: `largura`, `altura`, e (no Detalhado) um `tipo`:
`"Fixo" | "Porta de Abrir" | "Porta de Correr"`. Um projeto tem 1+ vãos, cada um
contribui pra área de vidro e pro cálculo estrutural. O Simplificado usa `VaoSimples`
(só largura/altura, sem tipo — o preço é por m² fechado, não importa o tipo).

### Modelo (Divisória Slim / Slim 8mm / MiterGlass / BlindGlass / Sacada / Box Padrão / Espelhos)
Cada modelo tem:
- Sua **própria fórmula estrutural** (Strategy pattern, `lib/calculators/`) — como
  vidro/perfis/tubos (ou preço fechado, no caso do Box) são calculados a partir dos
  inputs do item.
- Seu **próprio catálogo de produtos**, totalmente independente dos outros modelos
  (`useProductStore.productsByModelo[modeloId]`). Editar o preço da fechadura no Slim
  NUNCA afeta o preço da fechadura no MiterGlass. Um modelo novo criado pelo usuário
  nasce com catálogo vazio.
- Seu **valorM2** (usado só no Simplificado — Sacada, Box e Espelho têm isso como
  placeholder `0`, já que nenhum dos três é precificado por m² fechado, ver seções
  abaixo).

Modelos-semente (`SEED_MODELO_IDS` em `lib/store.ts`): `slim`, `slim8mm`, `miterglass`,
`blindglass`, `sacada`, `box`, `espelho`. Usuário pode criar modelos novos livremente
(`ModeloCatalog.tsx`) — esses caem na estratégia de cálculo da Slim por padrão
(`obterEstrategia` faz fallback), até ganharem fórmula própria. **Importante**: pra uma
estratégia nova ficar de fato vinculada a um modelo, o `id` do modelo tem que bater
literalmente com a chave usada em `ESTRATEGIAS` (`lib/calculators/index.ts`) — um modelo
criado manualmente pela UI ganha um `crypto.randomUUID()` como id, então nunca vai casar
sozinho com uma estratégia nova. É por isso que Sacada, Box e Espelho foram adicionados
como modelos-semente (ids fixos `"sacada"`/`"box"`/`"espelho"`), não como algo que o
usuário criaria à mão. `"box"` e `"espelho"` também são tratados como ids **reservados**
pelo carrinho do Detalhado — é assim que um item sabe renderizar o formulário certo (ver
"Carrinho de Itens" acima).

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
- Perfil U = perímetro total (`2×largura + 2×altura` de cada vão) → barras de 6m
  (soma linear simples — a peça é vendida por metro corrido, permite emenda).
- Estrutura em U invertido (laterais + topo, sem o vão de baixo):
  - `Fixo` / `Porta de Abrir`: as duas laterais (altura) + o topo (largura), tudo em
    Tubo 2x2.
  - `Porta de Correr`: só as duas laterais (altura) em Tubo 2x2 — o topo/trilho vira
    Perfil Engenharia (`largura`, soma linear simples, barras de 6m).
- **Tubo 2x2 = Plano de Corte, não soma linear** (`planoCorteTubo2x2()` em `slim.ts`):
  diferente do Perfil U/Perfil Engenharia, o Tubo 2x2 não permite emenda — cada peça
  (lateral ou topo) tem que sair de uma única barra de 6m, inteira. Por isso o cálculo é
  um bin-packing 1D (First Fit) sobre os cortes de **cada vão isoladamente** — a sobra
  de um vão nunca é reaproveitada pelo próximo (cada vão é uma frente de corte
  separada, como na obra real) — e o total de barras do projeto é a SOMA das barras de
  cada vão, não um bin-packing sobre a metragem total. Um corte nunca é dividido entre
  duas barras. Exemplo de referência (validado): vão Fixo de 2,80m×1,00m → cortes
  [2,80; 2,80; 1,00] → a barra que sobrou 2,80m depois do primeiro corte fica com 0,40m,
  onde o topo de 1,00m não cabe → abre uma 2ª barra só pro topo → **2 barras (12m
  cobrados)**, não 6,60m como daria a soma linear antiga.

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

**Fórmula Espelhos (`lib/calculators/espelho.ts`)** — não usa vãos nem tipo de vão
(`usaTipoVao: false`, `usaCorVidro: false`); recebe `inputs.larguraEspelho` /
`.alturaEspelho` (um par só, não um array — pra vários espelhos, o usuário adiciona
vários itens "Espelhos" no carrinho).
- **Área mínima cobrada**: `AREA_MINIMA_M2 = 0.3` — se `largura × altura < 0.3m²`, cobra
  como se fosse 0,3m² (`areaCobradaEspelho()`, exportada e reusada também pelo cálculo
  do Desembaçador Elétrico abaixo, pra manter uma única noção de "área faturável").
- **Modelo Base × Modelo Especial**: `inputs.espelhoModeloBase` (uma das 9 chaves de
  `MODELOS_BASE_ESPELHO` — combinações de material+acabamento, ex. "Guardian 4mm —
  Bizote", preço por m²) é o padrão; se `inputs.espelhoModeloEspecial` também estiver
  setado (uma das 9 chaves de `MODELOS_ESPECIAIS_ESPELHO`, ex. "Orgânico c/ Led"), ele
  **anula** o base — é outro preço fechado por m², não uma soma dos dois.
- **Junção/Revestimento/Modelo**: `inputs.incluirJuncaoRevestimentoEspelho` soma +20%
  sobre o subtotal **base do vidro** (área cobrada × valor/m² do modelo escolhido) — não
  incide sobre os adicionais avulsos abaixo (são hardware itemizado à parte).
- **Adicionais** (só existem quando `modeloId === "espelho"`, mesmo isolamento da
  Sacada/Box — ver `lib/useCalculator.ts`): Desembaçador Elétrico (checkbox, R$/m² ×
  área cobrada — usa o mesmo piso de 0,3m²), Recorte CX de Luz (R$/un), Chassis Perfil U
  (R$/peça), Touch Screen (R$/peça).
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
MiterGlass sempre teve "Perfil Engenharia" no catálogo mesmo não usando).

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
esse padrão, não formatar/arredondar na mão. (O Simplificado, fora do escopo dessa
reforma, **não** ganhou esse arredondamento no core — continua só arredondando na
exibição via `formatBRL()`, como sempre foi.)

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
- Toda mudança de shape ao longo do tempo tem uma função `merge()` cuidadosa que faz
  backfill de campos novos sem perder o que o usuário já tinha customizado. **Ao
  adicionar um campo novo a `ProjectInputs`/`SimplifiedInputs`/`Product`, sempre
  atualizar o `merge()` correspondente em `lib/store.ts`** — senão quem já tem dado
  salvo local não ganha o campo novo. O `merge()` de `useOrcamentoDetalhadoDraft` é o
  mais delicado dos quatro: precisa reconhecer e migrar **dois** formatos antigos (o
  "single-item" pré-carrinho, e o carrinho já existente mas sem campos novos de item) —
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
- A migração do formato "single-item" pro "carrinho" (`useOrcamentoDetalhadoDraft.merge()`,
  ver seção 4) assume `modeloId: "slim"` pro item migrado, porque o modelo antigo vivia
  só no `useModeloStore` (fora do draft) e não dá pra recuperar com certeza no `merge()`.
  Quem tinha um rascunho salvo com outro modelo (MiterGlass, Sacada...) precisa
  reselecionar o modelo certo no item depois de abrir o app pela primeira vez após esta
  mudança — não é automático. Não afeta orçamentos já **salvos** no Supabase (esses
  guardam o payload antigo tal como foi salvo; só o rascunho local em andamento passa
  por essa migração).
- A regra "Se for Espelho 4mm pequeno, o valor base fixo é R$700/m²" do briefing original
  foi interpretada como um exemplo ilustrativo da regra de área mínima (0,3m²), não como
  uma faixa de preço própria — nenhuma `ProductKey` dedicada foi criada pra ela. Se a
  intenção era outra (uma faixa de preço fixo separada pra espelhos 4mm pequenos),
  avisar que precisa ser ajustado em `lib/calculators/espelho.ts`.
- `supabase/migration_002_vendedor_codigo.sql` precisa ter sido rodada manualmente pelo
  usuário no Supabase pra "Meus Orçamentos" funcionar (colunas `codigo`/`nome_vendedor`).
- **Nada que envolve renderização de tela foi verificado ao vivo desde que o login virou
  obrigatório** (Sacada, toggle Agrupado/Separado, isolamento dos opcionais da Sacada, RT
  fixo/percentual nas duas calculadoras, Comparador Seletivo do Simplificado, e agora o
  Carrinho de itens + Box + Espelhos — tudo dos últimos commits). Só dá pra validar por
  `tsc`/`eslint`/`build` (limpos) e testes isolados da lógica pura (kits da Sacada, RT
  fixo/percentual, preços de Box, área mínima/junção do Espelho, agregação de RT do
  carrinho sobre itens de modelos diferentes — todos batendo). Testar de verdade na tela
  assim que existir uma conta.

## 10. Histórico de Mudanças

> Entradas resumidas, mais recente primeiro. Não precisa repetir o que já está descrito
> nas seções acima — só registrar o quê e (se não-óbvio) o porquê.

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
