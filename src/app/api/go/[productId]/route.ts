import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Redirect de compra (spec §7.6): anônimo recebe link_afiliado ?? link_original;
// qualquer sessão autenticada (creator ou owner, dono desta lista ou não)
// recebe sempre link_original -- nunca link_afiliado, mesmo na própria lista.
// A escolha roda em `get_redirect_link()` (security definer), que já embute
// essa regra e a checagem de "lista ativa, ou eu sou o dono" -- equivalente
// ao Route Handler com cliente admin que a spec descreve, sem precisar de
// SUPABASE_SERVICE_ROLE_KEY na aplicação.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const supabase = await createClient();

  const { data: link } = await supabase.rpc("get_redirect_link", { p_product_id: productId });

  if (!link) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  return NextResponse.redirect(link, { status: 302 });
}
