"use server";

import { revalidatePath } from "next/cache";
import { exigirOwner } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

type State = { erro?: string; ok?: boolean } | undefined;

const RPC_POR_PROVEDOR = {
  shopee: "admin_salvar_credencial_shopee",
  awin: "admin_salvar_credencial_awin",
  admitad: "admin_salvar_credencial_admitad",
} as const;

type Provedor = keyof typeof RPC_POR_PROVEDOR;

export async function salvarCredencial(
  provedor: Provedor,
  _prev: State,
  formData: FormData,
): Promise<State> {
  await exigirOwner();

  const id = String(formData.get("id") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const limpar = formData.get("limpar") === "on";

  if (!limpar && !id) {
    return { erro: "Preencha o identificador (App ID / Publisher ID / Client ID)." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc(RPC_POR_PROVEDOR[provedor], {
    p_id: id,
    p_secret: secret || null,
    p_limpar: limpar,
  });

  if (error) {
    // A função só existe depois que o script SQL combinado for rodado no
    // Supabase -- mensagens de "function ... does not exist" (Postgres) ou
    // "Could not find function" (PostgREST) indicam isso.
    const naoExiste = /does not exist|could not find function/i.test(error.message);
    return {
      erro: naoExiste
        ? "As funções de credencial ainda não existem no banco. Rode o script SQL indicado antes de salvar."
        : "Não foi possível salvar.",
    };
  }

  revalidatePath("/admin/afiliados");
  return { ok: true };
}
