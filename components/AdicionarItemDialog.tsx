"use client";

import { X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Modelo } from "@/lib/types";

/** Resumo de como cada modelo-semente calcula — ajuda o vendedor a escolher o produto certo. */
const DESCRICAO_POR_MODELO: Record<string, string> = {
  slim: "Divisória por vãos — vidro 10mm, Perfil U e Tubo 2x2 (plano de corte)",
  slim8mm: "Mesma construção da Slim, com vidro 8mm (catálogo próprio)",
  miterglass: "Divisória modulada em peças de ~1m",
  blindglass: "Divisória por vãos (fórmula da Slim, catálogo próprio)",
  sacada: "Vidro laminado por cor + kit por largura de cada vão",
  box: "Preço fechado por medida frontal e forma de pagamento",
  boxFlex: "Vidro por m² + custo fixo (kit, silicone, lucro) + taxa de 15%",
  espelho: "Por m², várias peças de medidas diferentes + adicionais",
};

function tipoDoModelo(id: string) {
  if (id === "box" || id === "boxFlex") return "Box";
  if (id === "espelho") return "Espelho";
  return "Divisória";
}

const COR_TIPO: Record<string, string> = {
  Box: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
  Espelho: "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300",
  Divisória: "border-cyan-300 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300",
};

/**
 * Escolha do produto ao adicionar um item no carrinho. É um modal (não um dropdown
 * absoluto) de propósito: os Cards usam `backdrop-blur`, que cria um stacking context,
 * e um menu absoluto dentro do card ficava escondido atrás do card seguinte — só os
 * primeiros modelos apareciam. Aqui todos os modelos cadastrados aparecem sempre.
 */
export function AdicionarItemDialog({
  modelos,
  onEscolher,
  onClose,
}: {
  modelos: Modelo[];
  onEscolher: (modeloId: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} className="max-w-2xl">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Adicionar Item</CardTitle>
            <CardDescription>Escolha o produto — todos os modelos cadastrados aparecem aqui</CardDescription>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="grid max-h-[70vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {modelos.map((m) => {
            const tipo = tipoDoModelo(m.id);
            return (
              <button
                key={m.id}
                type="button"
                autoFocus={m.id === modelos[0]?.id}
                onClick={() => onEscolher(m.id)}
                className="flex flex-col items-start gap-1 rounded-lg border border-zinc-200 p-3 text-left transition-colors hover:border-cyan-400 hover:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-zinc-800 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/30"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">{m.nome}</span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide",
                      COR_TIPO[tipo]
                    )}
                  >
                    {tipo}
                  </span>
                </span>
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {DESCRICAO_POR_MODELO[m.id] ?? "Divisória por vãos (fórmula da Slim)"}
                </span>
              </button>
            );
          })}
          {modelos.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Nenhum modelo cadastrado.
            </p>
          )}
        </CardContent>
      </Card>
    </Dialog>
  );
}
