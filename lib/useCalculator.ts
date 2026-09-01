import { useMemo } from "react";
import { EMPTY_PRODUCTS, useOrcamentoDetalhadoDraft, useProductStore } from "./store";
import { obterEstrategia } from "./calculators";
import { areaCobradaEspelho, quantidadeEspelho } from "./calculators/espelho";
import type {
  CalculoItem,
  ItemOrcamentoDetalhado,
  Product,
  ProductKey,
  ProjectInputs,
  ResultadoCalculo,
  TipoRT,
  Vao,
} from "./types";

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

/**
 * Calcula o orçamento de UM item do carrinho: itens estruturais vêm da estratégia do
 * modelo (lib/calculators) — cada modelo pode ter sua própria fórmula. Ferragens e
 * opcionais universais abaixo só se aplicam a itens do tipo "divisória" (qualquer
 * modeloId que não seja "box"/"espelho" — ambos têm preço fechado ou adicionais
 * próprios, ver seção 4 do CLAUDE.md). A Reserva Técnica NÃO é calculada aqui — desde a
 * reforma "Carrinho" ela é global do projeto inteiro, aplicada uma única vez sobre o
 * Total Geral em `calcularResumoCarrinho`, não mais por item.
 *
 * REGRA DE OURO: todo subtotal é arredondado (Math.round) neste ponto, no core — a
 * partir daqui o sistema nunca mais trabalha com centavos em nenhum item ou subtotal.
 * A UI só formata pra exibição (formatBRL), não arredonda de novo por conta própria.
 */
export function calcularOrcamento(
  inputs: ProjectInputs,
  products: Product[],
  modeloId: string
): ResultadoCalculo {
  const { vaos } = inputs;
  const getValor = (key: ProductKey) => products.find((p) => p.key === key)?.valor ?? 0;
  const areaTotalVidro = areaTotal(vaos);

  const estrategia = obterEstrategia(modeloId);
  const itens: CalculoItem[] = [...estrategia.calcularEstrutura(inputs, getValor)];

  // Box (e Box Flex) têm preço fechado/fórmula própria e Espelho tem seus próprios
  // adicionais (grupo dedicado abaixo) — nenhum deles usa ferragens/opcionais
  // "universais" de divisória.
  const ehItemFechado = modeloId === "box" || modeloId === "boxFlex" || modeloId === "espelho";

  if (!ehItemFechado) {
    itens.push(
      {
        label: "Puxador H 40cm",
        detalhe: `${inputs.qtdPuxadores} un`,
        subtotal: inputs.qtdPuxadores * getValor("puxadorH"),
        grupo: "opcional",
      },
      {
        label: "Fechadura PT Correr",
        detalhe: `${inputs.qtdFechaduras} un`,
        subtotal: inputs.qtdFechaduras * getValor("fechadura"),
        grupo: "opcional",
      },
      {
        label: "Película",
        detalhe: inputs.incluirPelicula ? `${areaTotalVidro.toFixed(2)} m²` : "Não incluída",
        subtotal: inputs.incluirPelicula ? areaTotalVidro * getValor("pelicula") : 0,
        grupo: "opcional",
      },
      {
        label: "Lã de Vidro",
        detalhe: inputs.incluirLaDeVidro ? `${areaTotalVidro.toFixed(2)} m²` : "Não incluída",
        subtotal: inputs.incluirLaDeVidro ? areaTotalVidro * getValor("laDeVidro") : 0,
        grupo: "opcional",
      },
      {
        label: "Porta Premium",
        detalhe: `${inputs.qtdPortaPremium} un`,
        subtotal: inputs.qtdPortaPremium * getValor("portaPremium"),
        grupo: "opcional",
      },
      {
        label: "Kit Porta Simples",
        detalhe: `${inputs.qtdKitPortaSimples} un`,
        subtotal: inputs.qtdKitPortaSimples * getValor("kitPortaSimples"),
        grupo: "opcional",
      },
      {
        label: "Kit Porta Dupla",
        detalhe: `${inputs.qtdKitPortaDupla} un`,
        subtotal: inputs.qtdKitPortaDupla * getValor("kitPortaDupla"),
        grupo: "opcional",
      },
      {
        label: "Adicional Noturno",
        detalhe: `${inputs.qtdNoitesInstalacao} noite(s)`,
        subtotal: inputs.qtdNoitesInstalacao * getValor("adicionalNoturno"),
        grupo: "opcional",
      }
    );
  }

  // Opcionais exclusivos da Sacada — isolados de propósito: não aparecem nem contam
  // pra nenhum outro modelo (Slim, MiterGlass, BlindGlass...).
  if (modeloId === "sacada") {
    itens.push(
      {
        label: "ART Engenheiro",
        detalhe: inputs.incluirArtEngenheiro ? "Incluído (valor fixo)" : "Não incluído",
        subtotal: inputs.incluirArtEngenheiro ? getValor("artEngenheiro") : 0,
        grupo: "opcional",
      },
      {
        label: "Caixa Ar Condicionado",
        detalhe: `${inputs.qtdCaixaArCondicionado} un`,
        subtotal: inputs.qtdCaixaArCondicionado * getValor("caixaArCondicionado"),
        grupo: "opcional",
      },
      {
        label: "Respiro Alumínio",
        detalhe: `${inputs.m2RespiroAluminio.toFixed(2)} m² (informado manualmente)`,
        subtotal: inputs.m2RespiroAluminio * getValor("respiroAluminio"),
        grupo: "opcional",
      }
    );
  }

  // Adicionais exclusivos do Espelho — mesmo padrão de isolamento da Sacada acima. Cada
  // quantidade informada (qtdRecorteCxLuzEspelho etc.) é POR PEÇA de espelho — o total
  // cobrado multiplica ainda pela quantidade de espelhos idênticos do item (mesma regra
  // do subtotal estrutural em lib/calculators/espelho.ts). Math.round aplicado logo na
  // multiplicação, explícito, mesmo já sendo redundante com o arredondamento central
  // abaixo (Regra de Ouro) — garante zero centavos já na origem do valor multiplicado.
  if (modeloId === "espelho") {
    const quantidadeEspelhos = quantidadeEspelho(inputs);
    const areaEspelho = areaCobradaEspelho(inputs);
    itens.push(
      {
        label: "Desembaçador Elétrico",
        detalhe: inputs.incluirDesembacadorEspelho
          ? `${areaEspelho.toFixed(2)} m²/un × ${quantidadeEspelhos} un`
          : "Não incluído",
        subtotal: inputs.incluirDesembacadorEspelho
          ? Math.round(areaEspelho * getValor("espelhoDesembacador") * quantidadeEspelhos)
          : 0,
        grupo: "opcional",
      },
      {
        label: "Recorte CX de Luz",
        detalhe: `${inputs.qtdRecorteCxLuzEspelho} un/espelho × ${quantidadeEspelhos} un = ${inputs.qtdRecorteCxLuzEspelho * quantidadeEspelhos} un`,
        subtotal: Math.round(inputs.qtdRecorteCxLuzEspelho * getValor("espelhoRecorteCxLuz") * quantidadeEspelhos),
        grupo: "opcional",
      },
      {
        label: "Chassis Perfil U",
        detalhe: `${inputs.qtdChassisPerfilUEspelho} peça(s)/espelho × ${quantidadeEspelhos} un = ${inputs.qtdChassisPerfilUEspelho * quantidadeEspelhos} peça(s)`,
        subtotal: Math.round(
          inputs.qtdChassisPerfilUEspelho * getValor("espelhoChassisPerfilU") * quantidadeEspelhos
        ),
        grupo: "opcional",
      },
      {
        label: "Touch Screen",
        detalhe: `${inputs.qtdTouchScreenEspelho} peça(s)/espelho × ${quantidadeEspelhos} un = ${inputs.qtdTouchScreenEspelho * quantidadeEspelhos} peça(s)`,
        subtotal: Math.round(inputs.qtdTouchScreenEspelho * getValor("espelhoTouchScreen") * quantidadeEspelhos),
        grupo: "opcional",
      }
    );
  }

  // Produtos do catálogo vinculados a um tipo de vão: 1 unidade por vão desse tipo,
  // automaticamente — Box e Espelho não usam vãos tipados, então não se aplica a eles.
  if (!ehItemFechado) {
    for (const produto of products) {
      if (!produto.tipoVaoAssociado) continue;
      const qtd = vaos.filter((v) => v.tipo === produto.tipoVaoAssociado).length;
      itens.push({
        label: produto.nome,
        detalhe: `${qtd} un · vinculado a "${produto.tipoVaoAssociado}"`,
        subtotal: qtd * produto.valor,
        grupo: "opcional",
      });
    }
  }

  // Arredonda cada subtotal aqui, no core — regra de ouro: nada de centavos a partir
  // deste ponto, em nenhum item individual (a UI formata pra exibição, não arredonda).
  const itensArredondados = itens.map((item) => ({ ...item, subtotal: Math.round(item.subtotal) }));

  const subtotalEstrutural = itensArredondados
    .filter((i) => i.grupo === "estrutural")
    .reduce((acc, i) => acc + i.subtotal, 0);
  const subtotalOpcionais = itensArredondados
    .filter((i) => i.grupo === "opcional")
    .reduce((acc, i) => acc + i.subtotal, 0);
  const total = subtotalEstrutural + subtotalOpcionais;

  return { itens: itensArredondados, total, areaTotalVidro, subtotalEstrutural, subtotalOpcionais };
}

/** Live-calc de um único item, fora do contexto do carrinho (ex.: preview isolado). */
export function useCalculator(inputs: ProjectInputs, modeloId: string): ResultadoCalculo {
  const products = useProductStore((s) => s.productsByModelo[modeloId] ?? EMPTY_PRODUCTS);

  return useMemo(() => calcularOrcamento(inputs, products, modeloId), [inputs, products, modeloId]);
}

export interface ResumoItemCarrinho {
  itemId: string;
  ambiente: string;
  modeloId: string;
  resultado: ResultadoCalculo;
}

export interface ResumoCarrinho {
  itens: ResumoItemCarrinho[];
  /** Soma do total de todos os itens, ANTES da Reserva Técnica do projeto. */
  totalGeralAntesDoRT: number;
  valorRTCalculado: number;
  /** Total Geral do orçamento: soma de todos os itens + a RT do projeto. */
  totalGeralFinal: number;
}

/**
 * Agrega todos os itens do carrinho — cada um pode usar um modelo (e catálogo) próprio
 * e diferente dos demais — e aplica a Reserva Técnica UMA ÚNICA VEZ sobre a soma de
 * todos os itens, nunca por item individual (mudou na reforma "Carrinho": antes a RT
 * era por orçamento/item, ver Histórico no CLAUDE.md).
 */
export function calcularResumoCarrinho(
  itensCarrinho: ItemOrcamentoDetalhado[],
  productsByModelo: Record<string, Product[]>,
  tipoRT: TipoRT,
  valorRT: number
): ResumoCarrinho {
  const itens: ResumoItemCarrinho[] = itensCarrinho.map((item) => ({
    itemId: item.id,
    ambiente: item.ambiente,
    modeloId: item.modeloId,
    resultado: calcularOrcamento(item.inputs, productsByModelo[item.modeloId] ?? EMPTY_PRODUCTS, item.modeloId),
  }));

  const totalGeralAntesDoRT = itens.reduce((acc, i) => acc + i.resultado.total, 0);
  const valorRTCalculado = Math.round(
    tipoRT === "percentual" ? totalGeralAntesDoRT * (valorRT / 100) : valorRT
  );
  const totalGeralFinal = totalGeralAntesDoRT + valorRTCalculado;

  return { itens, totalGeralAntesDoRT, valorRTCalculado, totalGeralFinal };
}

export function useResumoCarrinho(): ResumoCarrinho {
  const itensCarrinho = useOrcamentoDetalhadoDraft((s) => s.itens);
  const tipoRT = useOrcamentoDetalhadoDraft((s) => s.tipoRT);
  const valorRT = useOrcamentoDetalhadoDraft((s) => s.valorRT);
  const productsByModelo = useProductStore((s) => s.productsByModelo);

  return useMemo(
    () => calcularResumoCarrinho(itensCarrinho, productsByModelo, tipoRT, valorRT),
    [itensCarrinho, productsByModelo, tipoRT, valorRT]
  );
}
