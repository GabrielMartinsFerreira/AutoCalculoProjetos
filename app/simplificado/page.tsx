import { redirect } from "next/navigation";
import { getUsuarioLogado } from "@/lib/dal";
import { SimplificadoContent } from "@/components/SimplificadoContent";

export default async function Simplificado() {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/login");

  return <SimplificadoContent userEmail={usuario.email ?? ""} />;
}
