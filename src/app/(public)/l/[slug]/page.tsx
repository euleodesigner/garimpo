import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicListaClient } from "./public-lista-client";

export default async function ListaPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: lista } = await supabase
    .from("lists")
    .select(
      "id, nome, descricao, cor_principal, banner_url, foto_perfil_url, feat_recados, feat_rsvp",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!lista) notFound();

  const { data: produtos } = await supabase
    .from("products_public")
    .select("id, nome, preco, imagem_url, quantidade")
    .eq("list_id", lista.id)
    .order("created_at", { ascending: false });

  let reservadosSet: string[] = [];
  if (produtos?.length) {
    const { data: reservas } = await supabase
      .from("reservations_public")
      .select("product_id, status")
      .in(
        "product_id",
        produtos.map((p) => p.id),
      );
    reservadosSet = (reservas ?? [])
      .filter((r) => r.status === "reservado")
      .map((r) => r.product_id);
  }

  const { data: mensagens } = lista.feat_recados
    ? await supabase
        .from("messages")
        .select("id, nome, texto")
        .eq("list_id", lista.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: banner } = await supabase
    .from("banner_publico")
    .select("banner_ativo, banner_titulo, banner_texto, banner_link, banner_cta")
    .maybeSingle();

  return (
    <PublicListaClient
      slug={slug}
      lista={lista}
      produtos={produtos ?? []}
      reservados={reservadosSet}
      mensagens={mensagens ?? []}
      banner={banner ?? null}
    />
  );
}
