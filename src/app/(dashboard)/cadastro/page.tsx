"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar } from "../auth-actions";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(cadastrar, undefined);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">⛏️</div>
          <div className="mt-1 text-xl font-extrabold tracking-wide text-ink">LISTA GARIMPO</div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-7">
          <h1 className="text-2xl font-extrabold text-ink">Criar conta</h1>
          <p className="mt-1 text-sm text-sub">Comece a montar suas listas de presentes.</p>

          <form action={formAction}>
            <Label>Nome</Label>
            <Input name="nome" placeholder="Seu nome" required />
            <Label>E-mail</Label>
            <Input type="email" name="email" placeholder="voce@email.com" required />
            <Label>Senha</Label>
            <Input type="password" name="senha" placeholder="Crie uma senha" required minLength={6} />
            <FieldError>{state?.erro}</FieldError>
            <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
              {pending ? "Criando…" : "Criar conta"}
            </ButtonPrimary>
          </form>

          <p className="mt-4 text-center text-sm text-sub">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-clay underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
