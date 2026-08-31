import { estrategiaSlim } from "./slim";
import { estrategiaMiterGlass } from "./miterglass";
import { estrategiaSacada } from "./sacada";
import type { EstrategiaCalculoModelo } from "./types";

export type { EstrategiaCalculoModelo, GetValor } from "./types";

const ESTRATEGIAS: Record<string, EstrategiaCalculoModelo> = {
  slim: estrategiaSlim,
  // Slim 8mm é a mesma construção da Slim (10mm) — só muda a espessura do vidro
  // e os valores do catálogo, não a fórmula.
  slim8mm: estrategiaSlim,
  miterglass: estrategiaMiterGlass,
  sacada: estrategiaSacada,
};

/**
 * Devolve a estratégia de cálculo de um modelo pelo seu id. Modelos sem fórmula
 * própria configurada (ex.: BlindGlass, ou qualquer modelo novo cadastrado pelo
 * usuário) caem na estratégia da Slim como padrão, até terem regras específicas.
 */
export function obterEstrategia(modeloId: string): EstrategiaCalculoModelo {
  return ESTRATEGIAS[modeloId] ?? estrategiaSlim;
}
