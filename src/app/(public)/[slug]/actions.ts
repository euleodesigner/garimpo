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

export async function enviarRecado(
  slug: string,
  listaId: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!nome || !texto) return { erro: "Preencha seu nome e o recadinho." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ list_id: listaId, nome, texto });
  if (error) return { erro: "Não foi possível enviar. Tente de novo." };

  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function confirmarPresenca(
  slug: string,
  listaId: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const presente = formData.get("presente") !== "nao";
  const acompanhantesStr = String(formData.get("acompanhantes") ?? "0");
  const acompanhantes = Math.max(0, Number(acompanhantesStr) || 0);

  if (!nome) return { erro: "Informe seu nome." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("rsvps")
    .insert({ list_id: listaId, nome, presente, acompanhantes });
  if (error) return { erro: "Não foi possível confirmar. Tente de novo." };

  revalidatePath(`/${slug}`);
  return { ok: true };
}
