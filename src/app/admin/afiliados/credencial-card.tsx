"use client";

import { useActionState } from "react";
import { salvarCredencial } from "./actions";
import { Card, Input, Label, ButtonPrimary, ButtonGhost, FieldError } from "@/components/ui";

type Provedor = "shopee" | "awin" | "admitad";

export function CredencialCard({
  provedor,
  titulo,
  descricao,
  idLabel,
  secretLabel,
  idAtual,
  configurado,
}: {
  provedor: Provedor;
  titulo: string;
  descricao: string;
  idLabel: string;
  secretLabel: string;
  idAtual: string | null;
  configurado: boolean;
}) {
  const acao = salvarCredencial.bind(null, provedor);
  const [state, formAction, pending] = useActionState(acao, undefined);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-ink">{titulo}</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            configurado ? "bg-jade/10 text-jade" : "bg-card text-sub"
          }`}
        >
          {configurado ? "Configurado" : "Não configurado"}
        </span>
      </div>
      <p className="mt-1 text-sm text-sub">{descricao}</p>

      <form action={formAction}>
        <Label>{idLabel}</Label>
        <Input name="id" defaultValue={idAtual ?? ""} placeholder={idLabel} />

        <Label>{secretLabel}</Label>
        <Input
          name="secret"
          type="password"
          placeholder={configurado ? "Deixe em branco para manter o atual" : secretLabel}
        />

        <FieldError>{state?.erro}</FieldError>
        {state?.ok && <p className="mt-2 text-sm font-semibold text-jade">Salvo!</p>}

        <div className="mt-5 flex items-center justify-between">
          {configurado ? (
            <button
              type="submit"
              name="limpar"
              value="on"
              disabled={pending}
              className="cursor-pointer text-sm font-semibold text-danger hover:opacity-80 disabled:opacity-50"
            >
              Remover credencial
            </button>
          ) : (
            <span />
          )}
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </ButtonPrimary>
        </div>
      </form>
    </Card>
  );
}
