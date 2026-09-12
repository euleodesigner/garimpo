"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ReservarState = { erro?: string; ok?: boolean } | undefined;

export async function reservar(
  slug: string,
  productId: string,
  _prev: ReservarState,
  formData: FormData,
): Promise<ReservarState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome || !telefone) {
    return { erro: "Preencha seu nome e telefone." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reserve_product", {
    p_product_id: productId,
    p_guest_nome: nome,
    p_guest_telefone: telefone,
  });

  if (error) {
    return { erro: error.message || "Não foi possível reservar este item." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

type SimpleState = { erro?: string; ok?: boolean } | undefined;

// `listaId` chega como argumento vinculado (bind) de uma Server Action --
// nada impede um cliente malicioso de forjar o POST com um listaId
// diferente do que corresponde ao `slug`, inserindo recado/RSVP numa lista
// alheia ou contornando a flag feat_recados/feat_rsvp (achado da revisão de
// segurança). Por isso ignoramos o parâmetro pra gravação e resolvemos o
// list_id de verdade a partir do slug, checando a flag antes de inserir.
// O parâmetro continua na assinatura só por compatibilidade com o
// client component (bind já espera essa posição).

export async function enviarRecado(
  slug: string,
  _listaIdNaoConfiavel: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!nome || !texto) return { erro: "Preencha seu nome e o recadinho." };

  const supabase = await createClient();
  const { data: lista } = await supabase
    .from("lists")
    .select("id, feat_recados")
    .eq("slug", slug)
    .maybeSingle();
  if (!lista || !lista.feat_recados) return { erro: "Não foi possível enviar. Tente de novo." };

  const { error } = await supabase.from("messages").insert({ list_id: lista.id, nome, texto });
  if (error) return { erro: "Não foi possível enviar. Tente de novo." };

  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function confirmarPresenca(
  slug: string,
  _listaIdNaoConfiavel: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const presente = formData.get("presente") !== "nao";
  const acompanhantesStr = String(formData.get("acompanhantes") ?? "0");
  const acompanhantes = Math.max(0, Number(acompanhantesStr) || 0);

  if (!nome) return { erro: "Informe seu nome." };

  const supabase = await createClient();
  const { data: lista } = await supabase
    .from("lists")
    .select("id, feat_rsvp")
    .eq("slug", slug)
    .maybeSingle();
  if (!lista || !lista.feat_rsvp) return { erro: "Não foi possível confirmar. Tente de novo." };

  const { error } = await supabase
    .from("rsvps")
    .insert({ list_id: lista.id, nome, presente, acompanhantes });
  if (error) return { erro: "Não foi possível confirmar. Tente de novo." };

  revalidatePath(`/${slug}`);
  return { ok: true };
}
