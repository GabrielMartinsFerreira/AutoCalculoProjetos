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
 * manter uma única noção de "área faturável" do espelho. É a área de UMA peça — a
 * quantidade (ver `quantidadeEspelho` abaixo) multiplica por fora, não altera o piso.
 */
export function areaCobradaEspelho(inputs: Pick<ProjectInputs, "larguraEspelho" | "alturaEspelho">) {
  return Math.max(inputs.larguraEspelho * inputs.alturaEspelho, AREA_MINIMA_M2);
}

/**
 * Quantidade de espelhos idênticos (mesma medida/acabamento) representados por este
 * item — multiplicador de unidades, pra cotar várias peças iguais num item só do
 * carrinho em vez de duplicar o item várias vezes. Sempre >= 1 (inteiro): ausente,
 * zerado, negativo ou fracionário (dado antigo sem o campo, ou edição inválida na UI)
 * cai pro mínimo de 1 peça. Exportada porque lib/useCalculator.ts usa o mesmo piso pros
 * adicionais do espelho (Desembaçador/Recorte/Chassis/Touch Screen), que também são
 * "por peça" e precisam ser multiplicados pela mesma quantidade.
 */
export function quantidadeEspelho(inputs: Pick<ProjectInputs, "quantidade">): number {
  return Math.max(1, Math.round(inputs.quantidade ?? 1));
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const quantidade = quantidadeEspelho(inputs);
  const areaReal = inputs.larguraEspelho * inputs.alturaEspelho;
  // Piso de 0,3m² avaliado POR UNIDADE — a quantidade multiplica depois, não infla o piso.
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
  const subtotalUnitario = areaCobrada * valorM2;
  // Regra de Ouro: a multiplicação pela quantidade é onde frações de centavo podem
  // reaparecer (preço/m² com decimais × área × N peças) — arredonda aqui, explicitamente,
  // antes de somar ao total (redundante com o arredondamento central de
  // lib/useCalculator.ts sobre todo CalculoItem.subtotal, mas intencional: garante zero
  // centavos já na origem do valor multiplicado, não só na agregação final).
  const subtotalBaseTotal = Math.round(subtotalUnitario * quantidade);
  const valorUnitarioFmt = subtotalUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const valorM2Fmt = valorM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const itens: CalculoItem[] = [
    {
      label: `Espelho — ${opcaoEscolhida.label}${especial ? " (modelo especial)" : ""}`,
      detalhe: `${quantidade} un × ${valorUnitarioFmt} (${areaReal.toFixed(2)} m²${areaForcada ? ` → mín. ${AREA_MINIMA_M2.toFixed(2)} m²/un` : ""} × ${valorM2Fmt}/m²)`,
      subtotal: subtotalBaseTotal,
      grupo: "estrutural",
    },
  ];

  // Junção/Revestimento/Modelo: +20% sobre o subtotal base do vidro JÁ multiplicado
  // pela quantidade (matematicamente igual a aplicar por unidade e depois multiplicar)
  // — não incide sobre os adicionais avulsos abaixo (são hardware itemizado à parte,
  // ver lib/useCalculator.ts).
  if (inputs.incluirJuncaoRevestimentoEspelho) {
    itens.push({
      label: "Junção / Revestimento / Modelo (+20%)",
      detalhe: `+20% sobre ${subtotalBaseTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${quantidade} un já considerada)`,
      subtotal: Math.round(subtotalBaseTotal * 0.2),
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
