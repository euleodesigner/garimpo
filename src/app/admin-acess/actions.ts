"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// O admin loga com usuário+senha, não e-mail (acesso único, secreto, sem
// cadastro). O Supabase Auth só autentica por e-mail, então o "usuário" é
// mapeado pra um e-mail sintético fixo -- nunca aparece na UI nem em lugar
// nenhum visível pro dono da conta.
const DOMINIO_EMAIL_ADMIN = "admin.listagarimpo.internal";

type State = { erro?: string } | undefined;

export async function loginAdmin(_prevState: State, formData: FormData): Promise<State> {
  const usuario = String(formData.get("usuario") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!usuario || !senha) return { erro: "Preencha usuário e senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${usuario}@${DOMINIO_EMAIL_ADMIN}`,
    password: senha,
  });

  if (error) {
    return { erro: "Usuário ou senha inválidos." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, status, excluido_em")
    .eq("id", data.user.id)
    .maybeSingle();

  // Mesma mensagem genérica de credencial errada -- nunca revela se a
  // conta existe, se está inativa, ou se só não é owner.
  if (!perfil || perfil.role !== "owner" || perfil.status === "inativo" || perfil.excluido_em) {
    await supabase.auth.signOut();
    return { erro: "Usuário ou senha inválidos." };
  }

  redirect("/admin");
}
