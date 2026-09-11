"use client";

import { useState } from "react";
import { AddPresenteModal } from "./add-presente-modal";
import { excluirPresente } from "./actions";
import { ButtonPrimary, Card, Chip } from "@/components/ui";

type Produto = { id: string; nome: string; preco: number | null; imagem_url: string | null };

export function PresentesClient({
  listaId,
  produtos,
  reservados,
}: {
  listaId: string;
  produtos: Produto[];
  reservados: string[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const reservadoSet = new Set(reservados);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ButtonPrimary onClick={() => setModalAberto(true)}>+ Adicionar presente</ButtonPrimary>
      </div>

      {!produtos.length ? (
        <Card className="text-center text-sub">Nenhum presente cadastrado ainda.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {produtos.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3.5 rounded-2xl border border-line bg-card p-3.5"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg text-2xl">
                {p.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "🎁"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink">{p.nome}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {p.preco != null && (
                    <span className="font-bold text-ink">
                      R$ {p.preco.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                  {reservadoSet.has(p.id) && <Chip tone="gold">🔒 reservado</Chip>}
                </div>
              </div>
              <form action={excluirPresente.bind(null, listaId, p.id)}>
                <button className="cursor-pointer rounded-lg border border-line px-3 py-2 text-xs font-semibold text-danger">
                  Excluir
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-sub">
        Depois de criado, o card não pode ser editado — para trocar algo, exclua e cadastre de novo.
      </p>

      {modalAberto && <AddPresenteModal listaId={listaId} onClose={() => setModalAberto(false)} />}
    </div>
  );
}
