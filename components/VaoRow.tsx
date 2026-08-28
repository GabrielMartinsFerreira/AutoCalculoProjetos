"use client";

import { Trash2 } from "lucide-react";
import { TIPOS_VAO, type TipoVao, type Vao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function VaoRow({
  vao,
  index,
  mostrarTipo = true,
  onChange,
  onRemove,
}: {
  vao: Vao;
  index: number;
  /** Oculta o seletor "Tipo do Vão" quando a fórmula do modelo ativo não o utiliza. */
  mostrarTipo?: boolean;
  onChange: (vao: Vao) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 p-3 sm:items-end dark:border-zinc-800",
        mostrarTipo ? "sm:grid-cols-[auto_1fr_1fr_1.4fr_auto]" : "sm:grid-cols-[auto_1fr_1fr_auto]"
      )}
    >
      <div className="col-span-2 flex items-center gap-1.5 font-mono text-xs font-semibold sm:col-span-1 sm:pb-2">
        <span className="text-cyan-600 dark:text-cyan-400">#{String(index + 1).padStart(2, "0")}</span>
        <span className="text-zinc-400 dark:text-zinc-500">vão</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Largura (m)</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={vao.largura}
          onChange={(e) => onChange({ ...vao, largura: Number(e.target.value) })}
          className="font-mono"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Altura (m)</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={vao.altura}
          onChange={(e) => onChange({ ...vao, altura: Number(e.target.value) })}
          className="font-mono"
        />
      </div>
      {mostrarTipo && (
        <div className="flex flex-col gap-1">
          <Label>Tipo do Vão</Label>
          <Select
            value={vao.tipo}
            onChange={(e) => onChange({ ...vao, tipo: e.target.value as TipoVao })}
          >
            {TIPOS_VAO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex justify-end sm:justify-center">
        <Button
          size="icon"
          variant="ghost"
          className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
          onClick={onRemove}
          title="Remover vão"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
