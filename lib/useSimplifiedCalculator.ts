import { useMemo } from "react";
import { useModeloStore, useProductStore } from "./store";
import { OPCIONAIS_PADRAO } from "./types";
import type {
  CalculoItem,
  Modelo,
  Product,
  ProductKey,
  ResultadoSimplificado,
  SimplifiedInputs,
} from "./types";

function valorDoModelo(products: Product[], key: ProductKey) {
  return products.find((p) => p.key === key)?.valor ?? 0;
}

export function calcularOrcamentoSimplificado(
  inputs: SimplifiedInputs,
  modelos: Modelo[],
  productsByModelo: Record<string, Product[]>
): ResultadoSimplificado {
  const area = inputs.vaos.reduce((acc, v) => acc + v.largura * v.altura, 0);

  const porModelo = modelos.map((m) => {
    const opcionais = inputs.opcionaisPorModelo[m.id] ?? OPCIONAIS_PADRAO;
    const custoBase = area * m.valorM2;
    const produtosModelo = productsByModelo[m.id] ?? [];

    const custoPelicula = opcionais.incluirPelicula ? area * valorDoModelo(produtosModelo, "pelicula") : 0;
    const custoLaDeVidro = opcionais.incluirLaDeVidro
      ? area * valorDoModelo(produtosModelo, "laDeVidro")
      : 0;
    const custoPortaPremium = opcionais.qtdPortaPremium * valorDoModelo(produtosModelo, "portaPremium");
    const custoAdicionalNoturno =
      opcionais.qtdNoitesInstalacao * valorDoModelo(produtosModelo, "adicionalNoturno");

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
    const custoRT =
      inputs.tipoRT === "percentual" ? totalAntesDoRT * (inputs.valorRT / 100) : inputs.valorRT;

    return {
      modeloId: m.id,
      nomeModelo: m.nome,
      valorM2: m.valorM2,
      custoBase,
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
