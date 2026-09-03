import { calcularPlanoDeCorte } from "./utils";
import type { CalculoItem, ProjectInputs, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

const TAMANHO_BARRA_M = 6;

/**
 * MiterGlass é modulado em painéis (peças) de ~1m, não em vãos com tipo de porta —
 * por isso "Tipo do Vão" fica oculto para este modelo (ver usaTipoVao abaixo).
 *
 * A fórmula trabalha com uma Largura total (L) e uma Altura (H) únicas. Quando o
 * projeto tem mais de um vão cadastrado, tratamos como uma única parede contínua:
 * L = soma das larguras de todos os vãos, H = a maior altura entre eles. A área de
 * vidro, porém, soma a área individual de cada vão (mais preciso se as alturas
 * variarem entre eles).
 *
 * Tubo 2x2 e Perfil U usam o Plano de Corte real (`calcularPlanoDeCorte`, bin-packing
 * com retalho mínimo reaproveitável de 2m — ver lib/calculators/utils.ts), não mais
 * soma linear ÷ 6: a soma linear presumia que qualquer sobra, por menor que fosse,
 * seria 100% reaproveitada no próximo corte, o que subestimava o consumo real de
 * barras (ex. reportado: 21 barras calculadas contra 24 reais na obra).
 *
 * Exemplo de referência (6,00m × 3,00m, valores redondos — sem retalho descartado):
 * peças = 6 (6m ÷ 1m)
 * tubo: cortes = [6 (topo), 3×7 (verticais)] → plano de corte → 5 barras de 6m
 * perfil U: cortes = 6 peças × [1, 1, 3, 3] → plano de corte → 9 barras de 6m (a ordem
 * intercalada dos cortes gera mais desperdício que a divisão linear ingênua de 48m/6=8
 * barras escondia — o ponto exato desta correção).
 */
function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const vaos: Vao[] = inputs.vaos;
  const largura = vaos.reduce((acc, v) => acc + v.largura, 0);
  const altura = vaos.reduce((max, v) => Math.max(max, v.altura), 0);
  const areaVidro = vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);

  // Modulação: quantidade de peças = valor inteiro mais próximo de L / 1,0m.
  const pecas = Math.max(1, Math.round(largura));
  const larguraPorPeca = largura / pecas;

  // Tubo 2x2: topo (a largura toda, um corte só) + um vertical por peça + 1 (as duas
  // bordas externas + cada divisão interna entre peças), cada vertical com a altura
  // toda — tudo no MESMO plano de corte (MiterGlass trata o projeto como uma parede
  // contínua, não isolada por vão como o Slim).
  const qtdVerticaisTubo = pecas + 1;
  const cortesTubo: number[] = [largura, ...Array(qtdVerticaisTubo).fill(altura)];
  const barrasTubo = calcularPlanoDeCorte(cortesTubo, TAMANHO_BARRA_M);
  const metragemTuboCobrada = barrasTubo * TAMANHO_BARRA_M;

  // Perfil U: cada peça é emoldurada individualmente (2 cortes de larguraPorPeça + 2
  // cortes de altura) — os cortes de TODAS as peças entram no mesmo plano de corte
  // (Perfil U permite emenda/reaproveitamento entre peças).
  const cortesPerfilU: number[] = [];
  for (let i = 0; i < pecas; i++) {
    cortesPerfilU.push(larguraPorPeca, larguraPorPeca, altura, altura);
  }
  const barrasPerfilU = calcularPlanoDeCorte(cortesPerfilU, TAMANHO_BARRA_M);
  const metragemPerfilUCobrada = barrasPerfilU * TAMANHO_BARRA_M;

  return [
    {
      label: "Vidro",
      detalhe: `${areaVidro.toFixed(2)} m² × ${getValor("vidro").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: Math.round(areaVidro * getValor("vidro")),
      grupo: "estrutural",
    },
    {
      label: "Perfil U (perímetro por peça)",
      detalhe:
        pecas > 0
          ? `${pecas} peça(s) × (2×${larguraPorPeca.toFixed(2)}m + 2×${altura.toFixed(2)}m) → plano de corte (retalho < 2,00m descartado) → ${barrasPerfilU} barra(s) de 6m (${metragemPerfilUCobrada.toFixed(2)} m cobrados)`
          : "Nenhum vão cadastrado",
      subtotal: Math.round(barrasPerfilU * getValor("perfilU")),
      grupo: "estrutural",
    },
    {
      label: "Tubo 2x2 (topo + verticais)",
      detalhe:
        pecas > 0
          ? `topo ${largura.toFixed(2)}m + ${qtdVerticaisTubo} vertical(is) de ${altura.toFixed(2)}m → plano de corte (retalho < 2,00m descartado) → ${barrasTubo} barra(s) de 6m (${metragemTuboCobrada.toFixed(2)} m cobrados)`
          : "Nenhum vão cadastrado",
      subtotal: Math.round(barrasTubo * getValor("tubo2x2")),
      grupo: "estrutural",
    },
  ];
}

export const estrategiaMiterGlass: EstrategiaCalculoModelo = {
  id: "miterglass",
  nome: "Divisória MiterGlass",
  usaTipoVao: false,
  usaCorVidro: false,
  chavesCatalogo: ["vidro", "perfilU", "tubo2x2"],
  calcularEstrutura,
};
