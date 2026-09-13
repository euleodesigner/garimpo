"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { criarLista } from "./actions";
import { Input, Label, Textarea, ButtonPrimary, ButtonGhost, FieldError } from "@/components/ui";
import { normalizarSlug, sugerirSlug } from "@/lib/slug";

const TIPOS = [
  "🏠 Chá de Casa Nova", "👶 Chá de Bebê", "💍 Casamento", "🎂 Aniversário",
  "🍳 Chá de Panela", "🍽️ Chá de Cozinha", "💑 Noivado", "🍼 Chá de Fraldas",
  "💛 Chá Revelação", "👑 Quinze Anos", "🎓 Formatura", "💕 Chá de Lingerie",
  "🎁 Festa Infantil", "🌽 Festa Junina", "💎 Bodas", "🐾 Festinha do Pet",
  "⛪ Evento da Igreja", "❤️ Dia dos Namorados", "🎄 Natal", "🛒 Compras",
  "📚 Material Escolar", "✨ Outro",
];

// Mesmo domínio de exibição usado em Configurações -- sempre a partir de
// NEXT_PUBLIC_APP_URL, nunca um texto fixo. Path direto, sem subdomínio.
const DOMINIO_EXIBICAO =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "lista.trivormarketing.com";

export default function NovaListaPage() {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2>(1);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState(TIPOS[3]);
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [state, formAction, pending] = useActionState(criarLista, undefined);

  const slugAtual = slugTocado ? slug : sugerirSlug(nome || "minha-lista");

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-1.5 w-10 rounded-full ${passo >= n ? "bg-clay" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card p-6">
        {passo === 1 ? (
          <>
            <h2 className="text-xl font-extrabold text-ink">🎉 Dê um nome à sua lista</h2>
            <p className="mt-1 text-sm text-sub">
              Você sempre pode mudar isso depois, então mantenha simples por enquanto.
            </p>
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Chá de Panela da Renata e do João"
            />
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Conte um pouco sobre o evento (opcional)"
              className="min-h-24"
            />
            <div className="mt-5 flex justify-between">
              <ButtonGhost type="button" onClick={() => router.push("/listas")}>
                Cancelar
              </ButtonGhost>
              <ButtonPrimary type="button" disabled={!nome} onClick={() => setPasso(2)}>
                Próximo →
              </ButtonPrimary>
            </div>
          </>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="nome" value={nome} />
            <input type="hidden" name="descricao" value={descricao} />
            <input type="hidden" name="tipo_evento" value={tipo} />
            <input type="hidden" name="slug" value={slugAtual} />

            <h2 className="text-xl font-extrabold text-ink">🛠️ Que tipo de evento é?</h2>
            <p className="mt-1 text-sm text-sub">
              Isso ajuda a organizar sua lista e o endereço público dela.
            </p>
            <div className="mt-4 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`cursor-pointer rounded-xl border-[1.5px] px-2 py-3 text-xs font-semibold ${
                    tipo === t ? "border-jade bg-jade/10 text-jade" : "border-line bg-white text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Label>Endereço público</Label>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-sub">{DOMINIO_EXIBICAO}/</span>
              <Input
                value={slugAtual}
                onChange={(e) => {
                  setSlug(normalizarSlug(e.target.value));
                  setSlugTocado(true);
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-sub">Este será o endereço público da sua lista.</p>
            <FieldError>{state?.erro}</FieldError>

            <div className="mt-5 flex justify-between">
              <ButtonGhost type="button" onClick={() => setPasso(1)}>
                ← Voltar
              </ButtonGhost>
              <ButtonPrimary type="submit" disabled={pending}>
                {pending ? "Criando…" : "Criar lista"}
              </ButtonPrimary>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
