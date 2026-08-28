import { AppHeader } from "@/components/AppHeader";
import { OrcamentosSalvos } from "@/components/OrcamentosSalvos";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrcamentoSalvoResumo, TipoOrcamento } from "@/lib/types";

// Sempre busca a lista fresca do banco — nunca cacheia esta página.
export const dynamic = "force-dynamic";

interface OrcamentoRow {
  id: string;
  tipo: TipoOrcamento;
  codigo: string | null;
  nome_vendedor: string | null;
  nome_cliente: string | null;
  total: number | null;
  criado_em: string;
}

async function buscarOrcamentos(): Promise<{ itens: OrcamentoSalvoResumo[]; erro: string | null }> {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("orcamentos")
      .select("id, tipo, codigo, nome_vendedor, nome_cliente, total, criado_em")
      .order("criado_em", { ascending: false });

    if (error) return { itens: [], erro: error.message };

    const itens = (data as OrcamentoRow[]).map((row) => ({
      id: row.id,
      tipo: row.tipo,
      codigo: row.codigo,
      nomeVendedor: row.nome_vendedor,
      nomeCliente: row.nome_cliente,
      total: row.total,
      criadoEm: row.criado_em,
    }));
    return { itens, erro: null };
  } catch (e) {
    return { itens: [], erro: e instanceof Error ? e.message : "Falha ao conectar ao Supabase." };
  }
}

export default async function OrcamentosPage() {
  const { itens, erro } = await buscarOrcamentos();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <AppHeader subtitle="Orçamentos salvos" />
      <OrcamentosSalvos itensIniciais={itens} erroInicial={erro} />
    </div>
  );
}
