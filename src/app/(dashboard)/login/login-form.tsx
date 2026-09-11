"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "../auth-actions";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const params = useSearchParams();
  const cadastrado = params.get("cadastrado") === "1";

  return (
    <div className="rounded-2xl border border-line bg-card p-7">
      <h1 className="text-2xl font-extrabold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-sub">Faça login para acessar sua conta.</p>

      {cadastrado && (
        <p className="mt-4 rounded-lg bg-jade/10 px-3 py-2 text-sm font-semibold text-jade">
          Conta criada! Confirme seu e-mail (se necessário) e entre abaixo.
        </p>
      )}

      <form action={formAction}>
        <Label>E-mail</Label>
        <Input type="email" name="email" placeholder="voce@email.com" required />
        <Label>Senha</Label>
        <Input type="password" name="senha" placeholder="••••••••" required />
        <FieldError>{state?.erro}</FieldError>
        <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
          {pending ? "Entrando…" : "Entrar"}
        </ButtonPrimary>
      </form>

      <p className="mt-4 text-center text-sm text-sub">
        Não tem uma conta?{" "}
        <Link href="/cadastro" className="font-semibold text-clay underline">
          Cadastre-se
        </Link>
      </p>
      <p className="mt-1 text-center text-sm">
        <Link href="/esqueci-senha" className="font-semibold text-clay underline">
          Esqueci minha senha
        </Link>
      </p>
    </div>
  );
}
