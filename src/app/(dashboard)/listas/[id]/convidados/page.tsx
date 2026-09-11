import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { cancelarReserva } from "./actions";

type Reserva = {
  id: string;
  product_id: string;
  guest_nome: string;
  guest_telefone: string;
  status: string;
  created_at: string;
};

export default async function ConvidadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // reservations (tabela base) não tem policy nenhuma -- leitura passa pela
  // função security definer listar_reservas_da_lista (equivalente ao
  // "cliente admin" que a spec §7.6 descreve, sem precisar de service_role)
  const { data } = await supabase.rpc("listar_reservas_da_lista", { p_list_id: id });
  const reservas = (data ?? []) as Reserva[];
  const ativas = reservas.filter((r) => r.status === "reservado");

  return (
    <div>
      <h2 className="text-xl font-extrabold text-ink">Esses são seus convidados</h2>
      <p className="mt-1 text-sm text-sub">Quem escolheu um presente aparece aqui.</p>

      {!ativas.length ? (
        <Card className="mt-5 text-center text-sub">Ninguém reservou um presente ainda.</Card>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {ativas.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-jade/10 font-bold text-jade">
                {r.guest_nome[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink">{r.guest_nome}</div>
                <div className="text-sm text-sub">{r.guest_telefone}</div>
              </div>
              <form action={cancelarReserva.bind(null, id, r.id)}>
                <button className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-sub hover:text-ink">
                  Liberar reserva
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
