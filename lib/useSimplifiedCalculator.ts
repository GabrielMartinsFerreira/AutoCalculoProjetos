import { useMemo } from "react";
import { useModeloStore, useProductStore } from "./store";
import { OPCIONAIS_PADRAO } from "./types";
import type {
  CalculoItem,
  DetalheVaoSimplificado,
  Modelo,
  Product,
  ProductKey,
  ResultadoSimplificado,
  SimplifiedInputs,
} from "./types";

function valorDoModelo(products: Product[], key: ProductKey) {
  return products.find((p) => p.key === key)?.valor ?? 0;
}

/**
 * Orçamento Simplificado: área total × preço fechado por m² de cada modelo + opcionais
 * escolhidos por modelo + RT (global na configuração, calculada por modelo).
 *
 * REGRA DE OURO (mesma do Detalhado desde 2026-09-01): cada parcela (base, cada
 * opcional, RT) é arredondada aqui no core, e o total é a soma das parcelas já
 * redondas — assim o que o card mostra linha a linha sempre fecha com o total mostrado
 * (antes, cada linha era arredondada só na exibição e a soma visível podia diferir do
 * total visível em R$1).
 *
 * Desde 2026-09-03, o próprio `custoBase` segue essa regra por VÃO: cada vão vira um
 * `Math.round(área do vão × valorM2 do modelo)` (`detalhamentoPorVao`), e `custoBase` é
 * a SOMA desses valores já redondos — nunca `Math.round(área total × valorM2)`. Isso
 * garante que a lista "Detalhamento por Vão" da UI feche exatamente com o Subtotal Base
 * exibido, sem a divergência de R$1-2 que dois arredondamentos independentes (por vão
 * vs. da área total) poderiam gerar.
 */
export function calcularOrcamentoSimplificado(
  inputs: SimplifiedInputs,
  modelos: Modelo[],
  productsByModelo: Record<string, Product[]>
): ResultadoSimplificado {
  const area = inputs.vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);

  const porModelo = modelos.map((m) => {
    const opcionais = inputs.opcionaisPorModelo[m.id] ?? OPCIONAIS_PADRAO;
    const detalhamentoPorVao: DetalheVaoSimplificado[] = inputs.vaos.map((v) => {
      const areaVao = v.largura * v.altura;
      return {
        vaoId: v.id,
        largura: v.largura,
        altura: v.altura,
        area: areaVao,
        valor: Math.round(areaVao * m.valorM2),
      };
    });
    const custoBase = detalhamentoPorVao.reduce((acc, d) => acc + d.valor, 0);
    const produtosModelo = productsByModelo[m.id] ?? [];

    const custoPelicula = Math.round(
      opcionais.incluirPelicula ? area * valorDoModelo(produtosModelo, "pelicula") : 0
    );
    const custoLaDeVidro = Math.round(
      opcionais.incluirLaDeVidro ? area * valorDoModelo(produtosModelo, "laDeVidro") : 0
    );
    const custoPortaPremium = Math.round(
      opcionais.qtdPortaPremium * valorDoModelo(produtosModelo, "portaPremium")
    );
    const custoAdicionalNoturno = Math.round(
      opcionais.qtdNoitesInstalacao * valorDoModelo(produtosModelo, "adicionalNoturno")
    );

    const itensOpcionais: CalculoItem[] = [
      {
        label: "Película",
        detalhe: opcionais.incluirPelicula ? `${area.toFixed(2)} m²` : "Não incluída",
        subtotal: custoPelicula,
        grupo: "opcional",
      },
      {
        label: "Lã de Vidro",
        detalhe: opcionais.incluirLaDeVidro ? `${area.toFixed(2)} m²` : "Não incluída",
        subtotal: custoLaDeVidro,
        grupo: "opcional",
      },
      {
        label: "Porta Premium",
        detalhe: `${opcionais.qtdPortaPremium} un`,
        subtotal: custoPortaPremium,
        grupo: "opcional",
      },
      {
        label: "Adicional Noturno",
        detalhe: `${opcionais.qtdNoitesInstalacao} noite(s)`,
        subtotal: custoAdicionalNoturno,
        grupo: "opcional",
      },
    ];

    const custoOpcionaisTotal = custoPelicula + custoLaDeVidro + custoPortaPremium + custoAdicionalNoturno;

    // RT: mesmo sistema fixo/percentual do Detalhado, mas aplicado individualmente sobre
    // o total (base + opcionais) DESTE modelo — cada card tem sua própria RT em R$,
    // mesmo compartilhando o mesmo tipo/percentual configurado uma única vez na página.
    const totalAntesDoRT = custoBase + custoOpcionaisTotal;
    const custoRT = Math.round(
      inputs.tipoRT === "percentual" ? totalAntesDoRT * (inputs.valorRT / 100) : inputs.valorRT
    );

    return {
      modeloId: m.id,
      nomeModelo: m.nome,
      valorM2: m.valorM2,
      custoBase,
      detalhamentoPorVao,
      opcionais: itensOpcionais,
      custoOpcionaisTotal,
      custoRT,
      total: totalAntesDoRT + custoRT,
    };
  });

  return { area, porModelo };
}

export function useSimplifiedCalculator(inputs: SimplifiedInputs): ResultadoSimplificado {
  const modelos = useModeloStore((s) => s.modelos);
  const productsByModelo = useProductStore((s) => s.productsByModelo);

  return useMemo(
    () => calcularOrcamentoSimplificado(inputs, modelos, productsByModelo),
    [inputs, modelos, productsByModelo]
  );
}
