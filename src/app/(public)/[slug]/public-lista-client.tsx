"use client";

import { useActionState, useEffect, useState } from "react";
import { reservar, enviarRecado, confirmarPresenca } from "./actions";
import { Input, Label, ButtonPrimary, FieldError, Chip } from "@/components/ui";

type Lista = {
  id: string;
  nome: string;
  descricao: string | null;
  cor_principal: string | null;
  banner_url: string | null;
  foto_perfil_url: string | null;
  feat_recados: boolean;
  feat_rsvp: boolean;
};

type Produto = {
  id: string;
  nome: string;
  preco: number | null;
  imagem_url: string | null;
  quantidade: number;
};

type Mensagem = { id: string; nome: string; texto: string };

type Banner = {
  banner_ativo: boolean;
  banner_titulo: string | null;
  banner_texto: string | null;
  banner_link: string | null;
  banner_cta: string | null;
} | null;

export function PublicListaClient({
  slug,
  lista,
  produtos,
  reservados,
  mensagens,
  banner,
}: {
  slug: string;
  lista: Lista;
  produtos: Produto[];
  reservados: string[];
  mensagens: Mensagem[];
  banner: Banner;
}) {
  const [aba, setAba] = useState<"presentes" | "recadinhos" | "rsvp">("presentes");
  const [produtoReserva, setProdutoReserva] = useState<Produto | null>(null);
  const reservadoSet = new Set(reservados);
  const cor = lista.cor_principal || "#B4552D";

  const abas: Array<[typeof aba, string]> = [["presentes", "Presentes"]];
  if (lista.feat_recados) abas.push(["recadinhos", "Recadinhos"]);
  if (lista.feat_rsvp) abas.push(["rsvp", "Confirmar presença"]);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div
        className="h-36"
        style={{
          background: lista.banner_url
            ? `url(${lista.banner_url}) center/cover`
            : `linear-gradient(120deg, ${cor}, #C08A2D)`,
        }}
      />
      <div className="-mt-10 px-5">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-bg bg-card text-3xl">
          {lista.foto_perfil_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lista.foto_perfil_url} alt="" className="h-full w-full object-cover" />
          ) : (
            "🎁"
          )}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">{lista.nome}</h1>
        {lista.descricao && (
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-sub">{lista.descricao}</p>
        )}

        {banner?.banner_ativo && (
          <a
            href={banner.banner_link ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block rounded-2xl p-5 text-bg"
            style={{ background: "linear-gradient(120deg, #241E17, #8E3F1F)" }}
          >
            <div className="text-base font-extrabold">{banner.banner_titulo}</div>
            <div className="mt-1.5 text-sm opacity-90">{banner.banner_texto}</div>
            <span className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-extrabold text-ink">
              {banner.banner_cta ?? "Saiba mais"} →
            </span>
          </a>
        )}

        <div className="mt-6 flex gap-4 border-b border-line">
          {abas.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`cursor-pointer border-b-2 pb-3 text-sm font-bold ${
                aba === k ? "border-clay text-ink" : "border-transparent text-sub"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {aba === "presentes" && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {produtos.map((p) => {
              const reservado = reservadoSet.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-2xl border border-line bg-card ${reservado ? "opacity-70" : ""}`}
                >
                  <div className="grid h-28 place-items-center overflow-hidden bg-bg text-4xl">
                    {p.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🎁"
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="min-h-9 text-sm font-bold leading-tight text-ink">{p.nome}</div>
                    {p.preco != null && (
                      <div className="my-2 text-base font-extrabold text-ink">
                        R$ {p.preco.toFixed(2).replace(".", ",")}
                      </div>
                    )}
                    {reservado ? (
                      <div className="mt-2">
                        <Chip tone="jade">🔒 Reservado</Chip>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          onClick={() => setProdutoReserva(p)}
                          className="cursor-pointer rounded-lg bg-jade py-2.5 text-sm font-bold text-white"
                        >
                          Selecionar este presente
                        </button>
                        <a
                          href={`/api/go/${p.id}`}
                          className="rounded-lg border border-line py-2.5 text-center text-sm font-semibold text-ink"
                        >
                          Ir para a loja ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {aba === "recadinhos" && (
          <RecadinhosTab slug={slug} listaId={lista.id} mensagens={mensagens} />
        )}

        {aba === "rsvp" && <RsvpTab slug={slug} listaId={lista.id} />}
      </div>

      {produtoReserva && (
        <ModalReserva
          slug={slug}
          produto={produtoReserva}
          onClose={() => setProdutoReserva(null)}
        />
      )}
    </div>
  );
}

function ModalReserva({
  slug,
  produto,
  onClose,
}: {
  slug: string;
  produto: Produto;
  onClose: () => void;
}) {
  const acao = reservar.bind(null, slug, produto.id);
  const [state, formAction, pending] = useActionState(acao, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-card p-6"
      >
        <h2 className="text-lg font-extrabold text-ink">Reservar presente</h2>
        <p className="mt-1 text-sm text-sub">
          Confirme seu nome e telefone para reservar <b>{produto.nome}</b>.
        </p>
        <form action={formAction}>
          <Label>Seu nome</Label>
          <Input name="nome" placeholder="Como você quer aparecer" required />
          <Label>Telefone (WhatsApp)</Label>
          <Input name="telefone" placeholder="+55 12 90000-0000" required />
          <FieldError>{state?.erro}</FieldError>
          <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
            {pending ? "Confirmando…" : "Confirmar reserva"}
          </ButtonPrimary>
        </form>
      </div>
    </div>
  );
}

function RecadinhosTab({
  slug,
  listaId,
  mensagens,
}: {
  slug: string;
  listaId: string;
  mensagens: Mensagem[];
}) {
  const acao = enviarRecado.bind(null, slug, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  return (
    <div className="mt-5">
      <form action={formAction} className="rounded-2xl border border-line bg-card p-4">
        <Label>Deixe um recadinho</Label>
        <Input name="nome" placeholder="Seu nome" required />
        <textarea
          name="texto"
          placeholder="Escreva seu recado…"
          required
          className="mt-2.5 min-h-20 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink"
        />
        <FieldError>{state?.erro}</FieldError>
        {state?.ok && (
          <p className="mt-1.5 text-sm font-semibold text-jade">✓ Recadinho enviado!</p>
        )}
        <ButtonPrimary type="submit" disabled={pending} className="mt-3">
          {pending ? "Enviando…" : "Enviar recadinho"}
        </ButtonPrimary>
      </form>

      <div className="mt-4 flex flex-col gap-2.5">
        {mensagens.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-card p-3.5">
            <div className="text-sm font-bold text-ink">{m.nome}</div>
            <div className="mt-1 text-sm text-sub">{m.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RsvpTab({ slug, listaId }: { slug: string; listaId: string }) {
  const acao = confirmarPresenca.bind(null, slug, listaId);
  const [state, formAction, pending] = useActionState(acao, undefined);

  if (state?.ok) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-card p-4 text-center">
        <p className="text-sm font-semibold text-jade">✓ Presença confirmada, obrigado!</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5 rounded-2xl border border-line bg-card p-4">
      <Label>Seu nome</Label>
      <Input name="nome" placeholder="Como você quer aparecer" required />

      <Label>Você vai?</Label>
      <select
        name="presente"
        className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink"
      >
        <option value="sim">Sim, vou! 🎉</option>
        <option value="nao">Não vou conseguir</option>
      </select>

      <Label>Quantos acompanhantes (além de você)?</Label>
      <Input name="acompanhantes" type="number" min={0} defaultValue={0} />

      <FieldError>{state?.erro}</FieldError>
      <ButtonPrimary type="submit" disabled={pending} className="mt-4 w-full">
        {pending ? "Enviando…" : "Confirmar presença"}
      </ButtonPrimary>
    </form>
  );
}
