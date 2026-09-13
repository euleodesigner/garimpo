import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CompartilharClient } from "./compartilhar-client";

export default async function CompartilharPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lista } = await supabase
    .from("lists")
    .select("slug")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  // Sempre usa o domínio de verdade configurado (NEXT_PUBLIC_APP_URL) --
  // nunca o header "host" da requisição. Usar o host da requisição gerava
  // um link errado (ex.: o domínio bruto do Easypanel) sempre que o dono
  // acessasse o painel por um endereço diferente do domínio público, mesmo
  // que só por engano -- o convidado recebia um link que não é o domínio
  // real da lista. Só cai pro header como último recurso (dev local sem a
  // variável configurada).
  const headerList = await headers();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const host = headerList.get("host") ?? "listagarimpo.com.br";
  const protocolo = host.includes("localhost") || host.includes(".test") ? "http" : "https";

  // Link por caminho (não subdomínio): o domínio de produção atual
  // (lista.trivormarketing.com) não tem DNS wildcard configurado, então
  // um link tipo "{slug}.lista.trivormarketing.com" nunca resolveria.
  const url = baseUrl ? `${baseUrl}/${lista?.slug}` : `${protocolo}://${host}/${lista?.slug}`;

  return <CompartilharClient url={url} />;
}
