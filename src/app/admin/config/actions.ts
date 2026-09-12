"use server";

import { revalidatePath } from "next/cache";
import { exigirOwner } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

type State = { erro?: string; ok?: boolean } | undefined;

const EXTENSOES_IMAGEM_PERMITIDAS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function extensaoSegura(nomeArquivo: string): string {
  const bruta = (nomeArquivo.split(".").pop() ?? "").toLowerCase();
  return EXTENSOES_IMAGEM_PERMITIDAS.has(bruta) ? bruta : "jpg";
}

export async function salvarConfigAdmin(_prev: State, formData: FormData): Promise<State> {
  await exigirOwner();

  const whatsapp_numero = String(formData.get("whatsapp_numero") ?? "").trim();
  const banner_ativo = formData.get("banner_ativo") === "on";
  const banner_titulo = String(formData.get("banner_titulo") ?? "").trim() || null;
  const banner_texto = String(formData.get("banner_texto") ?? "").trim() || null;
  const banner_link = String(formData.get("banner_link") ?? "").trim() || null;
  const banner_cta = String(formData.get("banner_cta") ?? "").trim() || null;
  const banner = formData.get("banner_imagem") as File | null;

  if (whatsapp_numero && !/^\d{10,15}$/.test(whatsapp_numero)) {
    return { erro: "WhatsApp deve estar no formato E.164 só com números (ex.: 5512999999999)." };
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    whatsapp_numero: whatsapp_numero || null,
    banner_ativo,
    banner_titulo,
    banner_texto,
    banner_link,
    banner_cta,
  };

  if (banner && banner.size > 0 && banner.type.startsWith("image/")) {
    const ext = extensaoSegura(banner.name);
    const path = `admin/banner.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("public-media")
      .upload(path, banner, { upsert: true });
    if (!uploadError) {
      const { data: pub } = admin.storage.from("public-media").getPublicUrl(path);
      patch.banner_imagem_url = pub.publicUrl;
    }
  }

  const { error } = await admin.from("admin_config").update(patch).eq("id", true);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/admin/config");
  return { ok: true };
}
