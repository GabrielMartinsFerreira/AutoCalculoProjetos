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
  | "kitPortaDupla";

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
}

export interface CalculoItem {
  label: string;
  detalhe: string;
  subtotal: number;
}

export interface ResultadoCalculo {
  itens: CalculoItem[];
  total: number;
  areaTotalVidro: number;
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
}

export interface ResultadoSimplificadoItem {
  modeloId: string;
  nomeModelo: string;
  valorM2: number;
  custoBase: number;
  opcionais: CalculoItem[];
  custoOpcionaisTotal: number;
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
  dados: ProjectInputs | SimplifiedInputs;
}
