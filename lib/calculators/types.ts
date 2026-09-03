import type { CalculoItem, ProductKey, ProjectInputs } from "../types";

/** Busca o preço atual de um produto do catálogo pela sua chave fixa. */
export type GetValor = (key: ProductKey) => number;

/**
 * Estratégia de cálculo estrutural de um modelo (vidro, perfis, tubos — ou preço
 * fechado/composto, no caso de Box/Box Flex/Espelho). Ferragens/opcionais universais
 * (puxador, fechadura, película, porta premium, lã de vidro, adicional noturno, kits de
 * porta, produtos vinculados a tipo de vão) e os opcionais exclusivos de Sacada/Espelho
 * NÃO entram aqui — são somados depois em lib/useCalculator.ts. A RT é do projeto
 * inteiro (calcularResumoCarrinho), nunca da estratégia.
 */
export interface EstrategiaCalculoModelo {
  /** Deve bater com o Modelo.id ao qual esta estratégia se aplica. */
  id: string;
  /** Nome de exibição, usado só para depuração/documentação — a UI usa Modelo.nome. */
  nome: string;
  /** Se falso, o campo "Tipo do Vão" é ocultado no formulário (a fórmula não o utiliza). */
  usaTipoVao: boolean;
  /** Se verdadeiro, mostra o seletor de cor do vidro (hoje só a Sacada usa). */
  usaCorVidro: boolean;
  /**
   * Chaves do catálogo que ESTA fórmula estrutural lê via `getValor`. Usado só pra
   * filtrar o Cadastro de Produtos (mostrar o que importa pro modelo) — não afeta o
   * cálculo. As chaves dos opcionais somados em lib/useCalculator.ts ficam em
   * `chavesCatalogoDoModelo` (lib/calculators/index.ts), não aqui.
   */
  chavesCatalogo: ProductKey[];
  /**
   * Calcula os itens estruturais (vidro, perfis, tubos...) a partir de todo o
   * ProjectInputs — recebe o objeto inteiro (não só `vaos`) porque algumas estratégias
   * precisam de outros campos de projeto (ex.: Sacada usa `corVidroSacada`).
   */
  calcularEstrutura: (inputs: ProjectInputs, getValor: GetValor) => CalculoItem[];
}
