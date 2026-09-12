"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EXTENSOES_IMAGEM_PERMITIDAS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function extensaoSegura(nomeArquivo: string): string {
  const bruta = (nomeArquivo.split(".").pop() ?? "").toLowerCase();
  return EXTENSOES_IMAGEM_PERMITIDAS.has(bruta) ? bruta : "jpg";
}

// Verifica de verdade que a lista pertence a quem está chamando -- antes
// disso a função só checava login, não posse (achado real da revisão de
// segurança automática deste commit).
async function ownerClient(listaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lista } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  return { supabase, user, autorizado: Boolean(lista) };
}

type State = { erro?: string } | undefined;

export async function atualizarEvento(listaId: string, _prev: State, formData: FormData): Promise<State> {
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return { erro: "Lista não encontrada." };

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
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return { erro: "Lista não encontrada." };

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
    if (arquivo && arquivo.size > 0 && arquivo.type.startsWith("image/")) {
      const ext = extensaoSegura(arquivo.name);
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
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return { erro: "Lista não encontrada." };

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
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return;
  await supabase.from("lists").update({ status: "ativa" }).eq("id", listaId).eq("owner_id", user.id);
  revalidatePath(`/listas/${listaId}`, "layout");
}

export async function encerrarEvento(listaId: string) {
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return;
  await supabase
    .from("lists")
    .update({ status: "arquivada" })
    .eq("id", listaId)
    .eq("owner_id", user.id);
  revalidatePath(`/listas/${listaId}`, "layout");
}

// Exclusão de verdade (não é o "arquivar"/"encerrar evento", que só muda o
// status e mantém tudo). Cascade no banco apaga presentes, reservas,
// recadinhos e RSVPs da lista junto -- irreversível.
export async function excluirLista(listaId: string) {
  const { supabase, user, autorizado } = await ownerClient(listaId);
  if (!autorizado) return;
  await supabase.from("lists").delete().eq("id", listaId).eq("owner_id", user.id);
  redirect("/listas");
}
