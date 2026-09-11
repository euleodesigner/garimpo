"use client";

import { useActionState } from "react";
import { atualizarConfiguracoes, ativarLista, encerrarEvento } from "../actions";
import { Card, Input, Label, ButtonPrimary, ButtonOutline } from "@/components/ui";

type Inicial = {
  slug: string;
  status: string;
  feat_recados: boolean;
  feat_rsvp: boolean;
  feat_notif_email: boolean;
};

export function ConfigForm({ listaId, inicial }: { listaId: string; inicial: Inicial }) {
  const acao = atualizarConfiguracoes.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);
  const slugTravado = inicial.status !== "rascunho";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="text-xl font-extrabold text-ink">Configure sua lista</h2>
        <p className="mt-1 text-sm text-sub">Endereço público e seções opcionais da lista.</p>

        <form action={formAction}>
          <Label>Endereço público</Label>
          <div className="flex items-center gap-2">
            <Input name="slug" defaultValue={inicial.slug} disabled={slugTravado} />
            <span className="whitespace-nowrap text-sm text-sub">.listagarimpo.com.br</span>
          </div>
          {slugTravado && (
            <p className="mt-1.5 text-xs text-sub">
              O endereço não pode mais ser alterado depois que a lista sai do rascunho.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
              <input type="checkbox" name="feat_recados" defaultChecked={inicial.feat_recados} />
              Recadinhos
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
              <input type="checkbox" name="feat_rsvp" defaultChecked={inicial.feat_rsvp} />
              Confirmação de presença (RSVP)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
              <input type="checkbox" name="feat_notif_email" defaultChecked={inicial.feat_notif_email} />
              Notificação por e-mail a cada reserva
            </label>
          </div>

          {state?.erro && <p className="mt-2 text-sm font-medium text-danger">{state.erro}</p>}

          <div className="mt-5 text-right">
            <ButtonPrimary type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </ButtonPrimary>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold text-ink">Status da lista</h2>
        <p className="mt-1 text-sm text-sub">
          Essas ações não podem ser desfeitas — a lista nunca volta a um estágio anterior.
        </p>
        <div className="mt-4 flex gap-3">
          {inicial.status === "rascunho" && (
            <form action={ativarLista.bind(null, listaId)}>
              <ButtonPrimary type="submit">Ativar lista</ButtonPrimary>
            </form>
          )}
          {inicial.status === "ativa" && (
            <form action={encerrarEvento.bind(null, listaId)}>
              <ButtonOutline type="submit">Encerrar evento</ButtonOutline>
            </form>
          )}
          {inicial.status === "arquivada" && (
            <span className="text-sm text-sub">Esta lista está encerrada.</span>
          )}
        </div>
      </Card>
    </div>
  );
}
