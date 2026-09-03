"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { EMPTY_PRODUCTS, useModeloStore, useProductStore } from "@/lib/store";
import { chavesCatalogoDoModelo } from "@/lib/calculators";
import { TIPOS_VAO, type Product, type TipoVao, type UnidadeVenda } from "@/lib/types";
import { formatBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const UNIDADES: UnidadeVenda[] = ["m²", "un", "un/noite"];

const UNIDADE_BADGE: Record<UnidadeVenda, string> = {
  "m²": "border-cyan-300 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300",
  un: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
  "un/noite": "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
};

function UnidadeBadge({ unidade }: { unidade: UnidadeVenda }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide",
        UNIDADE_BADGE[unidade]
      )}
    >
      {unidade}
    </span>
  );
}

const TIPO_VAO_BADGE: Record<TipoVao, string> = {
  Fixo: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
  "Porta de Abrir": "border-cyan-300 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300",
  "Porta de Correr": "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
};

function TipoVaoBadge({ tipo }: { tipo: TipoVao | null }) {
  if (!tipo) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide",
        TIPO_VAO_BADGE[tipo]
      )}
    >
      {tipo}
    </span>
  );
}

interface DraftProduct {
  nome: string;
  unidade: UnidadeVenda;
  valor: string;
  tipoVaoAssociado: TipoVao | "";
}

const EMPTY_DRAFT: DraftProduct = { nome: "", unidade: "un", valor: "", tipoVaoAssociado: "" };

function draftFromProduct(p: Product): DraftProduct {
  return {
    nome: p.nome,
    unidade: p.unidade,
    valor: String(p.valor),
    tipoVaoAssociado: p.tipoVaoAssociado ?? "",
  };
}

export function ProductCatalog() {
  const modeloSelecionadoId = useModeloStore((s) => s.modeloSelecionadoId);
  const nomeModelo = useModeloStore(
    (s) => s.modelos.find((m) => m.id === s.modeloSelecionadoId)?.nome ?? "modelo"
  );
  const products = useProductStore((s) => s.productsByModelo[modeloSelecionadoId] ?? EMPTY_PRODUCTS);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProduct = useProductStore((s) => s.deleteProduct);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftProduct>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftProduct>(EMPTY_DRAFT);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Todo modelo carrega o catálogo inteiro no seed (~60 produtos), mas cada fórmula lê
  // só um punhado deles. Por padrão mostra só o que entra no cálculo deste modelo (+ os
  // produtos manuais, key null) — o resto fica atrás de "Mostrar todos".
  const chavesDoModelo = chavesCatalogoDoModelo(modeloSelecionadoId);
  const produtosVisiveis = mostrarTodos
    ? products
    : products.filter((p) => p.key === null || chavesDoModelo.includes(p.key));
  const qtdOcultos = products.length - produtosVisiveis.length;
  const semCatalogo = modeloSelecionadoId === "boxFlex";

  function startEdit(p: Product) {
    setIsAdding(false);
    setEditingId(p.id);
    setEditDraft(draftFromProduct(p));
  }

  function saveEdit(id: string) {
    const valor = Number(editDraft.valor.replace(",", "."));
    if (!editDraft.nome.trim() || Number.isNaN(valor)) return;
    updateProduct(modeloSelecionadoId, id, {
      nome: editDraft.nome.trim(),
      unidade: editDraft.unidade,
      valor,
      tipoVaoAssociado: editDraft.tipoVaoAssociado || null,
    });
    setEditingId(null);
  }

  function saveNew() {
    const valor = Number(addDraft.valor.replace(",", "."));
    if (!addDraft.nome.trim() || Number.isNaN(valor)) return;
    addProduct(modeloSelecionadoId, {
      nome: addDraft.nome.trim(),
      unidade: addDraft.unidade,
      valor,
      tipoVaoAssociado: addDraft.tipoVaoAssociado || null,
    });
    setAddDraft(EMPTY_DRAFT);
    setIsAdding(false);
  }

  function confirmarExclusao(p: Product) {
    if (!confirm(`Excluir o produto "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    deleteProduct(modeloSelecionadoId, p.id);
  }

  return (
    <Card className="reveal">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Catálogo de Produtos · {nomeModelo}</CardTitle>
          <CardDescription>
            {mostrarTodos
              ? `Todos os ${products.length} produtos deste catálogo — cada modelo tem o seu, independente dos demais`
              : `${produtosVisiveis.length} produto(s) usados no cálculo deste modelo${qtdOcultos > 0 ? ` · ${qtdOcultos} sem uso ocultos` : ""}`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {qtdOcultos > 0 || mostrarTodos ? (
            <Button size="sm" variant="outline" onClick={() => setMostrarTodos((v) => !v)}>
              {mostrarTodos ? "Só os usados pelo modelo" : `Mostrar todos (${qtdOcultos})`}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setIsAdding((v) => !v);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </CardHeader>
      {semCatalogo && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Box Flex usa valores fixos na própria fórmula (vidro R$180/m², custo fixo R$2.630, dobradiça R$550, taxa
          15%) — nada deste catálogo entra no cálculo dele.
        </p>
      )}
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left font-mono text-[0.7rem] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Unidade</th>
              <th className="px-5 py-3 font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Vínculo (vão)</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/60">
                <td className="px-5 py-2.5">
                  <Input
                    autoFocus
                    placeholder="Nome do produto"
                    value={addDraft.nome}
                    onChange={(e) => setAddDraft((d) => ({ ...d, nome: e.target.value }))}
                  />
                </td>
                <td className="px-5 py-2.5">
                  <Select
                    value={addDraft.unidade}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, unidade: e.target.value as UnidadeVenda }))
                    }
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-5 py-2.5">
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={addDraft.valor}
                    onChange={(e) => setAddDraft((d) => ({ ...d, valor: e.target.value }))}
                  />
                </td>
                <td className="px-5 py-2.5">
                  <Select
                    value={addDraft.tipoVaoAssociado}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, tipoVaoAssociado: e.target.value as TipoVao | "" }))
                    }
                  >
                    <option value="">— Nenhum —</option>
                    {TIPOS_VAO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
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

            {produtosVisiveis.map((p) => {
              const editing = editingId === p.id;
              return (
                <tr
                  key={p.id}
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
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">{p.nome}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {editing ? (
                      <Select
                        value={editDraft.unidade}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, unidade: e.target.value as UnidadeVenda }))
                        }
                      >
                        {UNIDADES.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <UnidadeBadge unidade={p.unidade} />
                    )}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">
                    {editing ? (
                      <Input
                        inputMode="decimal"
                        value={editDraft.valor}
                        onChange={(e) => setEditDraft((d) => ({ ...d, valor: e.target.value }))}
                      />
                    ) : (
                      formatBRL(p.valor)
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {editing ? (
                      <Select
                        value={editDraft.tipoVaoAssociado}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            tipoVaoAssociado: e.target.value as TipoVao | "",
                          }))
                        }
                      >
                        <option value="">— Nenhum —</option>
                        {TIPOS_VAO.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <TipoVaoBadge tipo={p.tipoVaoAssociado} />
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      {editing ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(p.id)} title="Salvar">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} title="Cancelar">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(p)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                            onClick={() => confirmarExclusao(p)}
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
        {produtosVisiveis.length === 0 && !isAdding && (
          <p className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {products.length === 0
              ? `Nenhum produto cadastrado para ${nomeModelo} ainda. Clique em "Novo Produto" para começar.`
              : `Nenhum produto deste catálogo entra no cálculo de ${nomeModelo}. Use "Mostrar todos" para ver os ${products.length} cadastrados.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
