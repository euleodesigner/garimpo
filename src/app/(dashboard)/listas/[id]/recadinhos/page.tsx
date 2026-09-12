import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { RecadoCreatorForm } from "./recado-creator-form";

export default async function RecadinhosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mensagens } = await supabase
    .from("messages")
    .select("id, nome, texto, created_at")
    .eq("list_id", id)
    .order("created_at", { ascending: false });

  const { data: perfil } = user
    ? await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">Recadinhos</h2>
        <p className="mt-1 text-sm text-sub">Recados públicos que seus convidados deixam na lista.</p>
      </div>

      <RecadoCreatorForm listaId={id} nomePadrao={perfil?.nome ?? ""} />

      {!mensagens?.length ? (
        <Card className="mt-5 text-center text-sub">Nenhum recadinho ainda.</Card>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {mensagens.map((m) => (
            <Card key={m.id}>
              <div className="text-sm font-bold text-ink">{m.nome}</div>
              <div className="mt-1 text-sm text-sub">{m.texto}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
