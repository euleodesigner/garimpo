import { createClient } from "@/lib/supabase/server";
import { EventoForm } from "./evento-form";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lista } = await supabase
    .from("lists")
    .select("local, data_hora, mostrar_mapa")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  return <EventoForm listaId={id} inicial={lista ?? { local: null, data_hora: null, mostrar_mapa: true }} />;
}
