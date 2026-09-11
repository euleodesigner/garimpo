"use client";

import { useActionState, useEffect } from "react";
import { adicionarPresente } from "./actions";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export function AddPresenteModal({ listaId, onClose }: { listaId: string; onClose: () => void }) {
  const acao = adicionarPresente.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6"
      >
        <h2 className="text-xl font-extrabold text-ink">Adicionar presente</h2>
        <p className="mt-1 text-sm text-sub">
          Cole o link do produto de qualquer loja e preencha os detalhes abaixo.
        </p>

        <form action={formAction}>
          <Label>Link do produto</Label>
          <Input
            name="link"
            placeholder="Cole aqui o link da loja (Shopee, Magalu, SHEIN…)"
            required
          />

          <Label>Nome do produto</Label>
          <Input name="nome" placeholder="Ex.: Camiseta Polo Infantil" required />

          <Label>Preço (R$)</Label>
          <Input name="preco" placeholder="Ex.: 59,90" />

          <Label>Imagem</Label>
          <input
            type="file"
            name="imagem"
            accept="image/*"
            className="block w-full text-sm text-sub file:mr-3 file:rounded-lg file:border-0 file:bg-bg file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
          />

          <FieldError>{state?.erro}</FieldError>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-3.5 py-2.5 text-sm font-semibold text-sub"
            >
              Cancelar
            </button>
            <ButtonPrimary type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar presente"}
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </div>
  );
}
