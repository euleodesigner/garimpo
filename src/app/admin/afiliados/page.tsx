import { createAdminClient } from "@/lib/supabase/admin";
import { CredencialCard } from "./credencial-card";
import { Card } from "@/components/ui";

type StatusCredenciais = {
  shopee_id: string | null;
  shopee_configurado: boolean;
  awin_id: string | null;
  awin_configurado: boolean;
  admitad_id: string | null;
  admitad_configurado: boolean;
};

export default async function AfiliadosPage() {
  const admin = createAdminClient();
  const { data: status, error } = await admin
    .rpc("admin_status_credenciais")
    .maybeSingle<StatusCredenciais>();

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-extrabold text-ink">Afiliados</h2>
        <p className="mt-2 text-sm text-sub">
          As funções do banco que gravam essas credenciais ainda não foram criadas neste projeto
          Supabase. Rode o script SQL combinado (SQL Editor do Supabase) e recarregue esta página.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <CredencialCard
        provedor="shopee"
        titulo="Shopee"
        descricao="API oficial de afiliados. Converte o link e busca imagem/preço/título automaticamente."
        idLabel="App ID"
        secretLabel="App Secret"
        idAtual={status?.shopee_id ?? null}
        configurado={status?.shopee_configurado ?? false}
      />
      <CredencialCard
        provedor="awin"
        titulo="Awin"
        descricao="Rede de afiliados usada para SHEIN, Temu e Magalu."
        idLabel="Publisher ID"
        secretLabel="API Key"
        idAtual={status?.awin_id ?? null}
        configurado={status?.awin_configurado ?? false}
      />
      <CredencialCard
        provedor="admitad"
        titulo="Admitad"
        descricao="Rede de afiliados alternativa (mesmo propósito da Awin)."
        idLabel="Client ID"
        secretLabel="Client Secret"
        idAtual={status?.admitad_id ?? null}
        configurado={status?.admitad_configurado ?? false}
      />
    </div>
  );
}
