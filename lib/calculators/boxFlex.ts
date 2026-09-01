import type { CalculoItem, ProjectInputs } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

/**
 * Box Flex — fórmula PROPRIETÁRIA, totalmente separada do Box Padrão
 * (lib/calculators/box.ts): composição de custo fixo + lucro operacional embutido +
 * taxa de fechamento (NF/Cartão) sobre o subtotal, além de vidro cobrado por m² (o Box
 * Padrão é preço fechado por medida frontal, sem m²). Decisão explícita do briefing:
 * estes valores NÃO vêm do catálogo de produtos (ProductKey) — são constantes fixas
 * desta estratégia, não editáveis pelo usuário comum em Cadastro de Produtos. É a única
 * exceção desse tipo no sistema; todo o resto do catálogo é editável.
 */
const VALOR_VIDRO_M2 = 180;
/** Kit Padrão (R$1300) + Silicone (R$30) + Lucro Operacional (R$1300), por unidade. */
const CUSTO_FIXO_BASE = 2630;
const VALOR_DOBRADICA_AVULSA = 550;
/** Taxa de fechamento (NF e Cartão) sobre o subtotal geral já multiplicado pela quantidade. */
const PERCENTUAL_TAXA = 0.15;

function quantidadeBoxFlex(inputs: Pick<ProjectInputs, "quantidade">): number {
  return Math.max(1, Math.round(inputs.quantidade ?? 1));
}

// getValor não é usado: Box Flex não lê preço nenhum do catálogo (única estratégia do
// sistema assim, ver comentário no topo do arquivo) — assinatura exigida pela interface
// EstrategiaCalculoModelo mesmo assim.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const quantidade = quantidadeBoxFlex(inputs);
  const m2 = inputs.larguraBoxFlex * inputs.alturaBoxFlex;
  const sufixoQtd = quantidade > 1 ? ` · já multiplicado por ${quantidade} un` : "";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Cascata da fórmula (ver briefing): vidro + custo fixo + opcional formam o subtotal
  // de UMA unidade; multiplica pela quantidade; só então a taxa de 15% incide sobre
  // esse subtotal geral já multiplicado — nunca sobre a unidade isolada.
  const custoVidroUnitario = m2 * VALOR_VIDRO_M2;
  const custoDobradicaUnitario = inputs.dobradicaAvulsa ? VALOR_DOBRADICA_AVULSA : 0;
  const subtotalUnidade = custoVidroUnitario + CUSTO_FIXO_BASE + custoDobradicaUnitario;
  // Regra de Ouro: arredonda o subtotal geral ANTES de calcular a taxa sobre ele — é
  // sobre esse valor redondo que os 15% incidem, pra taxa nunca nascer de uma dízima.
  const subtotalGeral = Math.round(subtotalUnidade * quantidade);
  const valorTaxa = Math.round(subtotalGeral * PERCENTUAL_TAXA);

  const itens: CalculoItem[] = [
    {
      label: "Vidro Box Flex",
      detalhe: `${m2.toFixed(2)} m² a ${fmt(VALOR_VIDRO_M2)}/m²${sufixoQtd}`,
      subtotal: Math.round(custoVidroUnitario * quantidade),
      grupo: "estrutural",
    },
    {
      label: "Kit Padrão, Silicone e Lucro",
      detalhe: `Valor fixo de ${fmt(CUSTO_FIXO_BASE)} por unidade${sufixoQtd}`,
      subtotal: Math.round(CUSTO_FIXO_BASE * quantidade),
      grupo: "estrutural",
    },
  ];

  if (inputs.dobradicaAvulsa) {
    itens.push({
      label: "Dobradiça Avulsa",
      detalhe: `Até o teto — inclui dobradiça avulsa${sufixoQtd}`,
      subtotal: Math.round(custoDobradicaUnitario * quantidade),
      grupo: "estrutural",
    });
  }

  itens.push({
    label: "Taxa NF e Cartão (15%)",
    detalhe: `15% sobre ${fmt(subtotalGeral)}${sufixoQtd}`,
    subtotal: valorTaxa,
    grupo: "estrutural",
  });

  return itens;
}

export const estrategiaBoxFlex: EstrategiaCalculoModelo = {
  id: "boxFlex",
  nome: "Box Flex",
  usaTipoVao: false,
  usaCorVidro: false,
  calcularEstrutura,
};
