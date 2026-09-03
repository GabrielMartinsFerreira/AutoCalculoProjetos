"use client";

import { Trash2 } from "lucide-react";
import type { PecaEspelho } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Uma peça de espelho dentro de um item "Espelhos": medida própria + quantidade de peças
 * idênticas a essa medida. Espelhos de medidas diferentes (mesmo acabamento) ficam no
 * mesmo item, uma linha cada — não precisa mais de um item por medida.
 */
export function EspelhoPecaRow({
  peca,
  index,
  podeRemover,
  onChange,
  onRemove,
}: {
  peca: PecaEspelho;
  index: number;
  podeRemover: boolean;
  onChange: (peca: PecaEspelho) => void;
  onRemove: () => void;
}) {
  const area = peca.largura * peca.altura;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto_auto] sm:items-end dark:border-zinc-800">
      <div className="col-span-2 flex items-center gap-1.5 font-mono text-xs font-semibold sm:col-span-1 sm:pb-2">
        <span className="text-cyan-600 dark:text-cyan-400">#{String(index + 1).padStart(2, "0")}</span>
        <span className="text-zinc-400 dark:text-zinc-500">espelho</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Largura (m)</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={peca.largura}
          onChange={(e) => onChange({ ...peca, largura: Number(e.target.value) })}
          className="font-mono"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Altura (m)</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={peca.altura}
          onChange={(e) => onChange({ ...peca, altura: Number(e.target.value) })}
          className="font-mono"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Quantidade (un)</Label>
        <Input
          type="number"
          min={1}
          value={peca.quantidade}
          onChange={(e) => onChange({ ...peca, quantidade: Number(e.target.value) })}
          className="font-mono"
          title="Peças idênticas a esta medida"
        />
      </div>
      <div className="hidden flex-col gap-1 sm:flex">
        <Label>Área</Label>
        <p className="flex h-9 items-center whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {area.toFixed(2)} m²{area < 0.3 && area >= 0 ? " → mín. 0,30" : ""}
        </p>
      </div>
      <div className="flex justify-end sm:justify-center">
        <Button
          size="icon"
          variant="ghost"
          className="text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
          onClick={onRemove}
          disabled={!podeRemover}
          title={podeRemover ? "Remover espelho" : "O item precisa de pelo menos 1 espelho"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
