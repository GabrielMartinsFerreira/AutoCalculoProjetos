import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrcamentoSalvoResumo, TipoOrcamento } from "@/lib/types";

interface OrcamentoRow {
  id: string;
  tipo: TipoOrcamento;
  codigo: string | null;
  nome_vendedor: string | null;
  nome_cliente: string | null;
  total: number | null;
  criado_em: string;
}

function paraResumo(row: OrcamentoRow): OrcamentoSalvoResumo {
  return {
    id: row.id,
    tipo: row.tipo,
    codigo: row.codigo,
    nomeVendedor: row.nome_vendedor,
    nomeCliente: row.nome_cliente,
    total: row.total,
    criadoEm: row.criado_em,
  };
}

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("id, tipo, codigo, nome_vendedor, nome_cliente, total, criado_em")
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json((data as OrcamentoRow[]).map(paraResumo));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tipo?: TipoOrcamento;
    codigo?: string | null;
    nomeVendedor?: string | null;
    nomeCliente?: string | null;
    dados?: unknown;
    total?: number | null;
  };
  const { tipo, codigo, nomeVendedor, nomeCliente, dados, total } = body;

  if (tipo !== "detalhado" && tipo !== "simplificado") {
    return NextResponse.json({ erro: "tipo inválido" }, { status: 400 });
  }
  if (!dados || typeof dados !== "object") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("orcamentos")
    .insert({
      tipo,
      codigo: codigo || null,
      nome_vendedor: nomeVendedor || null,
      nome_cliente: nomeCliente || null,
      total: typeof total === "number" ? total : null,
      dados,
    })
    .select("id, tipo, codigo, nome_vendedor, nome_cliente, total, criado_em")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json(paraResumo(data as OrcamentoRow));
}
