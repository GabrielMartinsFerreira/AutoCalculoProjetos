"use client";

import { useEffect, useState } from "react";
import { Calculator, PanelsTopLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ProjectCalculator } from "@/components/ProjectCalculator";
import { AppHeader } from "@/components/AppHeader";
import { ModeloSelector } from "@/components/ModeloSelector";
import { useModeloStore, useOrcamentoDetalhadoDraft, useProductStore } from "@/lib/store";

export function HomeContent({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState("calculadora");
  // O seletor de modelo do cabeçalho só decide QUAL catálogo está sendo editado em
  // "Cadastro de Produtos" — desde a reforma "Carrinho", cada item do orçamento escolhe
  // o próprio modelo. Por isso ele (e o subtítulo com o nome do modelo) só aparece na
  // aba de produtos; na calculadora confundia, parecendo mudar o modelo do orçamento.
  const nomeModeloCatalogo = useModeloStore(
    (s) => s.modelos.find((m) => m.id === s.modeloSelecionadoId)?.nome ?? "modelo"
  );
  const qtdItens = useOrcamentoDetalhadoDraft((s) => s.itens.length);

  useEffect(() => {
    useProductStore.persist.rehydrate();
    useModeloStore.persist.rehydrate();
    useOrcamentoDetalhadoDraft.persist.rehydrate();
  }, []);

  const emProdutos = tab === "produtos";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <AppHeader
        subtitle={
          emProdutos
            ? `Cadastro de produtos · ${nomeModeloCatalogo}`
            : `Orçamento detalhado · ${qtdItens} item(ns) no carrinho`
        }
        extraControls={emProdutos ? <ModeloSelector /> : undefined}
        userEmail={userEmail}
        pageTabs={
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="calculadora">
                <Calculator className="h-4 w-4" />
                Calculadora de Projetos
              </TabsTrigger>
              <TabsTrigger value="produtos">
                <PanelsTopLeft className="h-4 w-4" />
                Cadastro de Produtos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="calculadora">
          <ProjectCalculator />
        </TabsContent>
        <TabsContent value="produtos">
          <ProductCatalog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
