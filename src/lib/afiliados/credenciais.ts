import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketplaceSlug } from "@/lib/marketplace";
import type { CredencialLoja } from "@/lib/afiliacao";

/**
 * Loader de credencial usado tanto na busca automática (onBlur) quanto no
 * salvar de verdade -- extraído pra um lugar só pra não duplicar a checagem
 * de SUPABASE_SERVICE_ROLE_KEY (pode faltar em ambientes novos/preview/CI;
 * tratamos como "sem credencial configurada", não como erro fatal) nem a
 * chamada da RPC security definer `admin_ler_credencial_loja`.
 */
export async function carregarCredencialLoja(loja: MarketplaceSlug): Promise<CredencialLoja | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const adminSupabase = createAdminClient();
  const { data: credRow, error } = await adminSupabase
    .rpc("admin_ler_credencial_loja", { p_loja: loja })
    .maybeSingle<CredencialLoja>();

  if (error) {
    console.error(`Falha ao ler credencial de ${loja}:`, error.message);
    return null;
  }
  return credRow ?? null;
}
