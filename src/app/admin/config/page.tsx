import { createAdminClient } from "@/lib/supabase/admin";
import { ConfigAdminForm } from "./config-form";

export default async function AdminConfigPage() {
  const admin = createAdminClient();
  const { data: config } = await admin
    .from("admin_config")
    .select(
      "whatsapp_numero, banner_ativo, banner_titulo, banner_texto, banner_link, banner_cta, banner_imagem_url",
    )
    .maybeSingle();

  return (
    <ConfigAdminForm
      inicial={{
        whatsapp_numero: config?.whatsapp_numero ?? "",
        banner_ativo: config?.banner_ativo ?? false,
        banner_titulo: config?.banner_titulo ?? "",
        banner_texto: config?.banner_texto ?? "",
        banner_link: config?.banner_link ?? "",
        banner_cta: config?.banner_cta ?? "",
        banner_imagem_url: config?.banner_imagem_url ?? "",
      }}
    />
  );
}
