import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./url";

/**
 * Cliente Supabase com a Service Role Key -- ignora RLS, usa o papel
 * service_role no Postgres. Só para operações server-side que
 * deliberadamente não podem passar pela sessão do usuário logado (spec
 * §7.4) -- hoje, só a leitura de credenciais em admin_config/Vault via
 * credenciais_shopee(). NUNCA importar este arquivo num componente client.
 * shopee_configurado() (não devolve segredo) continua usando o cliente de
 * sessão normal (@/lib/supabase/server), não este.
 */
export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
