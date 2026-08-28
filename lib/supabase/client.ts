"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components (só usado na tela de login e no
 * botão de sair). `cookieMaxAge` controla "Manter conectado": com um valor,
 * o cookie de sessão sobrevive ao fechar o navegador; sem valor, vira cookie
 * de sessão (some quando o navegador fecha de vez).
 */
export function createClient(cookieMaxAge?: number) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieMaxAge ? { cookieOptions: { maxAge: cookieMaxAge } } : undefined
  );
}
