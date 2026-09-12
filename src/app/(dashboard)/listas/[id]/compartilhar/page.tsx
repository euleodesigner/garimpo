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

  const headerList = await headers();
  const host = headerList.get("host") ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "listagarimpo.com.br";
  const protocolo = host.includes("localhost") || host.includes(".test") ? "http" : "https";

  // Link por caminho (não subdomínio): o domínio de produção atual
  // (lista.trivormarketing.com) não tem DNS wildcard configurado, então
  // um link tipo "{slug}.lista.trivormarketing.com" nunca resolveria.
  const url = `${protocolo}://${host}/${lista?.slug}`;

  return <CompartilharClient url={url} />;
}
