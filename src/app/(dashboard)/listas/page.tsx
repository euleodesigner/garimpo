import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ButtonPrimary, ButtonOutline, Card, Chip } from "@/components/ui";

export default async function MinhasListasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // filtro explícito por owner_id: a RLS de authenticated em `lists` também
  // deixa ler listas ATIVAS de outros creators (spec §7.6, pro cenário de
  // sessão compartilhada) -- "minhas listas" não pode depender só da RLS
  const { data: listas } = await supabase
    .from("lists")
    .select("id, nome, tipo_evento, status")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });

  const toneDoStatus = (status: string) =>
    status === "ativa" ? "jade" : status === "arquivada" ? "default" : "gold";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Minhas listas</h1>
          <p className="mt-1 text-sub">Todas as suas listas de presentes.</p>
        </div>
        <Link href="/listas/nova">
          <ButtonPrimary>+ Criar lista</ButtonPrimary>
        </Link>
      </div>

      {!listas?.length ? (
        <Card className="mt-8 text-center text-sub">
          Você ainda não criou nenhuma lista.
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listas.map((l) => (
            <Card key={l.id}>
              <h3 className="text-lg font-bold text-ink">{l.nome}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.tipo_evento && <Chip tone="jade">{l.tipo_evento}</Chip>}
                <Chip tone={toneDoStatus(l.status)}>{l.status}</Chip>
              </div>
              <Link href={`/listas/${l.id}/presentes`}>
                <ButtonOutline className="mt-5 w-full">Gerenciar lista →</ButtonOutline>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
