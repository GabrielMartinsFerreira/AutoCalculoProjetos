import { useMemo } from "react";
import { EMPTY_PRODUCTS, useProductStore } from "./store";
import { obterEstrategia } from "./calculators";
import type { CalculoItem, Product, ProductKey, ProjectInputs, ResultadoCalculo, Vao } from "./types";

function areaTotal(vaos: Vao[]) {
  return vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);
}

/**
 * Calcula o orçamento detalhado: itens estruturais (vidro, perfis, tubos) vêm da
 * estratégia do modelo selecionado (lib/calculators) — cada modelo pode ter sua
 * própria fórmula. Ferragens e opcionais abaixo são universais: aplicam-se da
 * mesma forma independente do modelo escolhido.
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
  const itens: CalculoItem[] = [...estrategia.calcularEstrutura(vaos, getValor)];

  itens.push(
    {
      label: "Puxador H 40cm",
      detalhe: `${inputs.qtdPuxadores} un`,
      subtotal: inputs.qtdPuxadores * getValor("puxadorH"),
    },
    {
      label: "Fechadura para porta",
      detalhe: `${inputs.qtdFechaduras} un`,
      subtotal: inputs.qtdFechaduras * getValor("fechadura"),
    },
    {
      label: "Película",
      detalhe: inputs.incluirPelicula ? `${areaTotalVidro.toFixed(2)} m²` : "Não incluída",
      subtotal: inputs.incluirPelicula ? areaTotalVidro * getValor("pelicula") : 0,
    },
    {
      label: "Lã de Vidro",
      detalhe: inputs.incluirLaDeVidro ? `${areaTotalVidro.toFixed(2)} m²` : "Não incluída",
      subtotal: inputs.incluirLaDeVidro ? areaTotalVidro * getValor("laDeVidro") : 0,
    },
    {
      label: "Porta Premium",
      detalhe: `${inputs.qtdPortaPremium} un`,
      subtotal: inputs.qtdPortaPremium * getValor("portaPremium"),
    },
    {
      label: "Adicional Noturno",
      detalhe: `${inputs.qtdNoitesInstalacao} noite(s)`,
      subtotal: inputs.qtdNoitesInstalacao * getValor("adicionalNoturno"),
    }
  );

  // Produtos do catálogo vinculados a um tipo de vão: 1 unidade por vão desse tipo, automaticamente.
  for (const produto of products) {
    if (!produto.tipoVaoAssociado) continue;
    const qtd = vaos.filter((v) => v.tipo === produto.tipoVaoAssociado).length;
    itens.push({
      label: produto.nome,
      detalhe: `${qtd} un · vinculado a "${produto.tipoVaoAssociado}"`,
      subtotal: qtd * produto.valor,
    });
  }

  const total = itens.reduce((acc, i) => acc + i.subtotal, 0);

  return { itens, total, areaTotalVidro };
}

export function useCalculator(inputs: ProjectInputs, modeloId: string): ResultadoCalculo {
  const products = useProductStore((s) => s.productsByModelo[modeloId] ?? EMPTY_PRODUCTS);

  return useMemo(
    () => calcularOrcamento(inputs, products, modeloId),
    [inputs, products, modeloId]
  );
}
