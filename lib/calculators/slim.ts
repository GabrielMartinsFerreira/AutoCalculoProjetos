import type { CalculoItem, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

function perimetroTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + 2 * v.largura + 2 * v.altura, 0);
}

/**
 * U invertido (laterais + topo, sem o vão embaixo):
 * - Fixo / Porta de Abrir: tudo em Tubo 2x2.
 * - Porta de Correr: laterais em Tubo 2x2, topo (trilho) em Perfil Engenharia.
 */
function metragensUInvertido(vaos: Vao[]) {
  return vaos.reduce(
    (acc, v) => {
      if (v.tipo === "Porta de Correr") {
        acc.tubo2x2 += 2 * v.altura;
        acc.perfilEngenharia += v.largura;
      } else {
        acc.tubo2x2 += 2 * v.altura + v.largura;
      }
      return acc;
    },
    { tubo2x2: 0, perfilEngenharia: 0 }
  );
}

function calcularEstrutura(vaos: Vao[], getValor: GetValor): CalculoItem[] {
  const areaTotalVidro = areaTotal(vaos);
  const metragemPerfilU = perimetroTotal(vaos);
  const { tubo2x2: metragemTubo2x2, perfilEngenharia: metragemPerfilEngenharia } =
    metragensUInvertido(vaos);

  const qtdBarrasPerfilU = Math.ceil(metragemPerfilU / 6);
  const qtdBarrasTubo2x2 = Math.ceil(metragemTubo2x2 / 6);
  const qtdBarrasPerfilEngenharia = Math.ceil(metragemPerfilEngenharia / 6);

  return [
    {
      label: "Vidro",
      detalhe: `${areaTotalVidro.toFixed(2)} m² × ${getValor("vidro").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: areaTotalVidro * getValor("vidro"),
    },
    {
      label: "Perfil U 10mm",
      detalhe: `${metragemPerfilU.toFixed(2)} m lineares → ${qtdBarrasPerfilU} barra(s) de 6m`,
      subtotal: qtdBarrasPerfilU * getValor("perfilU"),
    },
    {
      label: "Tubo 2x2",
      detalhe: `${metragemTubo2x2.toFixed(2)} m lineares → ${qtdBarrasTubo2x2} barra(s) de 6m`,
      subtotal: qtdBarrasTubo2x2 * getValor("tubo2x2"),
    },
    {
      label: "Perfil Engenharia",
      detalhe: `${metragemPerfilEngenharia.toFixed(2)} m lineares → ${qtdBarrasPerfilEngenharia} barra(s) de 6m`,
      subtotal: qtdBarrasPerfilEngenharia * getValor("perfilEngenharia"),
    },
  ];
}

export const estrategiaSlim: EstrategiaCalculoModelo = {
  id: "slim",
  nome: "Divisória Slim",
  usaTipoVao: true,
  calcularEstrutura,
};
