"use client";

import { useTransition } from "react";
import { excluirLista } from "../actions";
import { ButtonGhost } from "@/components/ui";

export function ExcluirListaButton({ listaId, nomeLista }: { listaId: string; nomeLista: string }) {
  const [pending, startTransition] = useTransition();

  function excluir() {
    if (
      !confirm(
        `Excluir "${nomeLista}" de vez? Isso apaga também os presentes, recadinhos e reservas dessa lista. Não tem como desfazer.`,
      )
    ) {
      return;
    }
    startTransition(() => {
      excluirLista(listaId);
    });
  }

  return (
    <ButtonGhost type="button" disabled={pending} onClick={excluir} className="text-danger">
      {pending ? "Excluindo…" : "Excluir lista"}
    </ButtonGhost>
  );
}
