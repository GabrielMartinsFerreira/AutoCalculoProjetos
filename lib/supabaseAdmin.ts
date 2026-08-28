import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso EXCLUSIVO em código de servidor (Route Handlers em
 * app/api/**). Usa a secret key, que ignora Row Level Security — nunca importe
 * este arquivo de um componente "use client" nem exponha essa chave ao navegador.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local"
    );
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false },
  });
}
