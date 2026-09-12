"use client";

import { useActionState } from "react";
import { loginAdmin } from "./actions";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, undefined);

  return (
    <div className="rounded-2xl border border-line bg-card p-7">
      <h1 className="text-2xl font-extrabold text-ink">Acesso restrito</h1>
      <p className="mt-1 text-sm text-sub">Área administrativa.</p>

      <form action={formAction}>
        <Label>Usuário</Label>
        <Input name="usuario" autoComplete="username" required />
        <Label>Senha</Label>
        <Input type="password" name="senha" autoComplete="current-password" required />
        <FieldError>{state?.erro}</FieldError>
        <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
          {pending ? "Entrando…" : "Entrar"}
        </ButtonPrimary>
      </form>
    </div>
  );
}
