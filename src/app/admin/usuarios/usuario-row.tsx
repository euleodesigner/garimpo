"use client";

import { useState, useTransition } from "react";
import { alternarStatusUsuario, excluirUsuario, enviarRedefinicaoSenha } from "./actions";
import { Chip, ButtonOutline, ButtonGhost } from "@/components/ui";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  criadoEm: string;
};

export function UsuarioRow({ usuario }: { usuario: Usuario }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [excluido, setExcluido] = useState(false);

  const dataCriacao = new Date(usuario.criadoEm).toLocaleDateString("pt-BR");

  function alternarStatus() {
    const novo = usuario.status === "ativo" ? "inativo" : "ativo";
    startTransition(async () => {
      await alternarStatusUsuario(usuario.id, novo);
    });
  }

  function excluir() {
    if (!confirm(`Excluir ${usuario.nome}? Essa ação não pode ser desfeita pela interface.`)) return;
    startTransition(async () => {
      await excluirUsuario(usuario.id);
      setExcluido(true);
    });
  }

  function redefinirSenha() {
    startTransition(async () => {
      await enviarRedefinicaoSenha(usuario.email);
      setFeedback("Link de redefinição enviado!");
    });
  }

  if (excluido) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-bold text-ink">{usuario.nome}</p>
        <p className="text-xs text-sub">
          {usuario.email} · desde {dataCriacao}
        </p>
        {feedback && <p className="text-xs font-semibold text-jade">{feedback}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Chip tone={usuario.status === "ativo" ? "jade" : "danger"}>{usuario.status}</Chip>
        <ButtonOutline type="button" disabled={pending} onClick={redefinirSenha}>
          Redefinir senha
        </ButtonOutline>
        <ButtonOutline type="button" disabled={pending} onClick={alternarStatus}>
          {usuario.status === "ativo" ? "Inativar" : "Ativar"}
        </ButtonOutline>
        <ButtonGhost type="button" disabled={pending} onClick={excluir} className="text-danger">
          Excluir
        </ButtonGhost>
      </div>
    </div>
  );
}
