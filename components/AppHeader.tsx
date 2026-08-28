"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Layers3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/LogoutButton";

function PageNav() {
  const pathname = usePathname();
  const linkClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-white text-cyan-700 shadow-sm dark:bg-zinc-800 dark:text-cyan-300"
        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
    );

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
      <Link href="/" className={linkClass(pathname === "/")}>
        <Layers3 className="h-4 w-4" />
        Detalhado
      </Link>
      <Link href="/simplificado" className={linkClass(pathname === "/simplificado")}>
        <Zap className="h-4 w-4" />
        Simplificado
      </Link>
      <Link href="/orcamentos" className={linkClass(pathname === "/orcamentos")}>
        <FolderOpen className="h-4 w-4" />
        Salvos
      </Link>
    </div>
  );
}

export function AppHeader({
  subtitle,
  extraControls,
  pageTabs,
  userEmail,
}: {
  subtitle: string;
  extraControls?: ReactNode;
  pageTabs?: ReactNode;
  userEmail?: string;
}) {
  return (
    <header className="reveal flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent dark:from-cyan-400 dark:to-teal-300">
            Orçamentos · Divisórias de Vidro
          </h1>
          <p className="font-mono text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageNav />
          {extraControls}
          <ThemeToggle />
          {userEmail && <LogoutButton email={userEmail} />}
        </div>
      </div>
      {pageTabs}
    </header>
  );
}
