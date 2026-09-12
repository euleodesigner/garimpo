import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./config-form";

export default async function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lista } = await supabase
    .from("lists")
    .select("nome, slug, status, feat_recados, feat_rsvp, feat_notif_email")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!lista) return null;

  return <ConfigForm listaId={id} inicial={lista} />;
}
