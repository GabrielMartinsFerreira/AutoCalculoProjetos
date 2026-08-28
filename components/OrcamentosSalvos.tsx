"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Layers3, Trash2, Zap } from "lucide-react";
import { useOrcamentoDetalhadoDraft, useOrcamentoSimplificadoDraft } from "@/lib/store";
import type { OrcamentoSalvoDetalhe, OrcamentoSalvoResumo, ProjectInputs, SimplifiedInputs } from "@/lib/types";
import { formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrcamentosSalvos({
  itensIniciais,
  erroInicial,
}: {
  itensIniciais: OrcamentoSalvoResumo[];
  erroInicial: string | null;
}) {
  const [itens, setItens] = useState<OrcamentoSalvoResumo[]>(itensIniciais);
  const [erro] = useState<string | null>(erroInicial);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const router = useRouter();
  const setInputsDetalhado = useOrcamentoDetalhadoDraft((s) => s.setInputs);
  const setInputsSimplificado = useOrcamentoSimplificadoDraft((s) => s.setInputs);

  async function abrir(item: OrcamentoSalvoResumo) {
    setCarregandoId(item.id);
    try {
      const res = await fetch(`/api/orcamentos/${item.id}`);
      if (!res.ok) throw new Error();
      const completo: OrcamentoSalvoDetalhe = await res.json();
      if (completo.tipo === "detalhado") {
        setInputsDetalhado(completo.dados as ProjectInputs);
        router.push("/");
      } else {
        setInputsSimplificado(completo.dados as SimplifiedInputs);
        router.push("/simplificado");
      }
    } catch {
      alert("Não consegui abrir este orçamento.");
      setCarregandoId(null);
    }
  }

  async function excluir(item: OrcamentoSalvoResumo) {
    const rotulo = item.nomeCliente || "este orçamento";
    if (!confirm(`Excluir ${rotulo}? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/orcamentos/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItens((atual) => atual.filter((i) => i.id !== item.id));
    } catch {
      alert("Não consegui excluir este orçamento.");
    }
  }

  return (
    <Card className="reveal">
      <CardHeader>
        <CardTitle>Meus Orçamentos</CardTitle>
        <CardDescription>{itens.length} orçamento(s) salvo(s)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {erro && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Não consegui carregar os orçamentos salvos: {erro}
          </p>
        )}
        {itens.length === 0 && !erro && (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Nenhum orçamento salvo ainda. Use o botão &quot;Salvar Orçamento&quot; no Detalhado ou no
            Simplificado.
          </p>
        )}
        {itens.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {item.tipo === "detalhado" ? <Layers3 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              </span>
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100">
                  {item.nomeCliente || "Sem nome de cliente"}
                </p>
                <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {item.tipo === "detalhado" ? "Detalhado" : "Simplificado"} · {formatarData(item.criadoEm)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {item.total !== null && (
                <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {formatBRL(item.total)}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrir(item)}
                disabled={carregandoId === item.id}
              >
                <FolderOpen className="h-4 w-4" />
                {carregandoId === item.id ? "Abrindo..." : "Abrir"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => excluir(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
