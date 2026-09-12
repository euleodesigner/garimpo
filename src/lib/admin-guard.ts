import { createClient } from "@/lib/supabase/server";

/**
 * Confere que quem está chamando a Server Action é mesmo o owner logado --
 * usado antes de qualquer escrita privilegiada no painel admin. As escritas
 * em si usam o client de service role (bypassa RLS de propósito), então essa
 * checagem na aplicação é a única linha de defesa contra um creator chamar
 * a action diretamente.
 */
export async function exigirOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, status, excluido_em")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || perfil.role !== "owner" || perfil.status === "inativo" || perfil.excluido_em) {
    throw new Error("Acesso negado.");
  }

  return user;
}
