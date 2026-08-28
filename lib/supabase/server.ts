import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components e Route Handlers — usa a chave anon
 * (não a secret) e opera com a sessão do usuário logado, lida dos cookies.
 * É a base do sistema de login: quem chama isso só enxerga o usuário se o
 * cookie de sessão for válido.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de dentro de um Server Component (não pode escrever cookie
            // ali) — sem problema, o proxy.ts já renova a sessão a cada request.
          }
        },
      },
    }
  );
}
