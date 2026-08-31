"use client";

import { useState } from "react";
import { RotateCcw, Plus, Layers, Save } from "lucide-react";
import { useCalculator } from "@/lib/useCalculator";
import { obterEstrategia } from "@/lib/calculators";
import { EMPTY_PRODUCTS, useModeloStore, useOrcamentoDetalhadoDraft, useProductStore } from "@/lib/store";
import { cn, formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { VaoRow } from "@/components/VaoRow";
import { SalvarOrcamentoDialog, type DadosSalvarOrcamento } from "@/components/SalvarOrcamentoDialog";
import type { CalculoItem } from "@/lib/types";

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

type ModoResumo = "agrupado" | "separado";

export function ProjectCalculator() {
  const inputs = useOrcamentoDetalhadoDraft((s) => s.inputs);
  const setInputs = useOrcamentoDetalhadoDraft((s) => s.setInputs);
  const addVao = useOrcamentoDetalhadoDraft((s) => s.addVao);
  const updateVao = useOrcamentoDetalhadoDraft((s) => s.updateVao);
  const removeVao = useOrcamentoDetalhadoDraft((s) => s.removeVao);
  const resetDraft = useOrcamentoDetalhadoDraft((s) => s.reset);
  const modeloSelecionadoId = useModeloStore((s) => s.modeloSelecionadoId);
  const resultado = useCalculator(inputs, modeloSelecionadoId);
  const estrategia = obterEstrategia(modeloSelecionadoId);
  const produtosDoModelo = useProductStore(
    (s) => s.productsByModelo[modeloSelecionadoId] ?? EMPTY_PRODUCTS
  );
  const pelicula = produtosDoModelo.find((p) => p.key === "pelicula");
  const laDeVidro = produtosDoModelo.find((p) => p.key === "laDeVidro");
  const updateProduct = useProductStore((s) => s.updateProduct);
  // Mesmo quando a fórmula do modelo não usa o tipo do vão, o campo precisa
  // continuar visível se algum produto do catálogo estiver vinculado a um tipo —
  // senão o vínculo nunca teria como bater (o vão ficaria travado em "Fixo").
  const temProdutoVinculado = produtosDoModelo.some((p) => p.tipoVaoAssociado !== null);
  const mostrarTipoVao = estrategia.usaTipoVao || temProdutoVinculado;
  const nomeModelo = useModeloStore(
    (s) => s.modelos.find((m) => m.id === s.modeloSelecionadoId)?.nome ?? "modelo"
  );

  const [mostrarSalvar, setMostrarSalvar] = useState(false);
  const [modoResumo, setModoResumo] = useState<ModoResumo>("agrupado");

  const itensEstruturais = resultado.itens.filter((i) => i.grupo === "estrutural");
  const itensOpcionais = resultado.itens.filter((i) => i.grupo === "opcional");

  function novoOrcamento() {
    if (!confirm("Começar um novo orçamento? Os dados atuais serão apagados.")) return;
    resetDraft();
  }

  async function salvarOrcamento(dadosExtra: DadosSalvarOrcamento) {
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "detalhado",
          ...dadosExtra,
          dados: inputs,
          total: resultado.total,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        <Card className="reveal" style={{ animationDelay: "40ms" }}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Vãos (Módulos da {nomeModelo})</CardTitle>
              <CardDescription>Adicione cada vão do projeto com sua largura, altura e tipo</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {estrategia.usaCorVidro && (
                <Select
                  value={inputs.corVidroSacada}
                  onChange={(e) =>
                    setInputs({ ...inputs, corVidroSacada: e.target.value as "incolor" | "verde" })
                  }
                  className="!h-8 w-40 text-xs"
                  title="Cor do vidro da Sacada"
                >
                  <option value="incolor">Vidro Incolor</option>
                  <option value="verde">Vidro Verde</option>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={novoOrcamento} title="Limpar tudo e começar um orçamento novo">
                <RotateCcw className="h-4 w-4" />
                Novo Orçamento
              </Button>
              <Button size="sm" onClick={addVao}>
                <Plus className="h-4 w-4" />
                Adicionar Vão
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {inputs.vaos.map((vao, i) => (
              <VaoRow
                key={vao.id}
                vao={vao}
                index={i}
                mostrarTipo={mostrarTipoVao}
                onChange={(v) => updateVao(vao.id, v)}
                onRemove={() => removeVao(vao.id)}
              />
            ))}
            {inputs.vaos.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Nenhum vão adicionado. Clique em &quot;Adicionar Vão&quot;.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="reveal" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle>Ferragens e Opcionais</CardTitle>
            <CardDescription>Itens gerais do projeto, aplicados uma única vez</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <GrupoFerragens titulo="Ferragens">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label>Qtd. Puxadores H</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.qtdPuxadores}
                    onChange={(e) => setInputs({ ...inputs, qtdPuxadores: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Fechadura PT Correr</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.qtdFechaduras}
                    onChange={(e) => setInputs({ ...inputs, qtdFechaduras: Number(e.target.value) })}
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
                    value={inputs.qtdPortaPremium}
                    onChange={(e) => setInputs({ ...inputs, qtdPortaPremium: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Kit Porta Simples (qtd.)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.qtdKitPortaSimples}
                    onChange={(e) => setInputs({ ...inputs, qtdKitPortaSimples: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Kit Porta Dupla (qtd.)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.qtdKitPortaDupla}
                    onChange={(e) => setInputs({ ...inputs, qtdKitPortaDupla: Number(e.target.value) })}
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
                      checked={inputs.incluirPelicula}
                      onChange={(e) => setInputs({ ...inputs, incluirPelicula: e.target.checked })}
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
                          updateProduct(modeloSelecionadoId, pelicula.id, {
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
                      checked={inputs.incluirLaDeVidro}
                      onChange={(e) => setInputs({ ...inputs, incluirLaDeVidro: e.target.checked })}
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
                          updateProduct(modeloSelecionadoId, laDeVidro.id, {
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
                    value={inputs.qtdNoitesInstalacao}
                    onChange={(e) => setInputs({ ...inputs, qtdNoitesInstalacao: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
              </div>
            </GrupoFerragens>

            <GrupoFerragens titulo="Outros">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label>Reserva Técnica — RT (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={inputs.valorRT}
                    onChange={(e) => setInputs({ ...inputs, valorRT: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Caixa Ar Condicionado (qtd.)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.qtdCaixaArCondicionado}
                    onChange={(e) => setInputs({ ...inputs, qtdCaixaArCondicionado: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Respiro Alumínio (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={inputs.m2RespiroAluminio}
                    onChange={(e) => setInputs({ ...inputs, m2RespiroAluminio: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5">
                  <Checkbox
                    checked={inputs.incluirArtEngenheiro}
                    onChange={(e) => setInputs({ ...inputs, incluirArtEngenheiro: e.target.checked })}
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir ART Engenheiro</span>
                </label>
              </div>
            </GrupoFerragens>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="reveal" style={{ animationDelay: "200ms" }}>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Resumo do Orçamento
              </CardTitle>
              <CardDescription>
                {inputs.vaos.length} vão(s) · {resultado.areaTotalVidro.toFixed(2)} m² de vidro
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
              resultado.itens.map((item) => <LinhaItem key={item.label} item={item} />)
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {itensEstruturais.map((item) => (
                    <LinhaItem key={item.label} item={item} />
                  ))}
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">Subtotal da Divisória</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatBRL(resultado.subtotalEstrutural)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {itensOpcionais.map((item) => (
                    <LinhaItem key={item.label} item={item} />
                  ))}
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">Subtotal de Opcionais</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatBRL(resultado.subtotalOpcionais)}
                    </span>
                  </div>
                </div>
              </>
            )}
            <Button variant="outline" className="mt-1 w-full" onClick={() => setMostrarSalvar(true)}>
              <Save className="h-4 w-4" />
              Salvar Orçamento
            </Button>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {modoResumo === "separado" ? "Total Final" : "Custo Total"}
            </span>
            <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-cyan-400 dark:to-teal-300">
              {formatBRL(resultado.total)}
            </span>
          </CardFooter>
        </Card>
      </div>

      {mostrarSalvar && (
        <SalvarOrcamentoDialog onClose={() => setMostrarSalvar(false)} onConfirmar={salvarOrcamento} />
      )}
    </div>
  );
}
