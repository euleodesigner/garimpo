"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ownerClient(listaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  void listaId;
  return { supabase, user };
}

type State = { erro?: string } | undefined;

export async function atualizarEvento(listaId: string, _prev: State, formData: FormData): Promise<State> {
  const { supabase, user } = await ownerClient(listaId);
  const local = String(formData.get("local") ?? "").trim() || null;
  const data_hora = String(formData.get("data_hora") ?? "").trim() || null;
  const mostrar_mapa = formData.get("mostrar_mapa") === "on";

  const { error } = await supabase
    .from("lists")
    .update({ local, data_hora, mostrar_mapa })
    .eq("id", listaId)
    .eq("owner_id", user.id);

  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/listas/${listaId}/evento`);
}

export async function atualizarAparencia(
  listaId: string,
  _prev: State,
  formData: FormData,
): Promise<State> {
  const { supabase, user } = await ownerClient(listaId);
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const cor_principal = String(formData.get("cor_principal") ?? "") || null;
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const tiktok = String(formData.get("tiktok") ?? "").trim() || null;
  const banner = formData.get("banner") as File | null;
  const foto = formData.get("foto") as File | null;

  if (!nome) return { erro: "O nome não pode ficar vazio." };

  const patch: Record<string, unknown> = { nome, descricao, cor_principal, instagram, tiktok };

  for (const [campo, arquivo, coluna] of [
    ["banner", banner, "banner_url"],
    ["foto", foto, "foto_perfil_url"],
  ] as const) {
    if (arquivo && arquivo.size > 0) {
      const ext = arquivo.name.split(".").pop() || "jpg";
      const path = `lists/${listaId}/${campo === "banner" ? "banner" : "perfil"}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("public-media")
        .upload(path, arquivo, { upsert: true });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("public-media").getPublicUrl(path);
        patch[coluna] = pub.publicUrl;
      }
    }
  }

  const { error } = await supabase
    .from("lists")
    .update(patch)
    .eq("id", listaId)
    .eq("owner_id", user.id);

  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/listas/${listaId}`, "layout");
}

export async function atualizarConfiguracoes(
  listaId: string,
  _prev: State,
  formData: FormData,
): Promise<State> {
  const { supabase, user } = await ownerClient(listaId);
  const feat_recados = formData.get("feat_recados") === "on";
  const feat_rsvp = formData.get("feat_rsvp") === "on";
  const feat_notif_email = formData.get("feat_notif_email") === "on";
  const slug = String(formData.get("slug") ?? "").trim();

  const patch: Record<string, unknown> = { feat_recados, feat_rsvp, feat_notif_email };
  if (slug) patch.slug = slug;

  const { error } = await supabase
    .from("lists")
    .update(patch)
    .eq("id", listaId)
    .eq("owner_id", user.id);

  if (error) {
    if (error.message.includes("Slug não pode ser alterado")) {
      return { erro: "O endereço não pode mais ser alterado (a lista já saiu do rascunho)." };
    }
    if ((error as { code?: string }).code === "23505") return { erro: "Esse endereço já está em uso." };
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath(`/listas/${listaId}/config`);
}

export async function ativarLista(listaId: string) {
  const { supabase, user } = await ownerClient(listaId);
  await supabase.from("lists").update({ status: "ativa" }).eq("id", listaId).eq("owner_id", user.id);
  revalidatePath(`/listas/${listaId}`, "layout");
}

export async function encerrarEvento(listaId: string) {
  const { supabase, user } = await ownerClient(listaId);
  await supabase
    .from("lists")
    .update({ status: "arquivada" })
    .eq("id", listaId)
    .eq("owner_id", user.id);
  revalidatePath(`/listas/${listaId}`, "layout");
}
