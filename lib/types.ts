export type UnidadeVenda = "m²" | "un" | "un/noite";

export type ProductKey =
  | "vidro"
  | "perfilU"
  | "tubo2x2"
  | "perfilEngenharia"
  | "puxadorH"
  | "fechadura"
  | "pelicula"
  | "adicionalNoturno"
  | "portaPremium"
  | "laDeVidro"
  | "kitPortaSimples"
  | "kitPortaDupla"
  | "vidroSacadaIncolor"
  | "vidroSacadaVerde"
  | "kitSacada2m"
  | "kitSacada3m"
  | "kitSacada4m"
  | "kitSacada6m"
  | "artEngenheiro"
  | "caixaArCondicionado"
  | "respiroAluminio"
  // Box Padrão — matriz de preço fechado por medida frontal × forma de pagamento.
  | "box900Vista"
  | "box900Cartao"
  | "box1000Vista"
  | "box1000Cartao"
  | "box1200Vista"
  | "box1200Cartao"
  | "box1330Vista"
  | "box1330Cartao"
  | "box1500Vista"
  | "box1500Cartao"
  | "box1800Vista"
  | "box1800Cartao"
  | "box2000Vista"
  | "box2000Cartao"
  | "box2200Vista"
  | "box2200Cartao"
  // Espelhos — modelos base (material + acabamento), R$/m².
  | "espelhoGuardian4mmLapidado"
  | "espelhoGuardian4mmBizote"
  | "espelhoGuardian4mmBizoteJuncao"
  | "espelhoCebrace5mmLapidado"
  | "espelhoCebrace5mmBizote"
  | "espelhoCebrace6mmLapidado"
  | "espelhoCebrace6mmBizote"
  | "espelhoBronzeFume4mmLapidado"
  | "espelhoBronzeFume4mmBizote"
  // Espelhos — modelos especiais (preço fechado por m², anula o modelo base).
  | "espelhoOrganicoComMoldura"
  | "espelhoOrganico"
  | "espelhoOrganicoComLed"
  | "espelhoLedFrontal"
  | "espelhoLedExpandido"
  | "espelhoOvalComMoldura"
  | "espelhoOvalSemMoldura"
  | "espelhoCantoMoeda"
  | "espelhoMeiaLuaComLed"
  // Espelhos — adicionais/opcionais.
  | "espelhoDesembacador"
  | "espelhoRecorteCxLuz"
  | "espelhoChassisPerfilU"
  | "espelhoTouchScreen";

/** Cor do vidro laminado da Sacada — só usado pelo modelo "sacada" (ver usaCorVidro). */
export type CorVidroSacada = "incolor" | "verde";

/** Reserva Técnica: valor fixo em R$, ou percentual sobre o total (antes da própria RT). */
export type TipoRT = "fixo" | "percentual";

/** Medida frontal do Box Padrão — restrita às opções da tabela de preços. */
export type MedidaFrontalBox = "900" | "1000" | "1200" | "1330" | "1500" | "1800" | "2000" | "2200";

/** Forma de pagamento do Box Padrão — cada uma tem sua própria coluna de preço na tabela. */
export type TipoPagamentoBox = "vista" | "cartao";

export interface Modelo {
  id: string;
  nome: string;
  /** Preço fechado por m², usado no Orçamento Simplificado. */
  valorM2: number;
}

export type TipoVao = "Fixo" | "Porta de Abrir" | "Porta de Correr";

export const TIPOS_VAO: TipoVao[] = ["Fixo", "Porta de Abrir", "Porta de Correr"];

export interface Product {
  id: string;
  key: ProductKey | null;
  nome: string;
  unidade: UnidadeVenda;
  valor: number;
  /** Quando definido, este produto entra automaticamente no orçamento: 1x por vão deste tipo. */
  tipoVaoAssociado: TipoVao | null;
}

export interface Vao {
  id: string;
  largura: number;
  altura: number;
  tipo: TipoVao;
}

/**
 * Inputs de UM item do carrinho do Orçamento Detalhado. O mesmo formato serve pros três
 * tipos de item (Divisória, Box, Espelho) — cada estratégia (lib/calculators) só lê os
 * campos que lhe interessam, os demais ficam com o valor padrão e são ignorados. Isso
 * evita um segundo formato de inputs por tipo, mantendo o Strategy pattern intacto (ver
 * seção 4 do CLAUDE.md).
 */
export interface ProjectInputs {
  vaos: Vao[];
  qtdPuxadores: number;
  qtdFechaduras: number;
  incluirPelicula: boolean;
  incluirLaDeVidro: boolean;
  qtdPortaPremium: number;
  qtdNoitesInstalacao: number;
  qtdKitPortaSimples: number;
  qtdKitPortaDupla: number;
  /** Cor do vidro da Sacada — só relevante quando o modelo selecionado usa (ver usaCorVidro). */
  corVidroSacada: CorVidroSacada;
  /** Opcionais exclusivos da Sacada — só contam/aparecem quando o modelo é "sacada". */
  incluirArtEngenheiro: boolean;
  qtdCaixaArCondicionado: number;
  /** m² do respiro de alumínio — digitado manualmente, independente da área dos vãos. */
  m2RespiroAluminio: number;
  /** Box Padrão — só usado quando o item do carrinho tem modeloId === "box". */
  medidaFrontalBox: MedidaFrontalBox | null;
  tipoPagamentoBox: TipoPagamentoBox;
  /** Espelhos — só usado quando o item do carrinho tem modeloId === "espelho". */
  larguraEspelho: number;
  alturaEspelho: number;
  /** Uma das chaves de MODELOS_BASE_ESPELHO (lib/calculators/espelho.ts), ou null. */
  espelhoModeloBase: ProductKey | null;
  /** Uma das chaves de MODELOS_ESPECIAIS_ESPELHO — quando definido, anula o modelo base. */
  espelhoModeloEspecial: ProductKey | null;
  incluirDesembacadorEspelho: boolean;
  qtdRecorteCxLuzEspelho: number;
  qtdChassisPerfilUEspelho: number;
  qtdTouchScreenEspelho: number;
  /** +20% sobre o subtotal base do vidro do espelho. */
  incluirJuncaoRevestimentoEspelho: boolean;
}

export interface CalculoItem {
  label: string;
  detalhe: string;
  subtotal: number;
  /** "estrutural" = vidro/perfis/tubos (vem da Strategy do modelo); "opcional" = tudo somado depois. */
  grupo: "estrutural" | "opcional";
}

export interface ResultadoCalculo {
  itens: CalculoItem[];
  total: number;
  areaTotalVidro: number;
  /** Soma de itens com grupo "estrutural" — "Subtotal da Divisória" na UI. */
  subtotalEstrutural: number;
  /** Soma de itens com grupo "opcional" — "Subtotal de Opcionais" na UI. */
  subtotalOpcionais: number;
}

/**
 * Um item do carrinho do Orçamento Detalhado: um ambiente/produto independente
 * (Divisória de algum modelo, Box Padrão ou Espelho). `modeloId` decide a estratégia de
 * cálculo (lib/calculators/index.ts) e qual catálogo de produtos é usado.
 */
export interface ItemOrcamentoDetalhado {
  id: string;
  ambiente: string;
  modeloId: string;
  inputs: ProjectInputs;
}

/**
 * Payload completo do Orçamento Detalhado (rascunho no Zustand e `dados` salvo no
 * Supabase) — um "carrinho" de itens + a Reserva Técnica do PROJETO INTEIRO (não mais
 * por item, ver seção 4 do CLAUDE.md).
 */
export interface OrcamentoDetalhadoDados {
  itens: ItemOrcamentoDetalhado[];
  tipoRT: TipoRT;
  valorRT: number;
}

export interface VaoSimples {
  id: string;
  largura: number;
  altura: number;
}

export interface OpcionaisSimplificado {
  incluirPelicula: boolean;
  incluirLaDeVidro: boolean;
  qtdPortaPremium: number;
  qtdNoitesInstalacao: number;
}

export const OPCIONAIS_PADRAO: OpcionaisSimplificado = {
  incluirPelicula: false,
  incluirLaDeVidro: false,
  qtdPortaPremium: 0,
  qtdNoitesInstalacao: 0,
};

export interface SimplifiedInputs {
  vaos: VaoSimples[];
  /** Opcionais escolhidos independentemente para cada modelo, chaveado por Modelo.id. */
  opcionaisPorModelo: Record<string, OpcionaisSimplificado>;
  /** RT é global (um valor/tipo só) e se aplica sobre o total de CADA modelo mostrado. */
  tipoRT: TipoRT;
  valorRT: number;
  /**
   * Ids de Modelo que o usuário desmarcou no Painel de Seleção (comparador seletivo) —
   * lista de EXCLUSÃO, não de seleção: um modelo novo (criado depois) aparece
   * automaticamente, sem precisar atualizar essa lista. "sacada", "box" e "espelho"
   * começam aqui por padrão (nenhum tem cálculo por m² de verdade — valorM2 é 0), mas o
   * usuário pode reativar qualquer um a qualquer momento, inclusive sozinho.
   */
  modelosDesmarcados: string[];
}

export interface ResultadoSimplificadoItem {
  modeloId: string;
  nomeModelo: string;
  valorM2: number;
  custoBase: number;
  opcionais: CalculoItem[];
  custoOpcionaisTotal: number;
  /** Reserva Técnica calculada pra este modelo (fixo, ou % sobre custoBase + custoOpcionaisTotal). */
  custoRT: number;
  total: number;
}

export interface ResultadoSimplificado {
  area: number;
  porModelo: ResultadoSimplificadoItem[];
}

export type TipoOrcamento = "detalhado" | "simplificado";

/** Linha da lista "Meus Orçamentos" — sem o payload completo de `dados`. */
export interface OrcamentoSalvoResumo {
  id: string;
  tipo: TipoOrcamento;
  codigo: string | null;
  nomeVendedor: string | null;
  nomeCliente: string | null;
  /** Custo total (Detalhado) ou null (Simplificado compara vários modelos, sem um total único). */
  total: number | null;
  criadoEm: string;
}

/** Orçamento salvo completo, com o payload pronto para recarregar no rascunho. */
export interface OrcamentoSalvoDetalhe extends OrcamentoSalvoResumo {
  dados: OrcamentoDetalhadoDados | SimplifiedInputs;
}
