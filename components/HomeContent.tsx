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
  const nomeModelo = useModeloStore(
    (s) => s.modelos.find((m) => m.id === s.modeloSelecionadoId)?.nome ?? "modelo"
  );

  useEffect(() => {
    useProductStore.persist.rehydrate();
    useModeloStore.persist.rehydrate();
    useOrcamentoDetalhadoDraft.persist.rehydrate();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <AppHeader
        subtitle={`Orçamento detalhado · ${nomeModelo}`}
        extraControls={<ModeloSelector />}
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
