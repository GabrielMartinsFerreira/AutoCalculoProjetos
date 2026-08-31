import type { CalculoItem, ProjectInputs, Vao } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

/**
 * Kit da Sacada é definido pela LARGURA de cada vão (não pela área) — tabela de faixas,
 * do menor pro maior. A faixa de 6m é a "unidade máxima": vãos maiores que 6m combinam
 * kits (ex.: 7m = 1 kit de 6m + 1 kit de 2m), fatiando sempre pelo maior kit possível.
 */
const FAIXAS_KIT: { ateMetros: number; key: "kitSacada2m" | "kitSacada3m" | "kitSacada4m" | "kitSacada6m" }[] = [
  { ateMetros: 2, key: "kitSacada2m" },
  { ateMetros: 3, key: "kitSacada3m" },
  { ateMetros: 4, key: "kitSacada4m" },
  { ateMetros: 6, key: "kitSacada6m" },
];
const FAIXA_MAXIMA = FAIXAS_KIT[FAIXAS_KIT.length - 1]; // 6m

/**
 * Devolve a lista de faixas de kit usadas para cobrir uma largura (pode ser mais de uma,
 * se > 6m) — cada entrada é uma faixa efetivamente cobrada.
 */
function combinarKits(larguraMetros: number): (typeof FAIXAS_KIT)[number][] {
  const combinacao: (typeof FAIXAS_KIT)[number][] = [];
  let restante = larguraMetros;

  while (restante > FAIXA_MAXIMA.ateMetros) {
    combinacao.push(FAIXA_MAXIMA);
    restante -= FAIXA_MAXIMA.ateMetros;
  }
  combinacao.push(FAIXAS_KIT.find((f) => restante <= f.ateMetros) ?? FAIXA_MAXIMA);

  return combinacao;
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const vaos: Vao[] = inputs.vaos;
  const areaVidro = vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);

  const keyVidro = inputs.corVidroSacada === "verde" ? "vidroSacadaVerde" : "vidroSacadaIncolor";
  const nomeCor = inputs.corVidroSacada === "verde" ? "VERDE" : "INCOLOR";
  const valorVidro = getValor(keyVidro);

  // Cada vão tem seu próprio kit (ou combinação de kits), somados no final.
  let custoKits = 0;
  const resumoKitsPorVao: string[] = [];
  for (const vao of vaos) {
    const faixas = combinarKits(vao.largura);
    const custoVao = faixas.reduce((acc, f) => acc + getValor(f.key), 0);
    custoKits += custoVao;
    const descricaoFaixas = faixas.map((f) => `${f.ateMetros}m`).join(" + ");
    resumoKitsPorVao.push(`${vao.largura.toFixed(2)}m → ${descricaoFaixas}`);
  }

  return [
    {
      label: `Vidro Laminado 10mm ${nomeCor}`,
      detalhe: `${areaVidro.toFixed(2)} m² × ${valorVidro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: areaVidro * valorVidro,
      grupo: "estrutural",
    },
    {
      label: "Kit(s) da Sacada",
      detalhe:
        vaos.length > 0
          ? `por vão: ${resumoKitsPorVao.join("; ")}`
          : "Nenhum vão cadastrado",
      subtotal: custoKits,
      grupo: "estrutural",
    },
  ];
}

export const estrategiaSacada: EstrategiaCalculoModelo = {
  id: "sacada",
  nome: "Sacada",
  usaTipoVao: false,
  usaCorVidro: true,
  calcularEstrutura,
};
