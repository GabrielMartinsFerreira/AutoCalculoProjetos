import { useMemo } from "react";
import { EMPTY_PRODUCTS, useProductStore } from "./store";
import { obterEstrategia } from "./calculators";
import { formatBRL } from "./utils";
import type { CalculoItem, Product, ProductKey, ProjectInputs, ResultadoCalculo, Vao } from "./types";

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

/**
 * Calcula o orçamento detalhado: itens estruturais (vidro, perfis, tubos) vêm da
 * estratégia do modelo selecionado (lib/calculators) — cada modelo pode ter sua
 * própria fórmula. Ferragens e opcionais abaixo são universais (aplicam-se a
 * qualquer modelo) — EXCETO os opcionais exclusivos da Sacada (ART Engenheiro, Caixa
 * Ar Condicionado, Respiro Alumínio), que só entram quando `modeloId === "sacada"`.
 * A Reserva Técnica (RT) é sempre o ÚLTIMO item: precisa do total de tudo mais somado
 * primeiro, pra poder calcular o modo "percentual" em cima dele.
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

  // Produtos do catálogo vinculados a um tipo de vão: 1 unidade por vão desse tipo, automaticamente.
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

  // RT por último: modo "percentual" incide sobre a soma de tudo que já foi somado até
  // aqui (estrutural + todos os outros opcionais) — nunca sobre si mesma.
  const totalAntesDoRT = itens.reduce((acc, i) => acc + i.subtotal, 0);
  const valorRTCalculado =
    inputs.tipoRT === "percentual" ? totalAntesDoRT * (inputs.valorRT / 100) : inputs.valorRT;

  itens.push({
    label: "Reserva Técnica (RT)",
    detalhe:
      inputs.tipoRT === "percentual"
        ? `${inputs.valorRT}% sobre ${formatBRL(totalAntesDoRT)}`
        : inputs.valorRT > 0
          ? "Valor fixo informado manualmente"
          : "Não informada",
    subtotal: valorRTCalculado,
    grupo: "opcional",
  });

  const subtotalEstrutural = itens
    .filter((i) => i.grupo === "estrutural")
    .reduce((acc, i) => acc + i.subtotal, 0);
  const subtotalOpcionais = itens
    .filter((i) => i.grupo === "opcional")
    .reduce((acc, i) => acc + i.subtotal, 0);
  const total = subtotalEstrutural + subtotalOpcionais;

  return { itens, total, areaTotalVidro, subtotalEstrutural, subtotalOpcionais };
}

export function useCalculator(inputs: ProjectInputs, modeloId: string): ResultadoCalculo {
  const products = useProductStore((s) => s.productsByModelo[modeloId] ?? EMPTY_PRODUCTS);

  return useMemo(
    () => calcularOrcamento(inputs, products, modeloId),
    [inputs, products, modeloId]
  );
}
