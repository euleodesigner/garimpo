import { createAdminClient } from "@/lib/supabase/admin";
import { UsuarioRow } from "./usuario-row";
import { Card } from "@/components/ui";

export default async function UsuariosPage() {
  const admin = createAdminClient();

  const { data: perfis } = await admin
    .from("profiles")
    .select("id, nome, role, status, excluido_em, created_at")
    .eq("role", "creator")
    .order("created_at", { ascending: false });

  const { data: listaUsuarios } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailPorId = new Map((listaUsuarios?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const usuarios = (perfis ?? []).map((p) => ({
    id: p.id as string,
    nome: (p.nome as string | null) ?? "(sem nome)",
    email: emailPorId.get(p.id as string) ?? "—",
    status: p.status as "ativo" | "inativo",
    excluido: Boolean(p.excluido_em),
    criadoEm: p.created_at as string,
  }));

  const ativos = usuarios.filter((u) => !u.excluido);
  const excluidos = usuarios.filter((u) => u.excluido);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="text-xl font-extrabold text-ink">Usuários</h2>
        <p className="mt-1 text-sm text-sub">Criadores de lista cadastrados na plataforma.</p>
        <div className="mt-4 flex flex-col divide-y divide-line">
          {ativos.length === 0 && (
            <p className="py-4 text-sm text-sub">Nenhum usuário cadastrado ainda.</p>
          )}
          {ativos.map((u) => (
            <UsuarioRow key={u.id} usuario={u} />
          ))}
        </div>
      </Card>

      {excluidos.length > 0 && (
        <Card>
          <h2 className="text-lg font-extrabold text-ink">Excluídos</h2>
          <div className="mt-3 flex flex-col divide-y divide-line">
            {excluidos.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3 text-sm text-sub">
                <span>
                  {u.nome} — {u.email}
                </span>
                <span>Excluído</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
