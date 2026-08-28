"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useModeloStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ModeloSelector() {
  const modelos = useModeloStore((s) => s.modelos);
  const modeloSelecionadoId = useModeloStore((s) => s.modeloSelecionadoId);
  const selecionarModelo = useModeloStore((s) => s.selecionarModelo);
  const addModelo = useModeloStore((s) => s.addModelo);

  const [isAdding, setIsAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [valorM2, setValorM2] = useState("");

  function confirmarNovo() {
    const nomeLimpo = nome.trim();
    const valor = Number(valorM2.replace(",", "."));
    if (!nomeLimpo || Number.isNaN(valor)) return;
    addModelo(nomeLimpo, valor);
    setNome("");
    setValorM2("");
    setIsAdding(false);
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          placeholder="Nome do modelo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmarNovo();
            if (e.key === "Escape") setIsAdding(false);
          }}
          className="h-9 w-36"
        />
        <Input
          inputMode="decimal"
          placeholder="R$/m²"
          value={valorM2}
          onChange={(e) => setValorM2(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmarNovo();
            if (e.key === "Escape") setIsAdding(false);
          }}
          className="h-9 w-20 font-mono"
        />
        <Button size="icon" variant="ghost" onClick={confirmarNovo} title="Adicionar modelo">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)} title="Cancelar">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        value={modeloSelecionadoId}
        onChange={(e) => selecionarModelo(e.target.value)}
        className="w-44"
      >
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </Select>
      <Button size="icon" variant="outline" onClick={() => setIsAdding(true)} title="Cadastrar novo modelo">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
