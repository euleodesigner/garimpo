"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugValido } from "@/lib/slug";

type State = { erro?: string } | undefined;

export async function criarLista(_prevState: State, formData: FormData): Promise<State> {
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tipo_evento = String(formData.get("tipo_evento") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();

  if (!nome) return { erro: "Dê um nome à lista." };

  const validacao = slugValido(slug);
  if (!validacao.ok) return { erro: validacao.erro };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("lists")
    .insert({ owner_id: user.id, nome, descricao, tipo_evento, slug })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { erro: "Esse endereço já está em uso, escolha outro." };
    }
    return { erro: "Não foi possível criar a lista. Tente de novo." };
  }

  redirect(`/listas/${data.id}/presentes`);
}
