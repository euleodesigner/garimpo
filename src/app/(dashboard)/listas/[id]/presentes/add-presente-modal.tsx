"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";
import { adicionarPresente } from "./actions";
import { buscarDadosProduto } from "./buscar-dados-action";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";
import type { DadosProduto } from "./buscar-dados-action";

export function AddPresenteModal({ listaId, onClose }: { listaId: string; onClose: () => void }) {
  const acao = adicionarPresente.bind(null, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [imagemAutoUrl, setImagemAutoUrl] = useState<string | null>(null);
  const [ofertaWhatsapp, setOfertaWhatsapp] = useState<DadosProduto["ofertaWhatsapp"]>(null);
  const [imagemPreviewLocal, setImagemPreviewLocal] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  // Se o salvar de verdade falhou, volta pra edição em vez de deixar o
  // criador preso na tela de revisão sem enxergar os campos pra corrigir --
  // derivado direto do render (não em efeito) pra não disparar setState
  // dentro de useEffect.
  const emRevisao = revisando && !state?.erro;

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
      setOfertaWhatsapp(resultado.ofertaWhatsapp);
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

        <form ref={formRef} action={formAction}>
          <input type="hidden" name="imagemUrlAuto" value={imagemPreviewLocal ? "" : (imagemAutoUrl ?? "")} />

          <div hidden={emRevisao}>
            <Label>Link do produto</Label>
            <Input
              name="link"
              placeholder="Cole aqui o link da loja (Shopee, Magalu, SHEIN…)"
              onBlur={aoSairDoLink}
              required={!emRevisao}
            />
            {buscando && <p className="mt-1.5 text-xs text-sub">Buscando dados do produto…</p>}

            <Label>Nome do produto</Label>
            <Input
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Camiseta Polo Infantil"
              required={!emRevisao}
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
          </div>

          {emRevisao && (
            <div className="rounded-xl border border-line bg-bg p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-card text-2xl">
                  {imagemExibida ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemExibida} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🎁"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{nome}</div>
                  {preco && <div className="text-sm text-sub">R$ {preco}</div>}
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-danger">
                ⚠️ Revise os dados. Após salvar, não será possível editar. Caso precise, exclua o
                produto depois e crie outro.
              </p>
            </div>
          )}

          <FieldError>{state?.erro}</FieldError>

          <div className="mt-6 flex justify-end gap-2.5">
            {!emRevisao ? (
              <Fragment key="editar">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-lg px-3.5 py-2.5 text-sm font-semibold text-sub"
                >
                  Cancelar
                </button>
                <ButtonPrimary
                  type="button"
                  onClick={(e) => {
                    // Nunca deixar esse clique "vazar" pra um submit real: em
                    // alguns motores de navegador, se o mesmo <button> vira
                    // type="submit" no re-render causado por este handler
                    // (troca de tela pra revisão), o clique original acaba
                    // sendo tratado como o clique que confirmou o envio --
                    // preventDefault() aqui bloqueia isso, e o key="editar"/
                    // key="revisao" acima força o React a trocar de nó de
                    // verdade em vez de só mudar o atributo "type" no mesmo
                    // elemento.
                    e.preventDefault();
                    if (formRef.current?.reportValidity()) setRevisando(true);
                  }}
                >
                  Salvar presente
                </ButtonPrimary>
              </Fragment>
            ) : (
              <Fragment key="revisao">
                <button
                  type="button"
                  onClick={() => setRevisando(false)}
                  className="cursor-pointer rounded-lg px-3.5 py-2.5 text-sm font-semibold text-sub"
                >
                  Voltar e editar
                </button>
                <ButtonPrimary type="submit" disabled={pending}>
                  {pending ? "Salvando…" : "Confirmar e salvar"}
                </ButtonPrimary>
              </Fragment>
            )}
          </div>
        </form>

        {ofertaWhatsapp && (
          <div
            onClick={() => setOfertaWhatsapp(null)}
            className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card p-6 text-center"
            >
              <div className="mb-2 text-4xl">🔎</div>
              <h3 className="text-lg font-extrabold text-ink">
                Achamos que dá para pagar menos nesse produto
              </h3>
              <p className="mt-2 text-sm text-sub">
                Você pode encontrar um cupom ou um link mais barato desse produto com a gente.
                Deseja entrar em contato?
              </p>
              <a
                href={`https://wa.me/${ofertaWhatsapp.numero}?text=${encodeURIComponent(
                  "Olá, vim do Lista Garimpo e quero um link com desconto para este produto: " +
                    (document.querySelector<HTMLInputElement>('input[name="link"]')?.value ?? ""),
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOfertaWhatsapp(null)}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-3.5 text-sm font-extrabold text-white"
              >
                🟢 Entrar em contato
              </a>
              <button
                type="button"
                onClick={() => setOfertaWhatsapp(null)}
                className="mt-3 w-full py-2.5 text-xs font-semibold text-sub"
              >
                Agora não, seguir com este link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
