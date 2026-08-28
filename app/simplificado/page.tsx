"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ModeloCatalog } from "@/components/ModeloCatalog";
import { SimplifiedCalculator } from "@/components/SimplifiedCalculator";
import { useModeloStore, useOrcamentoSimplificadoDraft, useProductStore } from "@/lib/store";

export default function Simplificado() {
  useEffect(() => {
    useProductStore.persist.rehydrate();
    useModeloStore.persist.rehydrate();
    useOrcamentoSimplificadoDraft.persist.rehydrate();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <AppHeader subtitle="Orçamento simplificado · preço fechado por m²" />

      <div className="flex flex-col gap-5">
        <ModeloCatalog />
        <SimplifiedCalculator />
      </div>
    </div>
  );
}
