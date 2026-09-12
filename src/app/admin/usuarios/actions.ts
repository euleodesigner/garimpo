"use server";

import { revalidatePath } from "next/cache";
import { exigirOwner } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function alternarStatusUsuario(userId: string, novoStatus: "ativo" | "inativo") {
  await exigirOwner();
  const admin = createAdminClient();
  await admin.from("profiles").update({ status: novoStatus }).eq("id", userId);
  revalidatePath("/admin/usuarios");
}

export async function excluirUsuario(userId: string) {
  await exigirOwner();
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ excluido_em: new Date().toISOString(), status: "inativo" })
    .eq("id", userId);
  revalidatePath("/admin/usuarios");
}

export async function enviarRedefinicaoSenha(email: string) {
  await exigirOwner();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  });
}
