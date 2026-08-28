import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxyAuth";

/**
 * Protege todas as páginas (exceto /login) — redireciona pra /login quem não
 * está autenticado. Rotas de API cuidam da própria checagem de sessão (ver
 * app/api/orcamentos), por isso ficam fora do matcher: um 401 em JSON é mais
 * útil pra quem chama fetch() do que um redirect pra uma página HTML.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
