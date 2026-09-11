"use client";

import { useActionState } from "react";
import { atualizarEvento } from "../actions";
import { Card, Input, Label, ButtonPrimary } from "@/components/ui";

type Inicial = { local: string | null; data_hora: string | null; mostrar_mapa: boolean };

export function EventoForm({ listaId, inicial }: { listaId: string; inicial: Inicial }) {
  const acao = atualizarEvento.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-ink">Compartilhe os detalhes do seu evento</h2>
      <p className="mt-1 text-sm text-sub">Informe data, hora e local da celebração.</p>

      <form action={formAction}>
        <Label>Localização</Label>
        <Input name="local" defaultValue={inicial.local ?? ""} placeholder="Ex.: Rua dos Bobos, 0" />

        <Label>Data e hora</Label>
        <Input
          type="datetime-local"
          name="data_hora"
          defaultValue={inicial.data_hora ? inicial.data_hora.slice(0, 16) : ""}
        />

        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            name="mostrar_mapa"
            defaultChecked={inicial.mostrar_mapa}
            className="mt-0.5"
          />
          <span>
            <b className="text-sm text-ink">Link do Google Maps</b>
            <br />
            <span className="text-xs text-sub">
              Ao clicar no local, o convidado abre o endereço no Google Maps.
            </span>
          </span>
        </label>

        {state?.erro && <p className="mt-2 text-sm font-medium text-danger">{state.erro}</p>}

        <div className="mt-5 text-right">
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </ButtonPrimary>
        </div>
      </form>
    </Card>
  );
}
