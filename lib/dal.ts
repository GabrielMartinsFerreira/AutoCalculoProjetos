import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Fonte única de verdade sobre "quem está logado" no servidor. Usa
 * `getUser()` (não `getSession()`) porque ele revalida o token direto com o
 * Supabase Auth — é a checagem "segura" recomendada para Server Components,
 * Route Handlers e Server Actions (ver guia de autenticação do Next.js).
 * `cache()` evita repetir a validação várias vezes na mesma renderização.
 */
export const getUsuarioLogado = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
