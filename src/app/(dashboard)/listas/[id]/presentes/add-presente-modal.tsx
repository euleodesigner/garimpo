"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adicionarPresente } from "./actions";
import { buscarDadosProduto } from "./buscar-dados-action";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export function AddPresenteModal({ listaId, onClose }: { listaId: string; onClose: () => void }) {
  const acao = adicionarPresente.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [imagemAutoUrl, setImagemAutoUrl] = useState<string | null>(null);
  const [imagemPreviewLocal, setImagemPreviewLocal] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  async function aoSairDoLink(e: React.FocusEvent<HTMLInputElement>) {
    const url = e.target.value.trim();
    if (!url) return;
    setBuscando(true);
    try {
      const resultado = await buscarDadosProduto(url);
      if ("erro" in resultado) return;
      if (!nome && resultado.titulo) setNome(resultado.titulo);
      if (!preco && resultado.preco != null) setPreco(String(resultado.preco).replace(".", ","));
      if (resultado.imagem) setImagemAutoUrl(resultado.imagem);
    } finally {
      setBuscando(false);
    }
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) {
      setNomeArquivo(null);
      setImagemPreviewLocal(null);
      return;
    }
    setNomeArquivo(arquivo.name);
    setImagemPreviewLocal(URL.createObjectURL(arquivo));
  }

  const imagemExibida = imagemPreviewLocal ?? imagemAutoUrl;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6"
      >
        <h2 className="text-xl font-extrabold text-ink">Adicionar presente</h2>
        <p className="mt-1 text-sm text-sub">
          Cole o link do produto e a gente busca nome, preço e imagem automaticamente.
        </p>

        <form action={formAction}>
          <input type="hidden" name="imagemUrlAuto" value={imagemPreviewLocal ? "" : (imagemAutoUrl ?? "")} />

          <Label>Link do produto</Label>
          <Input
            name="link"
            placeholder="Cole aqui o link da loja (Shopee, Magalu, SHEIN…)"
            onBlur={aoSairDoLink}
            required
          />
          {buscando && <p className="mt-1.5 text-xs text-sub">Buscando dados do produto…</p>}

          <Label>Nome do produto</Label>
          <Input
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Camiseta Polo Infantil"
            required
          />

          <Label>Preço (R$)</Label>
          <Input
            name="preco"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="Ex.: 59,90"
          />

          <Label>Imagem</Label>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg text-2xl">
              {imagemExibida ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemExibida} alt="" className="h-full w-full object-cover" />
              ) : (
                "🎁"
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-bg"
              >
                {nomeArquivo ? "Trocar imagem" : "Enviar imagem manualmente"}
              </button>
              {nomeArquivo && (
                <p className="mt-1 truncate text-xs text-sub">{nomeArquivo}</p>
              )}
              {!nomeArquivo && imagemAutoUrl && (
                <p className="mt-1 text-xs text-sub">Imagem encontrada automaticamente</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="imagem"
              accept="image/*"
              onChange={aoEscolherArquivo}
              className="hidden"
            />
          </div>

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
