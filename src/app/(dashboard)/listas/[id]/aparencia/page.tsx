import { createClient } from "@/lib/supabase/server";
import { AparenciaForm } from "./aparencia-form";

export default async function AparenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lista } = await supabase
    .from("lists")
    .select("nome, descricao, cor_principal, instagram, tiktok")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  return (
    <AparenciaForm
      listaId={id}
      inicial={
        lista ?? {
          nome: "",
          descricao: null,
          cor_principal: null,
          instagram: null,
          tiktok: null,
        }
      }
    />
  );
}
