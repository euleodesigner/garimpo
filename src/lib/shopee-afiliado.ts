import { createHash } from "crypto";
import { fetchSeguro } from "./marketplace";

// API oficial de afiliados da Shopee (GraphQL, região Brasil). Assinatura:
// SHA256(AppId + Timestamp(segundos) + Payload(JSON exato do body) + Secret),
// hex lowercase -- documentado em https://www.affiliateshopee.com.br/documentacao.
// Timeout curto (mesma lógica de fetchSeguro em marketplace.ts): a Server
// Action de salvar presente não pode travar esperando a Shopee responder.
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";
const TIMEOUT_MS = 5000;

export type CredenciaisShopee = { appId: string; appSecret: string };

// URL de produto Shopee: ".../nome-do-produto-i.<shopId>.<itemId>", podendo
// ter query string de tracking depois (ex.: "?sp_atk=..."). Link curto
// (s.shopee.com.br) só tem esse formato depois de resolvido o redirect --
// quem chama essa função já deve passar a URL final, não a encurtada.
export function extrairIdsProdutoShopee(url: string): { shopId: string; itemId: string } | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = pathname.match(/-i\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { shopId: match[1], itemId: match[2] };
}

function assinar(appId: string, timestamp: number, payload: string, secret: string): string {
  return createHash("sha256").update(appId + timestamp + payload + secret).digest("hex");
}

/**
 * Converte um link de produto/loja da Shopee em link de afiliado via
 * generateShortLink. Devolve null (nunca lança) em qualquer falha -- rede,
 * timeout, credencial inválida, resposta com `errors` -- porque quem chama
 * (resolverAfiliacao) trata "não converteu" como afiliacao_status =
 * 'sem_autorizacao', não como erro fatal do fluxo de salvar o presente.
 */
export async function converterLinkShopee(
  urlOriginal: string,
  credenciais: CredenciaisShopee,
): Promise<string | null> {
  const payload = JSON.stringify({
    query: `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(urlOriginal)} }) { shortLink } }`,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = assinar(credenciais.appId, timestamp, payload, credenciais.appSecret);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${credenciais.appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const shortLink = json?.data?.generateShortLink?.shortLink;
  return typeof shortLink === "string" && shortLink.length > 0 ? shortLink : null;
}

export type DadosProdutoShopee = { nome: string; preco: number | null; imagem: string | null };

/**
 * Busca nome/preço/imagem reais do produto na API oficial (query
 * `productOfferV2`, filtrada por itemId+shopId -- únicos parâmetros que
 * garantem "esse produto exato", não uma busca por palavra-chave). É a
 * fonte de dado mais confiável que existe hoje (nenhuma outra loja
 * integrada tem API equivalente) -- por isso o valor daqui tem prioridade
 * sobre o scraping/preenchimento manual sempre que a chamada funciona.
 * Mesma garantia de "nunca lança" do converterLinkShopee acima: qualquer
 * falha (rede, timeout, produto não encontrado, resposta malformada)
 * devolve null, nunca derruba quem chamou.
 */
export async function buscarProdutoShopeeV2(
  itemId: string,
  shopId: string,
  credenciais: CredenciaisShopee,
  fetchImpl: typeof fetch = fetch,
): Promise<DadosProdutoShopee | null> {
  const payload = JSON.stringify({
    query: `query { productOfferV2(itemId: ${JSON.stringify(itemId)}, shopId: ${JSON.stringify(shopId)}) { nodes { productName priceMin imageUrl } } }`,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = assinar(credenciais.appId, timestamp, payload, credenciais.appSecret);

  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${credenciais.appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const node = json?.data?.productOfferV2?.nodes?.[0];
  if (!node || typeof node.productName !== "string") return null;

  const preco = Number(node.priceMin);

  return {
    nome: node.productName,
    preco: Number.isFinite(preco) ? preco : null,
    imagem: typeof node.imageUrl === "string" ? node.imageUrl : null,
  };
}

/**
 * Ponto de entrada usado pela busca automática (onBlur) e pelo salvar de
 * verdade: recebe o link exatamente como o criador colou (pode ser um link
 * curto de compartilhamento, "s.shopee.com.br") e devolve o dado real do
 * produto, ou null se não for possível (loja não é Shopee só não é chamada
 * por quem usa essa função; falha de rede; item não encontrado etc.).
 * Tenta extrair itemId/shopId direto da URL primeiro (caminho comum, sem
 * gastar uma requisição) -- só resolve o redirect via fetchSeguro (mesma
 * allowlist/SSRF guard usada pro scraping) quando a URL colada for curta.
 */
export async function buscarDadosProdutoShopeePeloLink(
  urlOriginal: string,
  credenciais: CredenciaisShopee,
): Promise<DadosProdutoShopee | null> {
  let ids = extrairIdsProdutoShopee(urlOriginal);

  if (!ids) {
    const res = await fetchSeguro(urlOriginal);
    if (!res) return null;
    ids = extrairIdsProdutoShopee(res.url);
    if (!ids) return null;
  }

  return buscarProdutoShopeeV2(ids.itemId, ids.shopId, credenciais);
}
