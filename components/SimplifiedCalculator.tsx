"use client";

import { useState } from "react";
import { Plus, RotateCcw, Save } from "lucide-react";
import { useOrcamentoSimplificadoDraft, useProductStore } from "@/lib/store";
import { useSimplifiedCalculator } from "@/lib/useSimplifiedCalculator";
import { OPCIONAIS_PADRAO } from "@/lib/types";
import { formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { VaoSimplesRow } from "@/components/VaoSimplesRow";
import { SalvarOrcamentoDialog, type DadosSalvarOrcamento } from "@/components/SalvarOrcamentoDialog";

export function SimplifiedCalculator() {
  const inputs = useOrcamentoSimplificadoDraft((s) => s.inputs);
  const addVao = useOrcamentoSimplificadoDraft((s) => s.addVao);
  const updateVao = useOrcamentoSimplificadoDraft((s) => s.updateVao);
  const removeVao = useOrcamentoSimplificadoDraft((s) => s.removeVao);
  const setOpcionaisModelo = useOrcamentoSimplificadoDraft((s) => s.setOpcionaisModelo);
  const resetDraft = useOrcamentoSimplificadoDraft((s) => s.reset);
  const resultado = useSimplifiedCalculator(inputs);

  const productsByModelo = useProductStore((s) => s.productsByModelo);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const [mostrarSalvar, setMostrarSalvar] = useState(false);

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

  return (
    <div className="flex flex-col gap-5">
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
          {resultado.porModelo.map((item, i) => {
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
          {resultado.porModelo.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Nenhum modelo cadastrado. Adicione um modelo acima.
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
