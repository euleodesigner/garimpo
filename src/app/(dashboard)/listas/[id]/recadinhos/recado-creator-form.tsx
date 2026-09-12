"use client";

import { useActionState } from "react";
import { enviarRecadoCreator } from "../actions";
import { Card, Input, Textarea, Label, ButtonPrimary, FieldError } from "@/components/ui";

export function RecadoCreatorForm({ listaId, nomePadrao }: { listaId: string; nomePadrao: string }) {
  const acao = enviarRecadoCreator.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  return (
    <Card>
      <h2 className="text-lg font-extrabold text-ink">Deixar um recado</h2>
      <p className="mt-1 text-sm text-sub">Aparece junto com os recados dos convidados na lista pública.</p>
      <form action={formAction}>
        <Label>Seu nome</Label>
        <Input name="nome" defaultValue={nomePadrao} required />
        <Label>Recado</Label>
        <Textarea name="texto" className="min-h-20" required />
        <FieldError>{state?.erro}</FieldError>
        <div className="mt-4 text-right">
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar"}
          </ButtonPrimary>
        </div>
      </form>
    </Card>
  );
}
