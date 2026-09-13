"use server";

import { fetchSeguro, urlDeLojaSuportada, detectarMarketplace } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";
import { carregarCredencialLoja } from "@/lib/afiliados/credenciais";
import { buscarDadosProdutoShopeePeloLink } from "@/lib/shopee-afiliado";
import { renderizarEExtrairDados } from "@/lib/scraping/render-navegador";
import { extrairDadosDeHtmlRenderizado } from "@/lib/scraping/extrair-dados-renderizados";

export type DadosProduto = {
  titulo: string | null;
  imagem: string | null;
  preco: number | null;
  // Sinal pro modal oferecer o atalho de WhatsApp (spec §8) -- nunca o
  // marketplace detectado nem o afiliacao_status em si (Regra Inviolável
  // #2): o client só sabe "hoje dá pra pedir um link com desconto nesta
  // loja" + o número, nunca por quê nem em qual loja.
  ofertaWhatsapp: { numero: string } | null;
};

// Busca automática de nome/imagem/preço ao sair do campo de link (spec §4,
// §8) -- nunca inclui qualquer campo de link (original ou convertido), só
// os três campos de exibição. A conversão de afiliado em si (que precisa
// das credenciais reais das lojas) fica pra quando essas credenciais
// existirem -- aqui só lemos og:title/og:image/preço público da página.
export async function buscarDadosProduto(url: string): Promise<DadosProduto | { erro: string }> {
  // Server Actions são endpoints POST público-alcançáveis por id (o id vem
  // no bundle JS, que qualquer um baixa sem estar logado) -- sem essa
  // checagem, qualquer pessoa na internet conseguia disparar essa função e
  // gastar a credencial paga da Shopee/abrir o navegador headless sem ser
  // criador de verdade (achado de revisão de segurança). `adicionarPresente`
  // já fazia essa checagem; essa função nunca fez.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Atualize a página e faça login de novo." };

  if (!url.trim()) return { erro: "Cole um link primeiro." };

  const ofertaWhatsapp = await resolverOfertaWhatsapp(url);

  // Shopee tem API oficial capaz de devolver nome/preço/imagem reais do
  // produto (nenhuma outra loja integrada tem isso) -- tentamos primeiro,
  // e só caímos pro scraping genérico abaixo se não for Shopee ou a
  // chamada não der certo (item não encontrado, credencial ausente, etc.).
  if (detectarMarketplace(url) === "shopee") {
    const credShopee = await carregarCredencialLoja("shopee");
    if (credShopee?.identificador && credShopee.secret) {
      const dadosShopee = await buscarDadosProdutoShopeePeloLink(url, {
        appId: credShopee.identificador,
        appSecret: credShopee.secret,
      });
      if (dadosShopee) {
        return {
          titulo: dadosShopee.nome,
          imagem: dadosShopee.imagem,
          preco: dadosShopee.preco,
          ofertaWhatsapp,
        };
      }
    }
  }

  if (!urlDeLojaSuportada(url)) {
    // loja fora da allowlist -- não é erro, só não dá pra buscar
    // automaticamente; o formulário cai no preenchimento manual
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  const res = await fetchSeguro(url);
  if (!res || !res.ok) {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  let html: string;
  try {
    html = await res.text();
  } catch {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  // Mesma extração usada no resultado do navegador headless (JSON-LD >
  // og: > preço solto no texto) -- reaproveitada aqui pro HTML puro, sem
  // duplicar a lógica de leitura. `extraido` só conta como "achou algo" se
  // veio de JSON-LD ou og: (sinal forte); a tag <title> genérica (quase
  // toda página tem uma, mesmo SPA sem conteúdo real carregado) NUNCA conta
  // aqui -- só é usada como último recurso no valor final devolvido, pra
  // não mascarar "não achei nada útil" e bloquear a tentativa do plano B.
  const extraido = extrairDadosDeHtmlRenderizado(html);

  // Plano B: o scraping simples (sem executar JS) não achou nome nem
  // imagem de fonte confiável -- provável loja que monta a página inteira
  // via JavaScript (Shopee sem credencial, SHEIN, Temu...). Abre um
  // navegador de verdade por até 4s como última tentativa antes de cair no
  // preenchimento manual.
  if (!extraido?.titulo && !extraido?.imagem) {
    const dadosRenderizados = await renderizarEExtrairDados(url);
    if (dadosRenderizados) {
      return {
        titulo: dadosRenderizados.titulo,
        imagem: dadosRenderizados.imagem,
        preco: dadosRenderizados.preco ?? extraido?.preco ?? null,
        ofertaWhatsapp,
      };
    }
  }

  const tituloTagGenerica = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;

  return {
    titulo: extraido?.titulo ?? tituloTagGenerica,
    imagem: extraido?.imagem ?? null,
    preco: extraido?.preco ?? null,
    ofertaWhatsapp,
  };
}

/**
 * Decide se oferece o atalho de WhatsApp (spec §8: quando afiliacao_status
 * ficaria sem_api/sem_autorizacao/nao_aplicavel) sem nunca calcular nem
 * expor o afiliacao_status de verdade aqui -- só a pergunta booleana "essa
 * loja converte automaticamente hoje?", via loja_afiliado_habilitada() (RPC
 * pública, sem segredo, lê só a flag `habilitado` da loja detectada -- vale
 * pra qualquer loja do registro em @/lib/afiliados/lojas, não só Shopee).
 * Loja não reconhecida -> sem oferta (nada pra "achar mais barato" numa
 * loja que o sistema nem identifica).
 *
 * Cobertura honesta (limitação estrutural, não bug): como esta decisão roda
 * no onBlur -- antes de qualquer tentativa real de conversão, que só
 * acontece no clique de salvar (§7.4) -- ela cobre sem_api/nao_aplicavel de
 * forma confiável (dependem só de "está habilitada?", conhecível no onBlur),
 * mas não detecta sem_autorizacao (loja habilitada e a conversão falhando de
 * verdade na hora de salvar, ex.: credencial Shopee inválida).
 */
async function resolverOfertaWhatsapp(url: string): Promise<{ numero: string } | null> {
  const marketplace = detectarMarketplace(url);
  if (!marketplace) return null;

  const supabase = await createClient();

  const { data: habilitada } = await supabase.rpc("loja_afiliado_habilitada", { p_loja: marketplace });
  if (habilitada) return null;

  const { data: banner } = await supabase
    .from("banner_publico")
    .select("whatsapp_numero")
    .maybeSingle();

  return banner?.whatsapp_numero ? { numero: banner.whatsapp_numero } : null;
}
