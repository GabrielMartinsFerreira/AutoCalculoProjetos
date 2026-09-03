/**
 * Plano de Corte — utilitário compartilhado por qualquer estratégia que precise
 * converter uma lista de cortes em barras/peças de estoque (hoje: Tubo 2x2 e Perfil U
 * do Slim e do MiterGlass, ver lib/calculators/slim.ts e miterglass.ts).
 *
 * Corrige um erro de regra de negócio do mundo real que a soma linear (metragem total
 * ÷ tamanho da barra, com `Math.ceil`) escondia: ela presume que QUALQUER sobra, por
 * menor que seja, é 100% reaproveitável no próximo corte — na obra real, um retalho
 * pequeno demais não serve pra nada e é descartado. Isso subestimava sistematicamente
 * o consumo real de barras.
 */

/** Sobra mínima considerada reaproveitável, em metros — abaixo disso vira retalho descartado. */
export const SOBRA_MINIMA_REAPROVEITAVEL_M = 2;

/**
 * Simula um plano de corte real (bin-packing 1D, First Fit) contra barras de
 * `tamanhoBarra` metros:
 * 1. Percorre `cortes` na ordem dada.
 * 2. Pra cada corte, tenta encaixar na PRIMEIRA sobra já aberta que tenha espaço
 *    suficiente (First Fit). Se a sobra resultante depois do corte for menor que
 *    `SOBRA_MINIMA_REAPROVEITAVEL_M`, ela é DESCARTADA (retalho de obra, não fica
 *    disponível pros próximos cortes) — é essa regra que faltava na soma linear antiga.
 * 3. Se nenhuma sobra aberta comportar o corte, abre uma barra nova; a sobra dessa
 *    barra nova passa pela mesma regra de descarte acima.
 * 4. Um corte MAIOR que a própria barra (`corte > tamanhoBarra`) exige fisicamente
 *    emenda ou uma barra especial — conta `Math.ceil(corte / tamanhoBarra)` barras
 *    cheias, sem gerar sobra aproveitável (melhor cobrar a mais do que fingir que a
 *    peça sai inteira de uma barra menor que ela). Corte `<= 0` (medida ainda não
 *    preenchida) não consome barra nenhuma.
 *
 * Retorna o número de barras INTEIRAS abertas — a metragem cobrada do cliente é
 * `barras * tamanhoBarra`, nunca a soma bruta dos cortes (que é sempre <= metragem
 * cobrada, pela própria natureza do desperdício de corte real).
 */
export function calcularPlanoDeCorte(cortes: number[], tamanhoBarra = 6): number {
  const sobrasReaproveitaveis: number[] = [];
  let barras = 0;

  for (const corte of cortes) {
    if (!(corte > 0)) continue;

    if (corte > tamanhoBarra) {
      barras += Math.ceil(corte / tamanhoBarra);
      continue;
    }

    const indice = sobrasReaproveitaveis.findIndex((sobra) => sobra >= corte);
    if (indice >= 0) {
      const sobraRestante = sobrasReaproveitaveis[indice] - corte;
      if (sobraRestante >= SOBRA_MINIMA_REAPROVEITAVEL_M) {
        sobrasReaproveitaveis[indice] = sobraRestante;
      } else {
        sobrasReaproveitaveis.splice(indice, 1);
      }
      continue;
    }

    barras += 1;
    const sobraDaBarraNova = tamanhoBarra - corte;
    if (sobraDaBarraNova >= SOBRA_MINIMA_REAPROVEITAVEL_M) {
      sobrasReaproveitaveis.push(sobraDaBarraNova);
    }
  }

  return barras;
}
