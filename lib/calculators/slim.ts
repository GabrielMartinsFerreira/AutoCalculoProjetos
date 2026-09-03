import type { CalculoItem, ProjectInputs, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

const CAPACIDADE_BARRA_TUBO_M = 6;

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

function perimetroTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + 2 * v.largura + 2 * v.altura, 0);
}

/**
 * Perfil Engenharia (trilho de topo, só em "Porta de Correr") continua uma soma linear
 * simples — a peça do trilho é vendida/cortada por metro corrido normalmente, sem a
 * restrição de "zero emendas" que o Tubo 2x2 tem (ver planoCorteTubo2x2 abaixo).
 */
function perfilEngenhariaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => (v.tipo === "Porta de Correr" ? acc + v.largura : acc), 0);
}

/**
 * Peças de Tubo 2x2 que UM vão precisa, na estrutura em U invertido (laterais + topo,
 * sem o vão embaixo):
 * - Fixo / Porta de Abrir: as duas laterais (altura) + o topo (largura), tudo em Tubo 2x2.
 * - Porta de Correr: só as duas laterais (altura) — o topo/trilho vira Perfil Engenharia.
 */
function cortesTubo2x2DoVao(vao: Vao): number[] {
  return vao.tipo === "Porta de Correr" ? [vao.altura, vao.altura] : [vao.altura, vao.altura, vao.largura];
}

/**
 * Plano de corte (1D bin packing, First Fit) de uma lista de cortes contra barras de
 * 6m: percorre os cortes na ordem dada e encaixa cada um na primeira barra já aberta
 * que ainda tenha espaço suficiente; se nenhuma barra aberta comportar o corte, abre
 * uma barra nova. REGRA ESTRITA: um corte nunca é dividido entre duas barras — zero
 * emendas/junções na mesma peça, mesmo que sobre espaço fracionado em mais de uma
 * barra ao mesmo tempo.
 */
function barrasNecessarias(cortes: number[]): number {
  const sobras: number[] = [];
  let barrasInteirasExtras = 0;
  for (const corte of cortes) {
    // Corte sem medida (vão ainda não preenchido, altura/largura 0) não consome barra —
    // antes um corte de 0m abria uma barra inteira à toa.
    if (!(corte > 0)) continue;
    // Peça maior que a barra: fisicamente exige emenda ou barra especial. Conta as
    // barras inteiras necessárias (ceil) sem gerar sobra aproveitável — melhor cobrar a
    // mais do que fingir que uma peça de 6,5m sai inteira de uma barra de 6m.
    if (corte > CAPACIDADE_BARRA_TUBO_M) {
      barrasInteirasExtras += Math.ceil(corte / CAPACIDADE_BARRA_TUBO_M);
      continue;
    }
    const indiceComEspaco = sobras.findIndex((sobra) => sobra >= corte);
    if (indiceComEspaco >= 0) {
      sobras[indiceComEspaco] -= corte;
    } else {
      sobras.push(CAPACIDADE_BARRA_TUBO_M - corte);
    }
  }
  return sobras.length + barrasInteirasExtras;
}

/**
 * Plano de corte do Tubo 2x2 do PROJETO: cada vão é cortado a partir do seu PRÓPRIO
 * conjunto de barras de 6m — a sobra de um vão nunca é reaproveitada pelo próximo (na
 * obra, cada vão é uma frente de corte isolada, não uma barra compartilhada entre
 * módulos diferentes). Por isso o total de barras é a SOMA das barras de cada vão
 * calculadas isoladamente, não o resultado de um bin-packing sobre a metragem total do
 * projeto (que poderia, incorretamente, aproveitar sobra de um vão para cortar peça de
 * outro).
 */
function planoCorteTubo2x2(vaos: Vao[]) {
  let totalBarras = 0;
  const resumoPorVao: string[] = [];

  for (const vao of vaos) {
    const cortes = cortesTubo2x2DoVao(vao);
    const barrasDoVao = barrasNecessarias(cortes);
    totalBarras += barrasDoVao;
    resumoPorVao.push(`${cortes.map((c) => `${c.toFixed(2)}m`).join("+")} → ${barrasDoVao} barra(s)`);
  }

  return { totalBarras, resumoPorVao };
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const { vaos } = inputs;
  const areaTotalVidro = areaTotal(vaos);
  const metragemPerfilU = perimetroTotal(vaos);
  const metragemPerfilEngenharia = perfilEngenhariaTotal(vaos);

  const qtdBarrasPerfilU = Math.ceil(metragemPerfilU / 6);
  const qtdBarrasPerfilEngenharia = Math.ceil(metragemPerfilEngenharia / 6);

  // Tubo 2x2: plano de corte isolado por vão, barras de 6m, zero emendas — ver
  // planoCorteTubo2x2 acima (substitui a antiga soma linear, que presumia emendas
  // infinitas e subestimava o consumo real de barras).
  const { totalBarras: qtdBarrasTubo2x2, resumoPorVao: resumoTubo2x2PorVao } = planoCorteTubo2x2(vaos);
  const metragemTubo2x2Cobrada = qtdBarrasTubo2x2 * CAPACIDADE_BARRA_TUBO_M;

  return [
    {
      label: "Vidro",
      detalhe: `${areaTotalVidro.toFixed(2)} m² × ${getValor("vidro").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: areaTotalVidro * getValor("vidro"),
      grupo: "estrutural",
    },
    {
      label: "Perfil U 10mm",
      detalhe: `${metragemPerfilU.toFixed(2)} m lineares → ${qtdBarrasPerfilU} barra(s) de 6m`,
      subtotal: qtdBarrasPerfilU * getValor("perfilU"),
      grupo: "estrutural",
    },
    {
      label: "Tubo 2x2",
      detalhe:
        vaos.length > 0
          ? `Plano de corte por vão (sem emendas): ${resumoTubo2x2PorVao.join("; ")} → ${qtdBarrasTubo2x2} barra(s) de 6m (${metragemTubo2x2Cobrada.toFixed(2)} m cobrados)`
          : "Nenhum vão cadastrado",
      // Nota: o subtotal aqui pode sair com casas decimais se o preço da barra
      // (getValor) tiver — isso é esperado e não viola a Regra de Ouro: o arredondamento
      // final pra inteiro é aplicado de forma centralizada sobre TODO CalculoItem.subtotal
      // em lib/useCalculator.ts (Math.round), a mesma regra que já vale pra qualquer
      // outro modelo/estratégia — não duplicamos essa lógica aqui.
      subtotal: qtdBarrasTubo2x2 * getValor("tubo2x2"),
      grupo: "estrutural",
    },
    {
      label: "Perfil Engenharia",
      detalhe: `${metragemPerfilEngenharia.toFixed(2)} m lineares → ${qtdBarrasPerfilEngenharia} barra(s) de 6m`,
      subtotal: qtdBarrasPerfilEngenharia * getValor("perfilEngenharia"),
      grupo: "estrutural",
    },
  ];
}

export const estrategiaSlim: EstrategiaCalculoModelo = {
  id: "slim",
  nome: "Divisória Slim",
  usaTipoVao: true,
  usaCorVidro: false,
  chavesCatalogo: ["vidro", "perfilU", "tubo2x2", "perfilEngenharia"],
  calcularEstrutura,
};
