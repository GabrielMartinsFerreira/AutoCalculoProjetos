"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, RotateCcw, Save } from "lucide-react";
import { useOrcamentoSimplificadoDraft, useProductStore } from "@/lib/store";
import { useSimplifiedCalculator } from "@/lib/useSimplifiedCalculator";
import { OPCIONAIS_PADRAO } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { VaoSimplesRow } from "@/components/VaoSimplesRow";
import { SalvarOrcamentoDialog, type DadosSalvarOrcamento } from "@/components/SalvarOrcamentoDialog";

function SecaoComparador({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function SimplifiedCalculator() {
  const inputs = useOrcamentoSimplificadoDraft((s) => s.inputs);
  const setInputs = useOrcamentoSimplificadoDraft((s) => s.setInputs);
  const addVao = useOrcamentoSimplificadoDraft((s) => s.addVao);
  const updateVao = useOrcamentoSimplificadoDraft((s) => s.updateVao);
  const removeVao = useOrcamentoSimplificadoDraft((s) => s.removeVao);
  const setOpcionaisModelo = useOrcamentoSimplificadoDraft((s) => s.setOpcionaisModelo);
  const resetDraft = useOrcamentoSimplificadoDraft((s) => s.reset);
  const resultado = useSimplifiedCalculator(inputs);

  const productsByModelo = useProductStore((s) => s.productsByModelo);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const [mostrarSalvar, setMostrarSalvar] = useState(false);

  // Comparador seletivo: só os modelos NÃO marcados como desmarcados aparecem lado a
  // lado. Lista de exclusão (não de seleção) — um modelo novo entra automaticamente.
  const modelosAtivos = resultado.porModelo.filter(
    (item) => !inputs.modelosDesmarcados.includes(item.modeloId)
  );

  function novoOrcamento() {
    if (!confirm("Começar um novo orçamento simplificado? Os dados atuais serão apagados.")) return;
    resetDraft();
  }

  async function salvarOrcamento(dadosExtra: DadosSalvarOrcamento) {
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "simplificado",
          ...dadosExtra,
          dados: inputs,
          total: null,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function alternarModelo(modeloId: string) {
    const estaDesmarcado = inputs.modelosDesmarcados.includes(modeloId);
    setInputs({
      ...inputs,
      modelosDesmarcados: estaDesmarcado
        ? inputs.modelosDesmarcados.filter((id) => id !== modeloId)
        : [...inputs.modelosDesmarcados, modeloId],
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="reveal" style={{ animationDelay: "40ms" }}>
        <CardHeader>
          <CardTitle>Comparador de Modelos</CardTitle>
          <CardDescription>
            Escolha quais modelos entram na comparação e configure a Reserva Técnica
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SecaoComparador titulo="Modelos a comparar">
            <div className="flex flex-wrap gap-2">
              {resultado.porModelo.map((item) => {
                const ativo = !inputs.modelosDesmarcados.includes(item.modeloId);
                return (
                  <button
                    key={item.modeloId}
                    type="button"
                    onClick={() => alternarModelo(item.modeloId)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      ativo
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300"
                        : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400"
                    )}
                  >
                    {ativo && <Check className="h-3.5 w-3.5" />}
                    {item.nomeModelo}
                  </button>
                );
              })}
              {resultado.porModelo.length === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhum modelo cadastrado.</p>
              )}
            </div>
          </SecaoComparador>

          <SecaoComparador titulo="Reserva Técnica (RT)">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <Label>Tipo</Label>
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <button
                    type="button"
                    onClick={() => setInputs({ ...inputs, tipoRT: "fixo" })}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      inputs.tipoRT === "fixo"
                        ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputs({ ...inputs, tipoRT: "percentual" })}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      inputs.tipoRT === "percentual"
                        ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 sm:max-w-[220px]">
                <Label>{inputs.tipoRT === "percentual" ? "Percentual da RT (%)" : "Valor da RT (R$)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={inputs.valorRT}
                  onChange={(e) => setInputs({ ...inputs, valorRT: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-zinc-400 sm:pb-2 dark:text-zinc-500">
                {inputs.tipoRT === "percentual"
                  ? "Aplicada sobre o total de cada modelo mostrado abaixo."
                  : "Somada ao total de cada modelo mostrado abaixo."}
              </p>
            </div>
          </SecaoComparador>
        </CardContent>
      </Card>

      <Card className="reveal" style={{ animationDelay: "120ms" }}>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Vãos</CardTitle>
            <CardDescription>
              {inputs.vaos.length} vão(s) · {resultado.area.toFixed(2)} m² no total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={novoOrcamento} title="Limpar tudo e começar um orçamento novo">
              <RotateCcw className="h-4 w-4" />
              Novo Orçamento
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMostrarSalvar(true)}>
              <Save className="h-4 w-4" />
              Salvar Orçamento
            </Button>
            <Button size="sm" onClick={addVao}>
              <Plus className="h-4 w-4" />
              Adicionar Vão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {inputs.vaos.map((vao, i) => (
            <VaoSimplesRow
              key={vao.id}
              vao={vao}
              index={i}
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

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Cada modelo tem seus próprios opcionais — escolha livremente o que entra em cada um
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modelosAtivos.map((item, i) => {
            const opcionais = inputs.opcionaisPorModelo[item.modeloId] ?? OPCIONAIS_PADRAO;
            const produtosModelo = productsByModelo[item.modeloId] ?? [];
            const pelicula = produtosModelo.find((p) => p.key === "pelicula");
            const laDeVidro = produtosModelo.find((p) => p.key === "laDeVidro");
            const portaPremium = produtosModelo.find((p) => p.key === "portaPremium");
            const adicionalNoturno = produtosModelo.find((p) => p.key === "adicionalNoturno");
            return (
              <Card key={item.modeloId} className="reveal flex flex-col" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <CardHeader>
                  <CardTitle>{item.nomeModelo}</CardTitle>
                  <CardDescription>
                    {resultado.area.toFixed(2)} m² × {formatBRL(item.valorM2)} /m²
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Base</span>
                    <span className="font-mono">{formatBRL(item.custoBase)}</span>
                  </div>

                  {item.detalhamentoPorVao.length > 0 && (
                    <details className="group rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1.5 text-[0.7rem] font-medium text-zinc-500 marker:hidden [&::-webkit-details-marker]:hidden dark:text-zinc-400">
                        <span>Detalhamento por Vão</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 dark:text-zinc-500" />
                      </summary>
                      <ul className="flex flex-col gap-1.5 border-t border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
                        {item.detalhamentoPorVao.map((d, vi) => (
                          <li key={d.vaoId} className="flex items-center justify-between gap-2 text-[0.7rem]">
                            <span className="text-zinc-500 dark:text-zinc-400">
                              Vão {vi + 1}: <span className="font-mono">{d.area.toFixed(2)} m²</span>
                            </span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-300">{formatBRL(d.valor)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    {pelicula && (
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5">
                          <Checkbox
                            checked={opcionais.incluirPelicula}
                            onChange={(e) =>
                              setOpcionaisModelo(item.modeloId, { incluirPelicula: e.target.checked })
                            }
                          />
                          <span className="text-xs text-zinc-700 dark:text-zinc-300">Película</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={pelicula.valor}
                            onChange={(e) =>
                              updateProduct(item.modeloId, pelicula.id, {
                                nome: pelicula.nome,
                                unidade: pelicula.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: pelicula.tipoVaoAssociado,
                              })
                            }
                            className="h-7 w-20 font-mono text-xs"
                          />
                          <span className="text-[0.65rem] text-zinc-400 dark:text-zinc-500">/m²</span>
                        </div>
                      </div>
                    )}
                    {laDeVidro && (
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5">
                          <Checkbox
                            checked={opcionais.incluirLaDeVidro}
                            onChange={(e) =>
                              setOpcionaisModelo(item.modeloId, { incluirLaDeVidro: e.target.checked })
                            }
                          />
                          <span className="text-xs text-zinc-700 dark:text-zinc-300">Lã de Vidro</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={laDeVidro.valor}
                            onChange={(e) =>
                              updateProduct(item.modeloId, laDeVidro.id, {
                                nome: laDeVidro.nome,
                                unidade: laDeVidro.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: laDeVidro.tipoVaoAssociado,
                              })
                            }
                            className="h-7 w-20 font-mono text-xs"
                          />
                          <span className="text-[0.65rem] text-zinc-400 dark:text-zinc-500">/m²</span>
                        </div>
                      </div>
                    )}
                    {portaPremium && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Porta Premium</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={opcionais.qtdPortaPremium}
                            onChange={(e) =>
                              setOpcionaisModelo(item.modeloId, {
                                qtdPortaPremium: Number(e.target.value),
                              })
                            }
                            className="h-7 w-12 font-mono text-xs"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={portaPremium.valor}
                            onChange={(e) =>
                              updateProduct(item.modeloId, portaPremium.id, {
                                nome: portaPremium.nome,
                                unidade: portaPremium.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: portaPremium.tipoVaoAssociado,
                              })
                            }
                            className="h-7 w-20 font-mono text-xs"
                          />
                          <span className="text-[0.65rem] text-zinc-400 dark:text-zinc-500">/un</span>
                        </div>
                      </div>
                    )}
                    {adicionalNoturno && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Adicional Noturno</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={opcionais.qtdNoitesInstalacao}
                            onChange={(e) =>
                              setOpcionaisModelo(item.modeloId, {
                                qtdNoitesInstalacao: Number(e.target.value),
                              })
                            }
                            className="h-7 w-12 font-mono text-xs"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={adicionalNoturno.valor}
                            onChange={(e) =>
                              updateProduct(item.modeloId, adicionalNoturno.id, {
                                nome: adicionalNoturno.nome,
                                unidade: adicionalNoturno.unidade,
                                valor: Number(e.target.value),
                                tipoVaoAssociado: adicionalNoturno.tipoVaoAssociado,
                              })
                            }
                            className="h-7 w-20 font-mono text-xs"
                          />
                          <span className="text-[0.65rem] text-zinc-400 dark:text-zinc-500">/noite</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {item.custoOpcionaisTotal > 0 && (
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Opcionais</span>
                      <span className="font-mono">{formatBRL(item.custoOpcionaisTotal)}</span>
                    </div>
                  )}
                  {item.custoRT > 0 && (
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Reserva Técnica (RT)</span>
                      <span className="font-mono">{formatBRL(item.custoRT)}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Total
                  </span>
                  <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-cyan-400 dark:to-teal-300">
                    {formatBRL(item.total)}
                  </span>
                </CardFooter>
              </Card>
            );
          })}
          {modelosAtivos.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Nenhum modelo selecionado pra comparar. Marque pelo menos um no painel acima.
            </p>
          )}
        </div>
      </div>

      {mostrarSalvar && (
        <SalvarOrcamentoDialog onClose={() => setMostrarSalvar(false)} onConfirmar={salvarOrcamento} />
      )}
    </div>
  );
}
