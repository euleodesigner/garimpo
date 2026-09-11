"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type State = { erro?: string; ok?: boolean } | undefined;

const EXTENSOES_IMAGEM_PERMITIDAS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function extensaoSegura(nomeArquivo: string): string {
  const bruta = (nomeArquivo.split(".").pop() ?? "").toLowerCase();
  return EXTENSOES_IMAGEM_PERMITIDAS.has(bruta) ? bruta : "jpg";
}

// Fase 2 do roteiro: cadastro manual, sem busca automática (onBlur) nem
// conversão de afiliado ainda -- link_afiliado fica null. O conversor
// plugável por marketplace entra na Fase 4.
export async function adicionarPresente(
  listaId: string,
  _prevState: State,
  formData: FormData,
): Promise<State> {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoStr = String(formData.get("preco") ?? "").replace(",", ".").trim();
  const link = String(formData.get("link") ?? "").trim();
  const imagem = formData.get("imagem") as File | null;

  if (!nome || !link) {
    return { erro: "Preencha o nome e o link do produto." };
  }

  let preco: number | null = null;
  if (precoStr) {
    preco = Number(precoStr);
    if (Number.isNaN(preco)) return { erro: "Preço inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // confere que a lista pertence a quem está chamando antes do insert --
  // mesmo padrão de filtro explícito das funções de banco da spec (§7.4)
  const { data: lista } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listaId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!lista) return { erro: "Lista não encontrada." };

  const { data: produto, error } = await supabase
    .from("products")
    .insert({ list_id: listaId, nome, preco, link_original: link, quantidade: 1 })
    .select("id")
    .single();

  if (error || !produto) {
    return { erro: "Não foi possível salvar o presente. Tente de novo." };
  }

  if (imagem && imagem.size > 0 && imagem.type.startsWith("image/")) {
    const ext = extensaoSegura(imagem.name);
    const path = `products/${listaId}/${produto.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("public-media")
      .upload(path, imagem, { upsert: true });

    if (!uploadError) {
      const { data: pub } = supabase.storage.from("public-media").getPublicUrl(path);
      await supabase.from("products").update({ imagem_url: pub.publicUrl }).eq("id", produto.id);
    }
  }

  revalidatePath(`/listas/${listaId}/presentes`);
  return { ok: true };
}

// Regra Inviolável #3: produto não é editável, só excluído e recriado.
export async function excluirPresente(listaId: string, produtoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // confere posse explicitamente antes de excluir -- a RLS de products já
  // bloqueia um delete em produto de lista alheia (usa o list_id real da
  // linha, não o parâmetro), mas checar aqui falha rápido e evita chamadas
  // de Storage desperdiçadas contra um listaId que não é do chamador
  const { data: lista } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listaId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!lista) return;

  await supabase.from("products").delete().eq("id", produtoId);

  // limpa o arquivo órfão no Storage (spec §6 "Limpeza ao excluir produto")
  // -- a extensão não fica salva em coluna própria, então localiza pelo
  // prefixo do product_id dentro da pasta da lista
  const { data: arquivos } = await supabase.storage
    .from("public-media")
    .list(`products/${listaId}`, { search: produtoId });
  if (arquivos?.length) {
    await supabase.storage
      .from("public-media")
      .remove(arquivos.map((a) => `products/${listaId}/${a.name}`));
  }

  revalidatePath(`/listas/${listaId}/presentes`);
}
