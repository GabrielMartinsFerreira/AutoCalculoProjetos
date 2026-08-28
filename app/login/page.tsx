"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const TRINTA_DIAS_EM_SEGUNDOS = 60 * 60 * 24 * 30;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);

    const supabase = createClient(manterConectado ? TRINTA_DIAS_EM_SEGUNDOS : undefined);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setEntrando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-10">
      <Card className="reveal w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Acesso Restrito
          </CardTitle>
          <CardDescription>Orçamentos · Divisórias de Vidro</CardDescription>
        </CardHeader>
        <form onSubmit={entrar}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>E-mail</Label>
              <Input
                type="email"
                autoFocus
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Senha</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Manter conectado</span>
            </label>
            {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={entrando}>
              <LogIn className="h-4 w-4" />
              {entrando ? "Entrando..." : "Entrar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
