"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ email }: { email: string }) {
  const router = useRouter();

  async function sair() {
    if (!confirm("Sair da sua conta?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/80 py-1 pl-3 pr-1 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="hidden max-w-[140px] truncate font-mono text-xs text-zinc-500 sm:inline dark:text-zinc-400">
        {email}
      </span>
      <Button size="icon" variant="ghost" onClick={sair} title="Sair" aria-label="Sair">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
