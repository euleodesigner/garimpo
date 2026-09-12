"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthState = { erro?: string } | undefined;

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    console.error("[login] falha ao autenticar via Supabase:", error.message);
    return { erro: "E-mail ou senha inválidos." };
  }

  // status/excluido_em existem desde a Fase 1 mas nunca eram checados aqui --
  // o admin podia "desativar"/"excluir" um creator pelo painel e a conta
  // continuava logando normalmente.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("status, excluido_em")
    .eq("id", data.user.id)
    .maybeSingle();

  if (perfil && (perfil.status === "inativo" || perfil.excluido_em)) {
    await supabase.auth.signOut();
    return { erro: "Sua conta está desativada. Entre em contato com o suporte." };
  }

  redirect("/listas");
}

export async function cadastrar(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !email || !senha) {
    return { erro: "Preencha todos os campos." };
  }
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    return { erro: error.message };
  }

  redirect("/login?cadastrado=1");
}

type RecuperarState = { erro?: string; enviado?: boolean } | undefined;

export async function recuperarSenha(
  _prevState: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erro: "Informe seu e-mail." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  });

  // sempre "enviado", nunca revela se o e-mail existe (evita enumeração de contas)
  return { enviado: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
