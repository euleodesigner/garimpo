import { createClient } from "@/lib/supabase/server";
import { PresentesClient } from "./presentes-client";

export default async function PresentesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // `products` (tabela base) não tem policy de select pra ninguém, nem pro
  // próprio dono (spec §7.5) -- toda leitura passa pela view products_public
  const { data: produtos } = await supabase
    .from("products_public")
    .select("id, nome, preco, imagem_url")
    .eq("list_id", id)
    .order("created_at", { ascending: false });

  let reservados: string[] = [];
  if (produtos?.length) {
    const { data: reservas } = await supabase
      .from("reservations_public")
      .select("product_id, status")
      .in(
        "product_id",
        produtos.map((p) => p.id),
      );
    reservados = (reservas ?? [])
      .filter((r) => r.status === "reservado")
      .map((r) => r.product_id);
  }

  return <PresentesClient listaId={id} produtos={produtos ?? []} reservados={reservados} />;
}
