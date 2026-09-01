import type { CalculoItem, ProductKey, ProjectInputs } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

/** Área mínima cobrada por espelho, em m² — qualquer peça menor é faturada como se tivesse esse tamanho. */
export const AREA_MINIMA_M2 = 0.3;

export interface OpcaoModeloEspelho {
  key: ProductKey;
  label: string;
}

/** Modelos base: material + acabamento, preço por m² (catálogo). */
export const MODELOS_BASE_ESPELHO: OpcaoModeloEspelho[] = [
  { key: "espelhoGuardian4mmLapidado", label: "Guardian 4mm — Lapidado" },
  { key: "espelhoGuardian4mmBizote", label: "Guardian 4mm — Bizote" },
  { key: "espelhoGuardian4mmBizoteJuncao", label: "Guardian 4mm — Bizote c/ Junção" },
  { key: "espelhoCebrace5mmLapidado", label: "Cebrace 5mm — Lapidado" },
  { key: "espelhoCebrace5mmBizote", label: "Cebrace 5mm — Bizote" },
  { key: "espelhoCebrace6mmLapidado", label: "Cebrace 6mm — Lapidado" },
  { key: "espelhoCebrace6mmBizote", label: "Cebrace 6mm — Bizote" },
  { key: "espelhoBronzeFume4mmLapidado", label: "Bronze/Fumê 4mm — Lapidado" },
  { key: "espelhoBronzeFume4mmBizote", label: "Bronze/Fumê 4mm — Bizote" },
];

/** Modelos especiais: preço FECHADO por m², anula o modelo base quando escolhido. */
export const MODELOS_ESPECIAIS_ESPELHO: OpcaoModeloEspelho[] = [
  { key: "espelhoOrganicoComMoldura", label: "Orgânico c/ Moldura" },
  { key: "espelhoOrganico", label: "Orgânico" },
  { key: "espelhoOrganicoComLed", label: "Orgânico c/ Led" },
  { key: "espelhoLedFrontal", label: "Led Frontal" },
  { key: "espelhoLedExpandido", label: "Led Expandido" },
  { key: "espelhoOvalComMoldura", label: "Oval c/ Moldura" },
  { key: "espelhoOvalSemMoldura", label: "Oval s/ Moldura" },
  { key: "espelhoCantoMoeda", label: "Canto Moeda" },
  { key: "espelhoMeiaLuaComLed", label: "Meia Lua com Led" },
];

/**
 * Área efetivamente cobrada (aplica o piso de AREA_MINIMA_M2) — usada tanto pro vidro em
 * si quanto pelo Desembaçador Elétrico (também R$/m², ver lib/useCalculator.ts), pra
 * manter uma única noção de "área faturável" do espelho.
 */
export function areaCobradaEspelho(inputs: Pick<ProjectInputs, "larguraEspelho" | "alturaEspelho">) {
  return Math.max(inputs.larguraEspelho * inputs.alturaEspelho, AREA_MINIMA_M2);
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const areaReal = inputs.larguraEspelho * inputs.alturaEspelho;
  const areaCobrada = areaCobradaEspelho(inputs);
  const areaForcada = areaCobrada > areaReal;

  // Modelo especial (preço fechado) anula o modelo base quando escolhido.
  const especial = MODELOS_ESPECIAIS_ESPELHO.find((m) => m.key === inputs.espelhoModeloEspecial);
  const base = MODELOS_BASE_ESPELHO.find((m) => m.key === inputs.espelhoModeloBase);
  const opcaoEscolhida = especial ?? base;

  if (!opcaoEscolhida) {
    return [
      {
        label: "Espelho",
        detalhe: "Selecione um modelo (base ou especial)",
        subtotal: 0,
        grupo: "estrutural",
      },
    ];
  }

  const valorM2 = getValor(opcaoEscolhida.key);
  const subtotalBase = areaCobrada * valorM2;

  const itens: CalculoItem[] = [
    {
      label: `Espelho — ${opcaoEscolhida.label}${especial ? " (modelo especial)" : ""}`,
      detalhe: `${areaReal.toFixed(2)} m²${areaForcada ? ` → mínimo cobrado ${AREA_MINIMA_M2.toFixed(2)} m²` : ""} × ${valorM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²`,
      subtotal: subtotalBase,
      grupo: "estrutural",
    },
  ];

  // Junção/Revestimento/Modelo: +20% sobre o subtotal base do vidro (antes dos
  // adicionais avulsos como desembaçador/recorte/chassis/touch, que são hardware
  // itemizado à parte — ver lib/useCalculator.ts).
  if (inputs.incluirJuncaoRevestimentoEspelho) {
    itens.push({
      label: "Junção / Revestimento / Modelo (+20%)",
      detalhe: `+20% sobre ${subtotalBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtotal: subtotalBase * 0.2,
      grupo: "estrutural",
    });
  }

  return itens;
}

export const estrategiaEspelho: EstrategiaCalculoModelo = {
  id: "espelho",
  nome: "Espelhos",
  usaTipoVao: false,
  usaCorVidro: false,
  calcularEstrutura,
};
