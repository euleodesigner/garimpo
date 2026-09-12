import { createAdminClient } from "@/lib/supabase/admin";
import { CredencialCard } from "./credencial-card";
import { LOJAS } from "@/lib/afiliados/lojas";
import { Card } from "@/components/ui";

type StatusRow = {
  loja: string;
  habilitado: boolean;
  identificador: string | null;
  identificador2: string | null;
  configurado: boolean;
  ultimo_teste_ok: boolean | null;
  ultimo_teste_erro: string | null;
};

export default async function AfiliadosPage() {
  const admin = createAdminClient();
  const { data: statusRows, error } = await admin.rpc("admin_status_credenciais_lojas");

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

  const statusPorLoja = new Map((statusRows as StatusRow[] | null)?.map((s) => [s.loja, s]));

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {LOJAS.map((loja) => {
        const s = statusPorLoja.get(loja.id);
        return (
          <CredencialCard
            key={loja.id}
            loja={loja}
            status={
              s
                ? {
                    identificador: s.identificador,
                    identificador2: s.identificador2,
                    configurado: s.configurado,
                    habilitado: s.habilitado,
                    ultimoTesteOk: s.ultimo_teste_ok,
                    ultimoTesteErro: s.ultimo_teste_erro,
                  }
                : null
            }
          />
        );
      })}
    </div>
  );
}
