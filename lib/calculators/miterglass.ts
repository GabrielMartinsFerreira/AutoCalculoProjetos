import type { CalculoItem, ProjectInputs, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

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
 * Exemplo de referência (6,00m × 3,00m):
 * peças = 6 (6m ÷ 1m)
 * tubo = topo (6m) + verticais (6+1=7 × 3m = 21m) = 27m → 5 barras de 6m
 * perfil U = (2×1 + 2×3) × 6 peças = 8 × 6 = 48m → 8 barras de 6m
 */
function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const vaos: Vao[] = inputs.vaos;
  const largura = vaos.reduce((acc, v) => acc + v.largura, 0);
  const altura = vaos.reduce((max, v) => Math.max(max, v.altura), 0);
  const areaVidro = vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);

  // Modulação: quantidade de peças = valor inteiro mais próximo de L / 1,0m.
  const pecas = Math.max(1, Math.round(largura));
  const larguraPorPeca = largura / pecas;

  // Tubo 2x2: topo (a largura toda, uma vez) + um vertical por peça + 1 (as duas
  // bordas externas + cada divisão interna entre peças), cada vertical com a
  // altura toda.
  const qtdVerticaisTubo = pecas + 1;
  const metragemTuboTopo = largura;
  const metragemTuboVerticais = qtdVerticaisTubo * altura;
  const metragemTubo = metragemTuboTopo + metragemTuboVerticais;
  const barrasTubo = Math.ceil(metragemTubo / 6);
  const custoTubo = barrasTubo * getValor("tubo2x2");

  // Perfil U: cada peça é emoldurada individualmente (perímetro próprio de
  // largura×altura), depois soma-se pela quantidade de peças.
  const metragemPerfilUPorPeca = 2 * larguraPorPeca + 2 * altura;
  const metragemPerfilU = metragemPerfilUPorPeca * pecas;
  const barrasPerfilU = Math.ceil(metragemPerfilU / 6);
  const custoPerfilU = barrasPerfilU * getValor("perfilU");

  return [
    {
      label: "Vidro",
      detalhe: `${areaVidro.toFixed(2)} m² × ${getValor("vidro").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: areaVidro * getValor("vidro"),
      grupo: "estrutural",
    },
    {
      label: "Perfil U (perímetro por peça)",
      detalhe: `${pecas} peça(s) × ${metragemPerfilUPorPeca.toFixed(2)} m/peça = ${metragemPerfilU.toFixed(2)} m → ${barrasPerfilU} barra(s) de 6m`,
      subtotal: custoPerfilU,
      grupo: "estrutural",
    },
    {
      label: "Tubo 2x2 (topo + verticais)",
      detalhe: `topo ${metragemTuboTopo.toFixed(2)} m + (${pecas} peça(s) + 1 = ${qtdVerticaisTubo} vertical(is) × ${altura.toFixed(2)} m = ${metragemTuboVerticais.toFixed(2)} m) = ${metragemTubo.toFixed(2)} m → ${barrasTubo} barra(s) de 6m`,
      subtotal: custoTubo,
      grupo: "estrutural",
    },
  ];
}

export const estrategiaMiterGlass: EstrategiaCalculoModelo = {
  id: "miterglass",
  nome: "Divisória MiterGlass",
  usaTipoVao: false,
  usaCorVidro: false,
  calcularEstrutura,
};
