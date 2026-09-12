"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { baixarImagemExterna } from "@/lib/marketplace";
import { resolverAfiliacao, escolherDadosProduto } from "@/lib/afiliacao";
import { carregarCredencialLoja } from "@/lib/afiliados/credenciais";
import { buscarDadosProdutoShopeePeloLink } from "@/lib/shopee-afiliado";

type State = { erro?: string; ok?: boolean } | undefined;

const EXTENSOES_IMAGEM_PERMITIDAS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function extensaoSegura(nomeArquivo: string): string {
  const bruta = (nomeArquivo.split(".").pop() ?? "").toLowerCase();
  return EXTENSOES_IMAGEM_PERMITIDAS.has(bruta) ? bruta : "jpg";
}

// Busca automática (onBlur, spec §4/§8) preenche nome/preço/imagem no
// client antes de salvar -- link_afiliado continua null aqui, a conversão
// de afiliado em si só entra quando houver credencial real de loja (Fase 4
// completa). "imagemUrlAuto" é o og:image já extraído pelo onBlur; se o
// creator não subir um arquivo manual, essa imagem é baixada e resalva no
// nosso Storage (nunca hotlink direto).
export async function adicionarPresente(
  listaId: string,
  _prevState: State,
  formData: FormData,
): Promise<State> {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoStr = String(formData.get("preco") ?? "").replace(",", ".").trim();
  const link = String(formData.get("link") ?? "").trim();
  const imagem = formData.get("imagem") as File | null;
  const imagemUrlAuto = String(formData.get("imagemUrlAuto") ?? "").trim();

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

  // `products` não tem policy de select nem de update pra creator (spec
  // §7.5, Regra Inviolável #3 -- produto é imutável depois de criado) --
  // por isso o id é gerado aqui e a imagem sobe ANTES do insert: um
  // `.insert().select()` exigiria privilégio de leitura que a tabela não
  // concede, e um `.update()` depois do insert seria bloqueado pela RLS
  // (não existe policy de update pra ninguém além do owner da plataforma)
  const produtoId = crypto.randomUUID();

  // Conversão de afiliado (spec §7.4): roda aqui, no clique de salvar, lendo
  // `link` direto do formulário -- nunca reaproveita nenhum valor computado
  // durante o onBlur (busca automática de nome/preço/imagem, acima). A
  // credencial só é carregada (RPC security definer) depois que
  // resolverAfiliacao já detectou o marketplace, uma loja por vez -- nunca
  // decripta Vault de lojas que o link nem é. Não passa por exigirOwner(),
  // porque quem está salvando é o creator, nunca o owner.
  const { marketplace, linkAfiliado, afiliacaoStatus } = await resolverAfiliacao(
    link,
    carregarCredencialLoja,
  );

  // Dado autoritativo do produto (nome/preço/imagem): hoje só a Shopee tem
  // API capaz de devolver isso pelo link exato -- recalculado aqui de novo
  // (nunca confiando no que o formulário mandou) porque é o servidor quem
  // decide o valor final gravado, o mesmo princípio de nunca confiar no
  // client que já vale pro link_afiliado. Se a Shopee não responder (ou não
  // for a loja), cai pro que veio do formulário/scraping do onBlur.
  let dadosShopee: Awaited<ReturnType<typeof buscarDadosProdutoShopeePeloLink>> = null;
  if (marketplace === "shopee") {
    const credShopee = await carregarCredencialLoja("shopee");
    if (credShopee?.identificador && credShopee.secret) {
      dadosShopee = await buscarDadosProdutoShopeePeloLink(link, {
        appId: credShopee.identificador,
        appSecret: credShopee.secret,
      });
    }
  }
  const dadosFinais = escolherDadosProduto({ nome, preco }, dadosShopee);

  // Imagem: upload manual do criador sempre vence (escolha explícita dele).
  // Sem upload manual, prioriza a imagem que veio da API da Shopee (mais
  // confiável que o og:image genérico); sem isso também, cai pro
  // "imagemUrlAuto" que o onBlur já tinha extraído por scraping.
  let imagemUrl: string | null = null;

  if (imagem && imagem.size > 0 && imagem.type.startsWith("image/")) {
    const ext = extensaoSegura(imagem.name);
    const path = `products/${listaId}/${produtoId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("public-media")
      .upload(path, imagem, { upsert: true });
    if (!uploadError) {
      const { data: pub } = supabase.storage.from("public-media").getPublicUrl(path);
      imagemUrl = pub.publicUrl;
    }
  } else {
    const imagemExterna = dadosShopee?.imagem || imagemUrlAuto;
    if (imagemExterna) {
      const baixada = await baixarImagemExterna(imagemExterna);
      if (baixada) {
        const ext = baixada.contentType.split("/")[1]?.split(";")[0] ?? "jpg";
        const extSegura = extensaoSegura(`arquivo.${ext}`);
        const path = `products/${listaId}/${produtoId}.${extSegura}`;
        const { error: uploadError } = await supabase.storage
          .from("public-media")
          .upload(path, baixada.bytes, { upsert: true, contentType: baixada.contentType });
        if (!uploadError) {
          const { data: pub } = supabase.storage.from("public-media").getPublicUrl(path);
          imagemUrl = pub.publicUrl;
        }
      }
    }
  }

  // "O resultado devolvido ao client nunca é a linha inteira" (spec §7.4) --
  // por isso este insert nunca encadeia .select(): devolver a linha criada
  // vazaria link_afiliado/link_original/marketplace/afiliacao_status pro
  // browser do creator, violando a Regra Inviolável #1.
  const { error } = await supabase.from("products").insert({
    id: produtoId,
    list_id: listaId,
    nome: dadosFinais.nome,
    preco: dadosFinais.preco,
    link_original: link,
    quantidade: 1,
    imagem_url: imagemUrl,
    marketplace,
    link_afiliado: linkAfiliado,
    afiliacao_status: afiliacaoStatus,
  });

  if (error) {
    return { erro: "Não foi possível salvar o presente. Tente de novo." };
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
