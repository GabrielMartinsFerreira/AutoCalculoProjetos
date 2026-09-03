import { calcularPlanoDeCorte } from "./utils";
import type { CalculoItem, ProjectInputs, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

const TAMANHO_BARRA_M = 6;

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

/**
 * Perfil Engenharia (trilho de topo, só em "Porta de Correr") continua uma soma linear
 * simples — fora do escopo do Plano de Corte por decisão explícita (a peça do trilho é
 * vendida/cortada por metro corrido, sem a mesma verificação de retalho mínimo).
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
 * Cortes de Perfil U de UM vão: o perfil emoldura o vidro no perímetro inteiro,
 * independente do tipo — topo, base (as duas horizontais) e as duas laterais
 * (verticais).
 */
function cortesPerfilUDoVao(vao: Vao): number[] {
  return [vao.largura, vao.largura, vao.altura, vao.altura];
}

/**
 * Plano de corte do Tubo 2x2 do PROJETO: cada vão é cortado a partir do seu PRÓPRIO
 * conjunto de barras de 6m (`calcularPlanoDeCorte`, com a regra de retalho mínimo de
 * 2m) — a sobra de um vão nunca é reaproveitada pelo próximo (na obra, cada vão é uma
 * frente de corte isolada, não uma barra compartilhada entre módulos diferentes). Por
 * isso o total de barras é a SOMA das barras de cada vão calculadas isoladamente, não
 * o resultado de um plano de corte único sobre a metragem total do projeto.
 */
function planoCorteTubo2x2(vaos: Vao[]) {
  let totalBarras = 0;
  const resumoPorVao: string[] = [];

  for (const vao of vaos) {
    const cortes = cortesTubo2x2DoVao(vao);
    const barrasDoVao = calcularPlanoDeCorte(cortes, TAMANHO_BARRA_M);
    totalBarras += barrasDoVao;
    resumoPorVao.push(`${cortes.map((c) => `${c.toFixed(2)}m`).join("+")} → ${barrasDoVao} barra(s)`);
  }

  return { totalBarras, resumoPorVao };
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const { vaos } = inputs;
  const areaTotalVidro = areaTotal(vaos);
  const metragemPerfilEngenharia = perfilEngenhariaTotal(vaos);
  const qtdBarrasPerfilEngenharia = Math.ceil(metragemPerfilEngenharia / TAMANHO_BARRA_M);

  // Tubo 2x2: plano de corte isolado por vão (zero emendas, retalho < 2m descartado) —
  // ver planoCorteTubo2x2 acima.
  const { totalBarras: qtdBarrasTubo2x2, resumoPorVao: resumoTubo2x2PorVao } = planoCorteTubo2x2(vaos);
  const metragemTubo2x2Cobrada = qtdBarrasTubo2x2 * TAMANHO_BARRA_M;

  // Perfil U: permite emenda entre peças (diferente do Tubo 2x2), então os cortes de
  // TODOS os vãos entram no mesmo plano de corte — um pool de barras compartilhado pro
  // projeto inteiro, com a mesma regra de retalho mínimo de 2m (substitui a antiga soma
  // linear ÷ 6, que presumia reaproveitamento de qualquer sobra, por menor que fosse).
  const cortesPerfilU = vaos.flatMap(cortesPerfilUDoVao);
  const qtdBarrasPerfilU = calcularPlanoDeCorte(cortesPerfilU, TAMANHO_BARRA_M);
  const metragemPerfilUCobrada = qtdBarrasPerfilU * TAMANHO_BARRA_M;

  return [
    {
      label: "Vidro",
      detalhe: `${areaTotalVidro.toFixed(2)} m² × ${getValor("vidro").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: Math.round(areaTotalVidro * getValor("vidro")),
      grupo: "estrutural",
    },
    {
      label: "Perfil U 10mm",
      detalhe:
        vaos.length > 0
          ? `Plano de corte (retalho < 2,00m descartado): ${cortesPerfilU.map((c) => `${c.toFixed(2)}m`).join("+")} → ${qtdBarrasPerfilU} barra(s) de 6m (${metragemPerfilUCobrada.toFixed(2)} m cobrados)`
          : "Nenhum vão cadastrado",
      subtotal: Math.round(qtdBarrasPerfilU * getValor("perfilU")),
      grupo: "estrutural",
    },
    {
      label: "Tubo 2x2",
      detalhe:
        vaos.length > 0
          ? `Plano de corte por vão (sem emendas, retalho < 2,00m descartado): ${resumoTubo2x2PorVao.join("; ")} → ${qtdBarrasTubo2x2} barra(s) de 6m (${metragemTubo2x2Cobrada.toFixed(2)} m cobrados)`
          : "Nenhum vão cadastrado",
      subtotal: Math.round(qtdBarrasTubo2x2 * getValor("tubo2x2")),
      grupo: "estrutural",
    },
    {
      label: "Perfil Engenharia",
      detalhe: `${metragemPerfilEngenharia.toFixed(2)} m lineares → ${qtdBarrasPerfilEngenharia} barra(s) de 6m`,
      subtotal: Math.round(qtdBarrasPerfilEngenharia * getValor("perfilEngenharia")),
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
