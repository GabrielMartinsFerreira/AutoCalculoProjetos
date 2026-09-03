"use client";

import { useState } from "react";
import { RotateCcw, Plus, Layers, Save, Trash2, Copy } from "lucide-react";
import { useResumoCarrinho } from "@/lib/useCalculator";
import { ehItemFechado, obterEstrategia } from "@/lib/calculators";
import { OPCOES_MEDIDA_BOX } from "@/lib/calculators/box";
import { MODELOS_BASE_ESPELHO, MODELOS_ESPECIAIS_ESPELHO, totalEspelhosDoItem } from "@/lib/calculators/espelho";
import { EMPTY_PRODUCTS, useModeloStore, useOrcamentoDetalhadoDraft, useProductStore } from "@/lib/store";
import { cn, formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { VaoRow } from "@/components/VaoRow";
import { EspelhoPecaRow } from "@/components/EspelhoPecaRow";
import { AdicionarItemDialog } from "@/components/AdicionarItemDialog";
import { SalvarOrcamentoDialog, type DadosSalvarOrcamento } from "@/components/SalvarOrcamentoDialog";
import type { CalculoItem, MedidaFrontalBox, OrcamentoDetalhadoDados, ProductKey, ProjectInputs } from "@/lib/types";

function GrupoFerragens({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function LinhaItem({ item }: { item: CalculoItem }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p className="font-medium text-zinc-800 dark:text-zinc-100">{item.label}</p>
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{item.detalhe}</p>
      </div>
      <span className="whitespace-nowrap font-mono font-medium text-zinc-700 dark:text-zinc-300">
        {formatBRL(item.subtotal)}
      </span>
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type ModoResumo = "agrupado" | "separado";

export function ProjectCalculator() {
  const itens = useOrcamentoDetalhadoDraft((s) => s.itens);
  const itemAtivoId = useOrcamentoDetalhadoDraft((s) => s.itemAtivoId);
  const tipoRT = useOrcamentoDetalhadoDraft((s) => s.tipoRT);
  const valorRT = useOrcamentoDetalhadoDraft((s) => s.valorRT);
  const addItem = useOrcamentoDetalhadoDraft((s) => s.addItem);
  const removeItem = useOrcamentoDetalhadoDraft((s) => s.removeItem);
  const duplicarItem = useOrcamentoDetalhadoDraft((s) => s.duplicarItem);
  const renomearItem = useOrcamentoDetalhadoDraft((s) => s.renomearItem);
  const trocarModeloItem = useOrcamentoDetalhadoDraft((s) => s.trocarModeloItem);
  const selecionarItem = useOrcamentoDetalhadoDraft((s) => s.selecionarItem);
  const setInputsItem = useOrcamentoDetalhadoDraft((s) => s.setInputsItem);
  const addVaoItem = useOrcamentoDetalhadoDraft((s) => s.addVaoItem);
  const updateVaoItem = useOrcamentoDetalhadoDraft((s) => s.updateVaoItem);
  const removeVaoItem = useOrcamentoDetalhadoDraft((s) => s.removeVaoItem);
  const addPecaEspelhoItem = useOrcamentoDetalhadoDraft((s) => s.addPecaEspelhoItem);
  const updatePecaEspelhoItem = useOrcamentoDetalhadoDraft((s) => s.updatePecaEspelhoItem);
  const removePecaEspelhoItem = useOrcamentoDetalhadoDraft((s) => s.removePecaEspelhoItem);
  const setRT = useOrcamentoDetalhadoDraft((s) => s.setRT);
  const resetDraft = useOrcamentoDetalhadoDraft((s) => s.reset);

  const modelos = useModeloStore((s) => s.modelos);
  const productsByModelo = useProductStore((s) => s.productsByModelo);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const resumo = useResumoCarrinho();

  const itemAtivo = itens.find((i) => i.id === itemAtivoId) ?? itens[0];
  const resultadoAtivo = resumo.itens.find((i) => i.itemId === itemAtivo.id)?.resultado ?? resumo.itens[0].resultado;
  const estrategiaAtiva = obterEstrategia(itemAtivo.modeloId);
  const produtosDoItemAtivo = productsByModelo[itemAtivo.modeloId] ?? EMPTY_PRODUCTS;
  const nomeDoModelo = (id: string) => modelos.find((m) => m.id === id)?.nome ?? id;
  const nomeModeloAtivo = nomeDoModelo(itemAtivo.modeloId);
  const pelicula = produtosDoItemAtivo.find((p) => p.key === "pelicula");
  const laDeVidro = produtosDoItemAtivo.find((p) => p.key === "laDeVidro");
  // Mesmo quando a fórmula do modelo não usa o tipo do vão, o campo precisa continuar
  // visível se algum produto do catálogo estiver vinculado a um tipo — senão o vínculo
  // nunca teria como bater (o vão ficaria travado em "Fixo").
  const temProdutoVinculado = produtosDoItemAtivo.some((p) => p.tipoVaoAssociado !== null);
  const mostrarTipoVao = estrategiaAtiva.usaTipoVao || temProdutoVinculado;

  const isBox = itemAtivo.modeloId === "box";
  const isBoxFlex = itemAtivo.modeloId === "boxFlex";
  const isEspelho = itemAtivo.modeloId === "espelho";
  // Regra única de "item fechado" vive em lib/calculators/index.ts — mesma usada pelo cálculo.
  const isDivisoria = !ehItemFechado(itemAtivo.modeloId);
  const totalEspelhosAtivo = isEspelho ? totalEspelhosDoItem(itemAtivo.inputs) : 0;

  const [mostrarSalvar, setMostrarSalvar] = useState(false);
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [modoResumo, setModoResumo] = useState<ModoResumo>("agrupado");

  const itensEstruturais = resultadoAtivo.itens.filter((i) => i.grupo === "estrutural");
  const itensOpcionais = resultadoAtivo.itens.filter((i) => i.grupo === "opcional");

  function atualizarInputsAtivo(patch: Partial<ProjectInputs>) {
    setInputsItem(itemAtivo.id, { ...itemAtivo.inputs, ...patch });
  }

  function novoOrcamento() {
    if (!confirm("Começar um novo orçamento? Todos os itens atuais serão apagados.")) return;
    resetDraft();
  }

  function removerItem(id: string, ambiente: string) {
    if (!confirm(`Remover o item "${ambiente || "Sem nome"}" do orçamento?`)) return;
    removeItem(id);
  }

  async function salvarOrcamento(dadosExtra: DadosSalvarOrcamento) {
    try {
      const dados: OrcamentoDetalhadoDados = { itens, tipoRT, valorRT };
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "detalhado",
          ...dadosExtra,
          dados,
          total: resumo.totalGeralFinal,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="reveal" style={{ animationDelay: "0ms" }}>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Itens do Orçamento</CardTitle>
            <CardDescription>
              Cada item é um ambiente/produto independente — Divisória, Sacada, Box, Box Flex ou Espelhos
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={novoOrcamento} title="Limpar tudo e começar um orçamento novo">
              <RotateCcw className="h-4 w-4" />
              Novo Orçamento
            </Button>
            <Button size="sm" onClick={() => setMostrarAdicionar(true)}>
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {itens.map((item) => {
              const r = resumo.itens.find((i) => i.itemId === item.id);
              const ativo = item.id === itemAtivo.id;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-0.5 rounded-lg border py-1.5 pl-3 pr-1 text-sm",
                    ativo
                      ? "border-cyan-400 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/40"
                      : "border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  <button type="button" onClick={() => selecionarItem(item.id)} className="flex flex-col items-start text-left">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">{item.ambiente || "Sem nome"}</span>
                    <span className="font-mono text-[0.65rem] text-zinc-400 dark:text-zinc-500">
                      {nomeDoModelo(item.modeloId)} · {formatBRL(r?.resultado.total ?? 0)}
                    </span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-1 h-6 w-6 text-zinc-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                    onClick={() => duplicarItem(item.id)}
                    title="Duplicar item (mesmas medidas e opções)"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {itens.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-300"
                      onClick={() => removerItem(item.id, item.ambiente)}
                      title="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="flex flex-col gap-1">
              <Label>Nome do Ambiente / Item</Label>
              <Input
                value={itemAtivo.ambiente}
                onChange={(e) => renomearItem(itemAtivo.id, e.target.value)}
                placeholder="Ex: Banheiro Suíte"
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Modelo deste Item</Label>
              <Select
                value={itemAtivo.modeloId}
                onChange={(e) => trocarModeloItem(itemAtivo.id, e.target.value)}
                className="w-52"
              >
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          {isDivisoria && (
            <Card className="reveal" style={{ animationDelay: "40ms" }}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Vãos (Módulos da {nomeModeloAtivo})</CardTitle>
                  <CardDescription>Adicione cada vão do item com sua largura, altura e tipo</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {estrategiaAtiva.usaCorVidro && (
                    <Select
                      value={itemAtivo.inputs.corVidroSacada}
                      onChange={(e) =>
                        atualizarInputsAtivo({ corVidroSacada: e.target.value as "incolor" | "verde" })
                      }
                      className="!h-8 w-40 text-xs"
                      title="Cor do vidro da Sacada"
                    >
                      <option value="incolor">Vidro Incolor</option>
                      <option value="verde">Vidro Verde</option>
                    </Select>
                  )}
                  <Button size="sm" onClick={() => addVaoItem(itemAtivo.id)}>
                    <Plus className="h-4 w-4" />
                    Adicionar Vão
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {itemAtivo.inputs.vaos.map((vao, i) => (
                  <VaoRow
                    key={vao.id}
                    vao={vao}
                    index={i}
                    mostrarTipo={mostrarTipoVao}
                    onChange={(v) => updateVaoItem(itemAtivo.id, vao.id, v)}
                    onRemove={() => removeVaoItem(itemAtivo.id, vao.id)}
                  />
                ))}
                {itemAtivo.inputs.vaos.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    Nenhum vão adicionado. Clique em &quot;Adicionar Vão&quot;.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isBox && (
            <Card className="reveal" style={{ animationDelay: "40ms" }}>
              <CardHeader>
                <CardTitle>Box Padrão</CardTitle>
                <CardDescription>
                  Preço fechado por medida frontal e forma de pagamento — alumínio fosco, branco ou preto
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label>Medida Frontal</Label>
                  <Select
                    value={itemAtivo.inputs.medidaFrontalBox ?? ""}
                    onChange={(e) =>
                      atualizarInputsAtivo({
                        medidaFrontalBox: (e.target.value || null) as MedidaFrontalBox | null,
                      })
                    }
                  >
                    <option value="">Selecione...</option>
                    {OPCOES_MEDIDA_BOX.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.larguraLabel} ({o.abertura})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Tipo de Pagamento</Label>
                  <SegmentedToggle
                    value={itemAtivo.inputs.tipoPagamentoBox}
                    onChange={(v) => atualizarInputsAtivo({ tipoPagamentoBox: v })}
                    options={[
                      { value: "vista", label: "À Vista" },
                      { value: "cartao", label: "Cartão" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Preço de Tabela</Label>
                  <p className="flex h-9 items-center font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatBRL(resultadoAtivo.subtotalEstrutural)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isBoxFlex && (
            <Card className="reveal" style={{ animationDelay: "40ms" }}>
              <CardHeader>
                <CardTitle>Box Flex</CardTitle>
                <CardDescription>
                  Fórmula proprietária: vidro por m² + custo fixo (kit, silicone, lucro) + taxa de 15% (NF/Cartão)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <Label>Largura (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={itemAtivo.inputs.larguraBoxFlex}
                      onChange={(e) => atualizarInputsAtivo({ larguraBoxFlex: Number(e.target.value) })}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Altura (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={itemAtivo.inputs.alturaBoxFlex}
                      onChange={(e) => atualizarInputsAtivo({ alturaBoxFlex: Number(e.target.value) })}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Quantidade (un)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={itemAtivo.inputs.quantidade ?? 1}
                      onChange={(e) => atualizarInputsAtivo({ quantidade: Number(e.target.value) })}
                      className="font-mono"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={itemAtivo.inputs.dobradicaAvulsa}
                    onChange={(e) => atualizarInputsAtivo({ dobradicaAvulsa: e.target.checked })}
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Até o teto - Inclui Dobradiça Avulsa
                  </span>
                </label>
              </CardContent>
            </Card>
          )}

          {isEspelho && (
            <Card className="reveal" style={{ animationDelay: "40ms" }}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Espelhos</CardTitle>
                  <CardDescription>
                    {itemAtivo.inputs.pecasEspelho.length} medida(s) · {totalEspelhosAtivo} espelho(s) no item · mínimo cobrado
                    0,30 m² por peça
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => addPecaEspelhoItem(itemAtivo.id)}>
                  <Plus className="h-4 w-4" />
                  Adicionar Espelho
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {itemAtivo.inputs.pecasEspelho.map((peca, i) => (
                    <EspelhoPecaRow
                      key={peca.id}
                      peca={peca}
                      index={i}
                      podeRemover={itemAtivo.inputs.pecasEspelho.length > 1}
                      onChange={(p) => updatePecaEspelhoItem(itemAtivo.id, peca.id, p)}
                      onRemove={() => removePecaEspelhoItem(itemAtivo.id, peca.id)}
                    />
                  ))}
                </div>

                <GrupoFerragens titulo="Modelo e acabamento (vale pra todas as peças do item)">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <Label>Modelo Base</Label>
                      <Select
                        value={itemAtivo.inputs.espelhoModeloBase ?? ""}
                        onChange={(e) =>
                          atualizarInputsAtivo({
                            espelhoModeloBase: (e.target.value || null) as ProductKey | null,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        {MODELOS_BASE_ESPELHO.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Modelo Especial (opcional — anula o Modelo Base)</Label>
                      <Select
                        value={itemAtivo.inputs.espelhoModeloEspecial ?? ""}
                        onChange={(e) =>
                          atualizarInputsAtivo({
                            espelhoModeloEspecial: (e.target.value || null) as ProductKey | null,
                          })
                        }
                      >
                        <option value="">Nenhum (usar Modelo Base)</option>
                        {MODELOS_ESPECIAIS_ESPELHO.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </GrupoFerragens>

                <GrupoFerragens titulo={`Adicionais (por espelho — multiplicados pelos ${totalEspelhosAtivo} espelho(s) do item)`}>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <label className="flex items-center gap-2 pt-5">
                      <Checkbox
                        checked={itemAtivo.inputs.incluirDesembacadorEspelho}
                        onChange={(e) => atualizarInputsAtivo({ incluirDesembacadorEspelho: e.target.checked })}
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Desembaçador Elétrico</span>
                    </label>
                    <div className="flex flex-col gap-1">
                      <Label>Recorte CX de Luz (un)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdRecorteCxLuzEspelho}
                        onChange={(e) => atualizarInputsAtivo({ qtdRecorteCxLuzEspelho: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Chassis Perfil U (peças)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdChassisPerfilUEspelho}
                        onChange={(e) => atualizarInputsAtivo({ qtdChassisPerfilUEspelho: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Touch Screen (peças)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdTouchScreenEspelho}
                        onChange={(e) => atualizarInputsAtivo({ qtdTouchScreenEspelho: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-5 sm:col-span-2">
                      <Checkbox
                        checked={itemAtivo.inputs.incluirJuncaoRevestimentoEspelho}
                        onChange={(e) =>
                          atualizarInputsAtivo({ incluirJuncaoRevestimentoEspelho: e.target.checked })
                        }
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Junção / Revestimento / Modelo (+20%)
                      </span>
                    </label>
                  </div>
                </GrupoFerragens>
              </CardContent>
            </Card>
          )}

          {isDivisoria && (
            <Card className="reveal" style={{ animationDelay: "120ms" }}>
              <CardHeader>
                <CardTitle>Ferragens e Opcionais</CardTitle>
                <CardDescription>Itens deste item, aplicados uma única vez</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <GrupoFerragens titulo="Ferragens">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <Label>Qtd. Puxadores H</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdPuxadores}
                        onChange={(e) => atualizarInputsAtivo({ qtdPuxadores: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Fechadura PT Correr</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdFechaduras}
                        onChange={(e) => atualizarInputsAtivo({ qtdFechaduras: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </GrupoFerragens>

                <GrupoFerragens titulo="Kits de Porta">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <Label>Porta Premium (qtd.)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdPortaPremium}
                        onChange={(e) => atualizarInputsAtivo({ qtdPortaPremium: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Kit Porta Simples (qtd.)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdKitPortaSimples}
                        onChange={(e) => atualizarInputsAtivo({ qtdKitPortaSimples: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Kit Porta Dupla (qtd.)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdKitPortaDupla}
                        onChange={(e) => atualizarInputsAtivo({ qtdKitPortaDupla: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </GrupoFerragens>

                <GrupoFerragens titulo="Acabamentos">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={itemAtivo.inputs.incluirPelicula}
                          onChange={(e) => atualizarInputsAtivo({ incluirPelicula: e.target.checked })}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir Película</span>
                      </label>
                      {pelicula && (
                        <div className="flex flex-col gap-1">
                          <Label>Película (R$/m²)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={pelicula.valor}
                            onChange={(e) =>
                              updateProduct(itemAtivo.modeloId, pelicula.id, {
                                nome: pelicula.nome,
                                unidade: pelicula.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: pelicula.tipoVaoAssociado,
                              })
                            }
                            className="font-mono"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={itemAtivo.inputs.incluirLaDeVidro}
                          onChange={(e) => atualizarInputsAtivo({ incluirLaDeVidro: e.target.checked })}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir Lã de Vidro</span>
                      </label>
                      {laDeVidro && (
                        <div className="flex flex-col gap-1">
                          <Label>Lã de Vidro (R$/m²)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={laDeVidro.valor}
                            onChange={(e) =>
                              updateProduct(itemAtivo.modeloId, laDeVidro.id, {
                                nome: laDeVidro.nome,
                                unidade: laDeVidro.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: laDeVidro.tipoVaoAssociado,
                              })
                            }
                            className="font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </GrupoFerragens>

                <GrupoFerragens titulo="Serviços">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <Label>Instalação Noturna (noites)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={itemAtivo.inputs.qtdNoitesInstalacao}
                        onChange={(e) => atualizarInputsAtivo({ qtdNoitesInstalacao: Number(e.target.value) })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </GrupoFerragens>

                {itemAtivo.modeloId === "sacada" && (
                  <GrupoFerragens titulo="Opcionais da Sacada">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <Label>Caixa Ar Condicionado (qtd.)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={itemAtivo.inputs.qtdCaixaArCondicionado}
                          onChange={(e) => atualizarInputsAtivo({ qtdCaixaArCondicionado: Number(e.target.value) })}
                          className="font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label>Respiro Alumínio (m²)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={itemAtivo.inputs.m2RespiroAluminio}
                          onChange={(e) => atualizarInputsAtivo({ m2RespiroAluminio: Number(e.target.value) })}
                          className="font-mono"
                        />
                      </div>
                      <label className="flex items-center gap-2 pt-5">
                        <Checkbox
                          checked={itemAtivo.inputs.incluirArtEngenheiro}
                          onChange={(e) => atualizarInputsAtivo({ incluirArtEngenheiro: e.target.checked })}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir ART Engenheiro</span>
                      </label>
                      <label className="flex items-center gap-2 sm:col-span-3">
                        <Checkbox
                          checked={itemAtivo.inputs.kitCorDiferenteSacada}
                          onChange={(e) => atualizarInputsAtivo({ kitCorDiferenteSacada: e.target.checked })}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Kit em cor diferente (+15% sobre o kit — o vidro não entra)
                        </span>
                      </label>
                    </div>
                  </GrupoFerragens>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start">
          <Card className="reveal" style={{ animationDelay: "200ms" }}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  Resumo do Item Ativo
                </CardTitle>
                <CardDescription>
                  {itemAtivo.ambiente || "Sem nome"} · {nomeModeloAtivo}
                </CardDescription>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 text-[0.7rem] dark:border-zinc-800 dark:bg-zinc-900/60">
                <button
                  type="button"
                  onClick={() => setModoResumo("agrupado")}
                  className={cn(
                    "rounded-md px-2 py-1 font-medium transition-colors",
                    modoResumo === "agrupado"
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  Agrupado
                </button>
                <button
                  type="button"
                  onClick={() => setModoResumo("separado")}
                  className={cn(
                    "rounded-md px-2 py-1 font-medium transition-colors",
                    modoResumo === "separado"
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  Separado
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {modoResumo === "agrupado" ? (
                resultadoAtivo.itens.map((item, i) => <LinhaItem key={`${item.label}-${i}`} item={item} />)
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {itensEstruturais.map((item, i) => (
                      <LinhaItem key={`${item.label}-${i}`} item={item} />
                    ))}
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {isDivisoria ? "Subtotal da Divisória" : "Subtotal do Produto"}
                      </span>
                      <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                        {formatBRL(resultadoAtivo.subtotalEstrutural)}
                      </span>
                    </div>
                  </div>
                  {itensOpcionais.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      {itensOpcionais.map((item, i) => (
                        <LinhaItem key={`${item.label}-${i}`} item={item} />
                      ))}
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">Subtotal de Opcionais</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                          {formatBRL(resultadoAtivo.subtotalOpcionais)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Subtotal do Item
              </span>
              <span className="font-mono text-lg font-bold text-zinc-800 dark:text-zinc-100">
                {formatBRL(resultadoAtivo.total)}
              </span>
            </CardFooter>
          </Card>

          <Card className="reveal" style={{ animationDelay: "260ms" }}>
            <CardHeader>
              <CardTitle>Total do Projeto</CardTitle>
              <CardDescription>{itens.length} item(ns) no orçamento</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                {resumo.itens.map((r) => (
                  <button
                    key={r.itemId}
                    type="button"
                    onClick={() => selecionarItem(r.itemId)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      r.itemId === itemAtivo.id && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                    title="Editar este item"
                  >
                    <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                      {r.ambiente || "Sem nome"}{" "}
                      <span className="text-zinc-400 dark:text-zinc-500">· {nomeDoModelo(r.modeloId)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-zinc-700 dark:text-zinc-300">
                      {formatBRL(r.resultado.total)}
                    </span>
                  </button>
                ))}
                <div className="flex items-center justify-between border-t border-zinc-100 px-2 pt-2 text-sm dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Soma de todos os itens</span>
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {formatBRL(resumo.totalGeralAntesDoRT)}
                  </span>
                </div>
              </div>

              <GrupoFerragens titulo="Reserva Técnica (Projeto)">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-col gap-1">
                    <Label>Tipo</Label>
                    <SegmentedToggle
                      value={tipoRT}
                      onChange={(v) => setRT(v, valorRT)}
                      options={[
                        { value: "fixo", label: "R$" },
                        { value: "percentual", label: "%" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>{tipoRT === "percentual" ? "Percentual da RT (%)" : "Valor da RT (R$)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={valorRT}
                      onChange={(e) => setRT(tipoRT, Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  {tipoRT === "percentual" && (
                    <div className="flex flex-col gap-1">
                      <Label>RT calculada</Label>
                      <p className="flex h-9 items-center font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatBRL(resumo.valorRTCalculado)}
                      </p>
                    </div>
                  )}
                </div>
              </GrupoFerragens>

              <Button variant="outline" className="w-full" onClick={() => setMostrarSalvar(true)}>
                <Save className="h-4 w-4" />
                Salvar Orçamento
              </Button>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Total Geral do Projeto
              </span>
              <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-cyan-400 dark:to-teal-300">
                {formatBRL(resumo.totalGeralFinal)}
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>

      {mostrarAdicionar && (
        <AdicionarItemDialog
          modelos={modelos}
          onEscolher={(modeloId) => {
            addItem(modeloId);
            setMostrarAdicionar(false);
          }}
          onClose={() => setMostrarAdicionar(false)}
        />
      )}

      {mostrarSalvar && (
        <SalvarOrcamentoDialog onClose={() => setMostrarSalvar(false)} onConfirmar={salvarOrcamento} />
      )}
    </div>
  );
}
