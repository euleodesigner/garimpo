"use client";

import { useActionState } from "react";
import { salvarConfigAdmin } from "./actions";
import { Card, Input, Textarea, Label, ButtonPrimary, FieldError } from "@/components/ui";

type Inicial = {
  whatsapp_numero: string;
  banner_ativo: boolean;
  banner_titulo: string;
  banner_texto: string;
  banner_link: string;
  banner_cta: string;
  banner_imagem_url: string;
};

export function ConfigAdminForm({ inicial }: { inicial: Inicial }) {
  const [state, formAction, pending] = useActionState(salvarConfigAdmin, undefined);

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-ink">WhatsApp de contato</h2>
      <p className="mt-1 text-sm text-sub">
        Usado no popup que oferece cupom/link mais barato pro criador, quando uma loja não tem
        afiliação automática.
      </p>

      <form action={formAction}>
        <Label>Número (formato E.164, só números)</Label>
        <Input
          name="whatsapp_numero"
          defaultValue={inicial.whatsapp_numero}
          placeholder="5512999999999"
        />

        <h2 className="mt-6 text-xl font-extrabold text-ink">Banner promocional</h2>
        <p className="mt-1 text-sm text-sub">Aparece na página pública das listas.</p>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input type="checkbox" name="banner_ativo" defaultChecked={inicial.banner_ativo} />
          Banner ativo
        </label>

        <Label>Título</Label>
        <Input name="banner_titulo" defaultValue={inicial.banner_titulo} />

        <Label>Texto</Label>
        <Textarea name="banner_texto" defaultValue={inicial.banner_texto} className="min-h-20" />

        <Label>Link</Label>
        <Input name="banner_link" defaultValue={inicial.banner_link} placeholder="https://…" />

        <Label>Texto do botão (CTA)</Label>
        <Input name="banner_cta" defaultValue={inicial.banner_cta} placeholder="Ex.: Participar" />

        <Label>Imagem do banner</Label>
        {inicial.banner_imagem_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inicial.banner_imagem_url}
            alt=""
            className="mb-2 h-24 w-full rounded-lg object-cover"
          />
        )}
        <input
          type="file"
          name="banner_imagem"
          accept="image/*"
          className="block w-full text-sm text-sub file:mr-3 file:rounded-lg file:border-0 file:bg-bg file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
        />

        <FieldError>{state?.erro}</FieldError>
        {state?.ok && <p className="mt-2 text-sm font-semibold text-jade">Salvo!</p>}

        <div className="mt-5 text-right">
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </ButtonPrimary>
        </div>
      </form>
    </Card>
  );
}
