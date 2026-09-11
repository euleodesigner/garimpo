"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { erro?: string } | undefined;

export async function redefinirSenha(_prevState: State, formData: FormData): Promise<State> {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    return { erro: "Não foi possível redefinir sua senha. O link pode ter expirado — solicite um novo." };
  }

  redirect("/listas");
}
