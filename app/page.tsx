import { redirect } from "next/navigation";
import { getUsuarioLogado } from "@/lib/dal";
import { HomeContent } from "@/components/HomeContent";

export default async function Home() {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/login");

  return <HomeContent userEmail={usuario.email ?? ""} />;
}
