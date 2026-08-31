import type { CalculoItem, ProductKey, ProjectInputs } from "../types";

/** Busca o preço atual de um produto do catálogo pela sua chave fixa. */
export type GetValor = (key: ProductKey) => number;

/**
 * Estratégia de cálculo estrutural de um modelo de divisória (vidro, perfis, tubos).
 * Ferragens/opcionais universais (puxador, fechadura, película, porta premium, lã de
 * vidro, adicional noturno, RT, ART, caixa de ar-condicionado, respiro, produtos
 * vinculados a tipo de vão) NÃO entram aqui — são somados depois, igualmente para
 * qualquer modelo, em lib/useCalculator.ts.
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
   * Calcula os itens estruturais (vidro, perfis, tubos...) a partir de todo o
   * ProjectInputs — recebe o objeto inteiro (não só `vaos`) porque algumas estratégias
   * precisam de outros campos de projeto (ex.: Sacada usa `corVidroSacada`).
   */
  calcularEstrutura: (inputs: ProjectInputs, getValor: GetValor) => CalculoItem[];
}
