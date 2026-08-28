import type { CalculoItem, ProductKey, Vao } from "../types";

/** Busca o preço atual de um produto do catálogo pela sua chave fixa. */
export type GetValor = (key: ProductKey) => number;

/**
 * Estratégia de cálculo estrutural de um modelo de divisória (vidro, perfis, tubos).
 * Ferragens/opcionais universais (puxador, fechadura, película, porta premium, lã de
 * vidro, adicional noturno, produtos vinculados a tipo de vão) NÃO entram aqui — são
 * somados depois, igualmente para qualquer modelo, em lib/useCalculator.ts.
 */
export interface EstrategiaCalculoModelo {
  /** Deve bater com o Modelo.id ao qual esta estratégia se aplica. */
  id: string;
  /** Nome de exibição, usado só para depuração/documentação — a UI usa Modelo.nome. */
  nome: string;
  /** Se falso, o campo "Tipo do Vão" é ocultado no formulário (a fórmula não o utiliza). */
  usaTipoVao: boolean;
  /** Calcula os itens estruturais (vidro, perfis, tubos...) a partir dos vãos informados. */
  calcularEstrutura: (vaos: Vao[], getValor: GetValor) => CalculoItem[];
}
