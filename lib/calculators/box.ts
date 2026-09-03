import type { CalculoItem, ProductKey, ProjectInputs } from "../types";
import type { EstrategiaCalculoModelo, GetValor } from "./types";

/**
 * Box Padrão não usa m² nem vãos — é preço FECHADO, cruzando "Medida Frontal" (largura
 * nominal da peça, restrita a estas 8 opções) com "Tipo de Pagamento" (À Vista/Cartão).
 * Cada combinação tem sua própria chave no catálogo (editável em Cadastro de Produtos,
 * igual a qualquer outro preço do sistema) — os valores aqui são só os rótulos/mapeamento
 * pra UI, o preço em si sempre vem do catálogo via `getValor`.
 */
export interface OpcaoMedidaBox {
  valor: string;
  larguraLabel: string;
  abertura: string;
  keyVista: ProductKey;
  keyCartao: ProductKey;
}

export const OPCOES_MEDIDA_BOX: OpcaoMedidaBox[] = [
  { valor: "900", larguraLabel: "900mm", abertura: "Abrir", keyVista: "box900Vista", keyCartao: "box900Cartao" },
  {
    valor: "1000",
    larguraLabel: "1000mm",
    abertura: "Correr 2 Pçs",
    keyVista: "box1000Vista",
    keyCartao: "box1000Cartao",
  },
  {
    valor: "1200",
    larguraLabel: "1200mm",
    abertura: "Correr 2 Pçs",
    keyVista: "box1200Vista",
    keyCartao: "box1200Cartao",
  },
  {
    valor: "1330",
    larguraLabel: "1330mm",
    abertura: "Correr 2 Pçs",
    keyVista: "box1330Vista",
    keyCartao: "box1330Cartao",
  },
  {
    valor: "1500",
    larguraLabel: "1500mm",
    abertura: "Correr 2 Pçs",
    keyVista: "box1500Vista",
    keyCartao: "box1500Cartao",
  },
  {
    valor: "1800",
    larguraLabel: "1800mm",
    abertura: "Correr 4 Pçs",
    keyVista: "box1800Vista",
    keyCartao: "box1800Cartao",
  },
  {
    valor: "2000",
    larguraLabel: "2000mm",
    abertura: "Correr 4 Pçs",
    keyVista: "box2000Vista",
    keyCartao: "box2000Cartao",
  },
  {
    valor: "2200",
    larguraLabel: "2200mm",
    abertura: "Correr 4 Pçs",
    keyVista: "box2200Vista",
    keyCartao: "box2200Cartao",
  },
];

function calcularEstrutura(inputs: ProjectInputs, getValor: GetValor): CalculoItem[] {
  const opcao = OPCOES_MEDIDA_BOX.find((o) => o.valor === inputs.medidaFrontalBox);

  if (!opcao) {
    return [
      {
        label: "Box Padrão",
        detalhe: "Selecione a medida frontal",
        subtotal: 0,
        grupo: "estrutural",
      },
    ];
  }

  const key = inputs.tipoPagamentoBox === "cartao" ? opcao.keyCartao : opcao.keyVista;
  const nomePagamento = inputs.tipoPagamentoBox === "cartao" ? "Cartão" : "À Vista";

  return [
    {
      label: `Box Padrão ${opcao.larguraLabel} (${opcao.abertura})`,
      detalhe: `Alumínio Fosco/Branco/Preto · Pagamento ${nomePagamento} · preço de tabela`,
      subtotal: getValor(key),
      grupo: "estrutural",
    },
  ];
}

export const estrategiaBox: EstrategiaCalculoModelo = {
  id: "box",
  nome: "Box Padrão",
  usaTipoVao: false,
  usaCorVidro: false,
  chavesCatalogo: OPCOES_MEDIDA_BOX.flatMap((o) => [o.keyVista, o.keyCartao]),
  calcularEstrutura,
};
