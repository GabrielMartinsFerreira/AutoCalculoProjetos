import type { CalculoItem, PecaEspelho, ProductKey, ProjectInputs } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

/** Área mínima cobrada por peça de espelho, em m² — qualquer peça menor é faturada como se tivesse esse tamanho. */
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

/** Chaves de catálogo que a fórmula estrutural do Espelho lê (modelos base + especiais). */
export const CHAVES_MODELOS_ESPELHO: ProductKey[] = [...MODELOS_BASE_ESPELHO, ...MODELOS_ESPECIAIS_ESPELHO].map(
  (m) => m.key
);

/** Quantidade de UMA peça — sempre inteiro >= 1 (ausente, zero, negativo ou fracionário cai pra 1). */
export function quantidadePeca(peca: Pick<PecaEspelho, "quantidade">): number {
  return Math.max(1, Math.round(peca.quantidade ?? 1));
}

/**
 * Área efetivamente cobrada de UMA peça (aplica o piso de AREA_MINIMA_M2) — a quantidade
 * multiplica por fora, não altera o piso de nenhuma peça individual.
 */
export function areaCobradaPeca(peca: Pick<PecaEspelho, "largura" | "altura">): number {
  return Math.max(peca.largura * peca.altura, AREA_MINIMA_M2);
}

/**
 * Peças do item. Fallback pro formato antigo (larguraEspelho/alturaEspelho/quantidade —
 * uma medida única por item): payloads salvos antes de `pecasEspelho` existir passam por
 * `normalizarInputsItem` (lib/store.ts) ao serem abertos, mas o cálculo também se
 * protege sozinho, pra nunca quebrar com um objeto de outra época.
 */
export function pecasDoEspelho(inputs: ProjectInputs): PecaEspelho[] {
  if (Array.isArray(inputs.pecasEspelho) && inputs.pecasEspelho.length > 0) return inputs.pecasEspelho;
  return [
    {
      id: "legado",
      largura: inputs.larguraEspelho ?? 1,
      altura: inputs.alturaEspelho ?? 1,
      quantidade: inputs.quantidade ?? 1,
    },
  ];
}

/** Total de espelhos do item (soma das quantidades de todas as peças) — base dos adicionais "por peça". */
export function totalEspelhosDoItem(inputs: ProjectInputs): number {
  return pecasDoEspelho(inputs).reduce((acc, p) => acc + quantidadePeca(p), 0);
}

/** Área faturável total do item (Σ área cobrada × quantidade de cada peça) — base do Desembaçador (R$/m²). */
export function areaCobradaTotalEspelho(inputs: ProjectInputs): number {
  return pecasDoEspelho(inputs).reduce((acc, p) => acc + areaCobradaPeca(p) * quantidadePeca(p), 0);
}

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const pecas = pecasDoEspelho(inputs);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const nomeModelo = `${opcaoEscolhida.label}${especial ? " (modelo especial)" : ""}`;

  // Uma linha por peça (medidas diferentes ficam visíveis pro vendedor). Regra de Ouro:
  // cada peça já sai arredondada na multiplicação pela quantidade (redundante com o
  // arredondamento central de lib/useCalculator.ts, mas explícito de propósito).
  let subtotalBaseTotal = 0;
  const itens: CalculoItem[] = pecas.map((peca, i) => {
    const qtd = quantidadePeca(peca);
    const areaReal = peca.largura * peca.altura;
    const areaCobrada = areaCobradaPeca(peca);
    const areaForcada = areaCobrada > areaReal;
    const subtotalUnitario = areaCobrada * valorM2;
    const subtotal = Math.round(subtotalUnitario * qtd);
    subtotalBaseTotal += subtotal;
    return {
      label: pecas.length > 1 ? `Espelho #${String(i + 1).padStart(2, "0")} — ${nomeModelo}` : `Espelho — ${nomeModelo}`,
      detalhe: `${qtd} un × ${fmt(subtotalUnitario)} (${peca.largura.toFixed(2)}×${peca.altura.toFixed(2)}m = ${areaReal.toFixed(2)} m²${areaForcada ? ` → mín. ${AREA_MINIMA_M2.toFixed(2)} m²` : ""} × ${fmt(valorM2)}/m²)`,
      subtotal,
      grupo: "estrutural",
    };
  });

  // Junção/Revestimento/Modelo: +20% sobre o subtotal base do vidro de TODAS as peças
  // (não incide sobre os adicionais avulsos — desembaçador/recorte/chassis/touch são
  // hardware itemizado à parte, ver lib/useCalculator.ts).
  if (inputs.incluirJuncaoRevestimentoEspelho) {
    itens.push({
      label: "Junção / Revestimento / Modelo (+20%)",
      detalhe: `+20% sobre ${fmt(subtotalBaseTotal)} (${pecas.length > 1 ? "todas as peças" : "vidro base"})`,
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
  chavesCatalogo: CHAVES_MODELOS_ESPELHO,
  calcularEstrutura,
};
