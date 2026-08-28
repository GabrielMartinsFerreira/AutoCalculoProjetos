"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { useModeloStore } from "@/lib/store";
import type { Modelo } from "@/lib/types";
import { formatBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DraftModelo {
  nome: string;
  valorM2: string;
}

const EMPTY_DRAFT: DraftModelo = { nome: "", valorM2: "" };

function draftFromModelo(m: Modelo): DraftModelo {
  return { nome: m.nome, valorM2: String(m.valorM2) };
}

export function ModeloCatalog() {
  const modelos = useModeloStore((s) => s.modelos);
  const addModelo = useModeloStore((s) => s.addModelo);
  const updateModelo = useModeloStore((s) => s.updateModelo);
  const deleteModelo = useModeloStore((s) => s.deleteModelo);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftModelo>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftModelo>(EMPTY_DRAFT);

  function startEdit(m: Modelo) {
    setIsAdding(false);
    setEditingId(m.id);
    setEditDraft(draftFromModelo(m));
  }

  function saveEdit(id: string) {
    const valorM2 = Number(editDraft.valorM2.replace(",", "."));
    if (!editDraft.nome.trim() || Number.isNaN(valorM2)) return;
    updateModelo(id, { nome: editDraft.nome.trim(), valorM2 });
    setEditingId(null);
  }

  function saveNew() {
    const valorM2 = Number(addDraft.valorM2.replace(",", "."));
    if (!addDraft.nome.trim() || Number.isNaN(valorM2)) return;
    addModelo(addDraft.nome.trim(), valorM2);
    setAddDraft(EMPTY_DRAFT);
    setIsAdding(false);
  }

  function confirmarExclusao(m: Modelo) {
    if (
      !confirm(
        `Excluir o modelo "${m.nome}"? Orçamentos em andamento que usam este modelo passarão a usar outro. Essa ação não pode ser desfeita.`
      )
    )
      return;
    deleteModelo(m.id);
  }

  return (
    <Card className="reveal" style={{ animationDelay: "40ms" }}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Modelos e Preço por m²</CardTitle>
          <CardDescription>Tabela fechada usada no orçamento simplificado — edite quando os preços mudarem</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setIsAdding((v) => !v);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left font-mono text-[0.7rem] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              <th className="px-5 py-3 font-medium">Modelo</th>
              <th className="px-5 py-3 font-medium">R$ / m²</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/60">
                <td className="px-5 py-2.5">
                  <Input
                    autoFocus
                    placeholder="Nome do modelo"
                    value={addDraft.nome}
                    onChange={(e) => setAddDraft((d) => ({ ...d, nome: e.target.value }))}
                  />
                </td>
                <td className="px-5 py-2.5">
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={addDraft.valorM2}
                    onChange={(e) => setAddDraft((d) => ({ ...d, valorM2: e.target.value }))}
                    className="font-mono"
                  />
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={saveNew} title="Salvar">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)} title="Cancelar">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {modelos.map((m) => {
              const editing = editingId === m.id;
              return (
                <tr
                  key={m.id}
                  className={cn(
                    "border-b border-zinc-100 last:border-b-0 dark:border-zinc-800",
                    editing && "bg-zinc-50/60 dark:bg-zinc-800/60"
                  )}
                >
                  <td className="px-5 py-2.5">
                    {editing ? (
                      <Input
                        value={editDraft.nome}
                        onChange={(e) => setEditDraft((d) => ({ ...d, nome: e.target.value }))}
                      />
                    ) : (
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">{m.nome}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">
                    {editing ? (
                      <Input
                        inputMode="decimal"
                        value={editDraft.valorM2}
                        onChange={(e) => setEditDraft((d) => ({ ...d, valorM2: e.target.value }))}
                        className="font-mono"
                      />
                    ) : (
                      `${formatBRL(m.valorM2)} /m²`
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      {editing ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(m.id)} title="Salvar">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} title="Cancelar">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(m)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                            onClick={() => confirmarExclusao(m)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {modelos.length === 0 && !isAdding && (
          <p className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Nenhum modelo cadastrado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
