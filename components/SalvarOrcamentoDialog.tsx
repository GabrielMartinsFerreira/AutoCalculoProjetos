"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DadosSalvarOrcamento {
  nomeCliente: string | null;
  nomeVendedor: string | null;
  codigo: string | null;
}

function gerarCodigoSugerido() {
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `ORC-${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(agora.getHours())}${pad(agora.getMinutes())}`;
}

/**
 * Substitui o antigo `prompt()` nativo — agora coleta 3 campos (cliente/empresa,
 * vendedor e um código de identificação) ao invés de só o nome do cliente.
 * Montado/desmontado pelo pai (nunca recebe `open`), então cada abertura começa
 * com um código novo sugerido e os campos em branco.
 */
export function SalvarOrcamentoDialog({
  onClose,
  onConfirmar,
}: {
  onClose: () => void;
  onConfirmar: (dados: DadosSalvarOrcamento) => Promise<boolean>;
}) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeVendedor, setNomeVendedor] = useState("");
  const [codigo, setCodigo] = useState(gerarCodigoSugerido);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setSalvando(true);
    setErro(null);
    const ok = await onConfirmar({
      nomeCliente: nomeCliente.trim() || null,
      nomeVendedor: nomeVendedor.trim() || null,
      codigo: codigo.trim() || null,
    });
    if (ok) {
      onClose();
    } else {
      setSalvando(false);
      setErro("Não consegui salvar. Confira sua conexão e tente de novo.");
    }
  }

  return (
    <Dialog onClose={onClose}>
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Salvar Orçamento</CardTitle>
            <CardDescription>Identifique este orçamento para encontrá-lo depois</CardDescription>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Cliente / Empresa</Label>
            <Input
              autoFocus
              placeholder="Ex: João Silva ou Vidraçaria XPTO"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Vendedor</Label>
            <Input
              placeholder="Quem está fechando este orçamento"
              value={nomeVendedor}
              onChange={(e) => setNomeVendedor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Código do Orçamento</Label>
            <Input
              className="font-mono"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
            />
          </div>
          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={salvando}>
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </Card>
    </Dialog>
  );
}
