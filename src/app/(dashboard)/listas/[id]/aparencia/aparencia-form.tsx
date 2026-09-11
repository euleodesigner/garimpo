"use client";

import { useActionState, useState } from "react";
import { atualizarAparencia } from "../actions";
import { Card, Input, Textarea, Label, ButtonPrimary } from "@/components/ui";

type Inicial = {
  nome: string;
  descricao: string | null;
  cor_principal: string | null;
  instagram: string | null;
  tiktok: string | null;
};

const CORES = ["#B4552D", "#1F6F5C", "#C08A2D", "#7A4EAB", "#2D6AA8", "#241E17"];

export function AparenciaForm({ listaId, inicial }: { listaId: string; inicial: Inicial }) {
  const acao = atualizarAparencia.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);
  const [cor, setCor] = useState(inicial.cor_principal ?? CORES[0]);

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-ink">Personalize sua lista</h2>
      <p className="mt-1 text-sm text-sub">
        Nome, descrição, cor, banner, foto de perfil e redes sociais.
      </p>

      <form action={formAction}>
        <input type="hidden" name="cor_principal" value={cor} />

        <Label>Nome</Label>
        <Input name="nome" defaultValue={inicial.nome} required />

        <Label>Descrição</Label>
        <Textarea name="descricao" defaultValue={inicial.descricao ?? ""} className="min-h-24" />

        <Label>Cor principal</Label>
        <div className="flex gap-2.5">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              style={{ background: c }}
              className={`h-9 w-9 cursor-pointer rounded-lg ${cor === c ? "ring-2 ring-ink ring-offset-2" : "border-2 border-line"}`}
            />
          ))}
        </div>

        <Label>Banner</Label>
        <input
          type="file"
          name="banner"
          accept="image/*"
          className="block w-full text-sm text-sub file:mr-3 file:rounded-lg file:border-0 file:bg-bg file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
        />

        <Label>Foto de perfil</Label>
        <input
          type="file"
          name="foto"
          accept="image/*"
          className="block w-full text-sm text-sub file:mr-3 file:rounded-lg file:border-0 file:bg-bg file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
        />

        <Label>Redes sociais</Label>
        <Input name="instagram" defaultValue={inicial.instagram ?? ""} placeholder="@ do Instagram ou URL" />
        <Input
          name="tiktok"
          defaultValue={inicial.tiktok ?? ""}
          placeholder="@ do TikTok ou URL"
          className="mt-2"
        />

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
