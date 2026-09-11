import { createHash } from "crypto";

// API oficial de afiliados da Shopee (GraphQL, região Brasil). Assinatura:
// SHA256(AppId + Timestamp(segundos) + Payload(JSON exato do body) + Secret),
// hex lowercase -- documentado em https://www.affiliateshopee.com.br/documentacao.
// Timeout curto (mesma lógica de fetchSeguro em marketplace.ts): a Server
// Action de salvar presente não pode travar esperando a Shopee responder.
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";
const TIMEOUT_MS = 5000;

export type CredenciaisShopee = { appId: string; appSecret: string };

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
