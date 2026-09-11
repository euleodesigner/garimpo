import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Chip } from "@/components/ui";
import { ListaNav } from "./lista-nav";

export default async function ListaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // filtro explícito por owner_id: um creator não pode abrir a UI de edição
  // de uma lista que não é dele, mesmo que a RLS permita ler listas ativas
  // de terceiros (spec §7.6, cenário de sessão compartilhada)
  const { data: lista } = await supabase
    .from("lists")
    .select("id, nome, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!lista) notFound();

  const toneDoStatus =
    lista.status === "ativa" ? "jade" : lista.status === "arquivada" ? "default" : "gold";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/listas" className="text-sm font-semibold text-sub hover:text-ink">
        ← Minhas listas
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{lista.nome}</h1>
        <Chip tone={toneDoStatus}>{lista.status}</Chip>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <ListaNav listaId={id} />
        <div>{children}</div>
      </div>
    </div>
  );
}
