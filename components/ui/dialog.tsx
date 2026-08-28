"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Modal genérico: overlay + painel centralizado. Não controla se está aberto —
 * quem usa decide isso montando/desmontando este componente (`{aberto && <Dialog>...}`),
 * o que também garante que qualquer estado interno do conteúdo (ex.: campos de
 * formulário) comece limpo toda vez que reabrir, sem precisar de useEffect pra resetar.
 */
export function Dialog({
  onClose,
  children,
  className,
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn("reveal w-full max-w-md", className)}
        style={{ animationDuration: "0.3s" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
