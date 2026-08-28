import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrcamentoSalvoDetalhe, TipoOrcamento } from "@/lib/types";

interface OrcamentoRowCompleta {
  id: string;
  tipo: TipoOrcamento;
  codigo: string | null;
  nome_vendedor: string | null;
  nome_cliente: string | null;
  total: number | null;
  dados: OrcamentoSalvoDetalhe["dados"];
  criado_em: string;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("id, tipo, codigo, nome_vendedor, nome_cliente, total, dados, criado_em")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 404 });
  }

  const row = data as OrcamentoRowCompleta;
  const resultado: OrcamentoSalvoDetalhe = {
    id: row.id,
    tipo: row.tipo,
    codigo: row.codigo,
    nomeVendedor: row.nome_vendedor,
    nomeCliente: row.nome_cliente,
    total: row.total,
    dados: row.dados,
    criadoEm: row.criado_em,
  };
  return NextResponse.json(resultado);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("orcamentos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
