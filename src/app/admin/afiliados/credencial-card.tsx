"use client";

import { useActionState, useState } from "react";
import { salvarCredencialLoja } from "./actions";
import { Card, Input, Label, ButtonPrimary, FieldError } from "@/components/ui";
import type { LojaConfig } from "@/lib/afiliados/lojas";

type Status = {
  identificador: string | null;
  identificador2: string | null;
  configurado: boolean;
  habilitado: boolean;
  ultimoTesteOk: boolean | null;
  ultimoTesteErro: string | null;
};

function StatusDot({ ok, erro }: { ok: boolean | null; erro: string | null }) {
  const [hover, setHover] = useState(false);
  const cor = ok === true ? "bg-jade" : ok === false ? "bg-danger" : "bg-line";
  const texto = ok === true ? "Funcionando" : ok === false ? erro || "Não está funcionando" : "Ainda não testado";

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`inline-block h-3 w-3 cursor-help rounded-full ${cor}`}
      />
      {hover && (
        <div className="absolute right-0 top-5 z-10 w-56 rounded-lg border border-line bg-card p-2.5 text-xs text-ink shadow-lg">
          {texto}
        </div>
      )}
    </div>
  );
}

export function CredencialCard({ loja, status }: { loja: LojaConfig; status: Status | null }) {
  const acao = salvarCredencialLoja.bind(null, loja.id);
  const [state, formAction, pending] = useActionState(acao, undefined);

  const habilitadoAtual = status?.habilitado ?? false;
  const configurado = status?.configurado || Boolean(status?.identificador);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">{loja.nome}</h2>
        <StatusDot ok={status?.ultimoTesteOk ?? null} erro={status?.ultimoTesteErro ?? null} />
      </div>
      <p className="mt-1 text-sm text-sub">{loja.descricao}</p>

      {loja.arriscado && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          ⚠️ {loja.avisoArriscado}
        </p>
      )}

      <form action={formAction}>
        <Label>{loja.labelIdentificador}</Label>
        <Input name="identificador" defaultValue={status?.identificador ?? ""} />

        {loja.labelIdentificador2 && (
          <>
            <Label>{loja.labelIdentificador2}</Label>
            <Input name="identificador2" defaultValue={status?.identificador2 ?? ""} />
          </>
        )}

        {loja.temSecret && (
          <>
            <Label>{loja.labelSecret}</Label>
            <Input
              name="secret"
              type="password"
              placeholder={configurado ? "Deixe em branco para manter o atual" : loja.labelSecret}
            />
          </>
        )}

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input type="checkbox" name="habilitado" defaultChecked={habilitadoAtual} />
          Conversão automática ativada
        </label>

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
              Remover
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
