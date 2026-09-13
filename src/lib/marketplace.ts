import { lookup } from "node:dns/promises";

// Detecção de loja por domínio + fetch seguro (spec §8). A allowlist é
// também o gate de segurança do fetch, não só roteamento: sem ela, o campo
// de link vira um SSRF -- o creator (menor privilégio do sistema) poderia
// colar uma URL apontando pra dentro da rede interna. Por isso o hostname é
// checado ANTES de qualquer fetch, inclusive a cada hop de redirect.
//
// O mesmo mapa também alimenta detectarMarketplace() (usado pela conversão
// de afiliado, §7.4/§8) -- domínio permitido e marketplace detectado são a
// mesma pergunta ("essa URL é de uma loja que reconhecemos?"), então ficam
// numa fonte só pra não haver duas listas de domínio divergindo com o tempo.
export type MarketplaceSlug = "shopee" | "shein" | "temu" | "magalu" | "amazon" | "mercado_livre";

const MARKETPLACE_POR_DOMINIO: Record<string, MarketplaceSlug> = {
  "shopee.com.br": "shopee",
  "shopee.com": "shopee",
  // domínio oficial de link curto da Shopee (o que o botão "compartilhar" do
  // app gera, ex. "br.shp.ee/xxxx") -- forma mais comum de um creator colar
  // um link de verdade, e a API oficial de afiliados aceita esse link direto
  // como originUrl (confirmado contra a API real), então não precisa
  // resolver o redirect antes de converter, só reconhecer o domínio aqui.
  "shp.ee": "shopee",
  "shein.com": "shein",
  "shein.com.br": "shein",
  "temu.com": "temu",
  "magazineluiza.com.br": "magalu",
  "magalu.com": "magalu",
  "amazon.com.br": "amazon",
  "amazon.com": "amazon",
  "amzn.to": "amazon",
  "mercadolivre.com.br": "mercado_livre",
  "mercadolibre.com": "mercado_livre",
};

export function hostnamePermitido(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return Object.keys(MARKETPLACE_POR_DOMINIO).some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Devolve o marketplace detectado pelo hostname da URL, ou null se não é uma
 * loja reconhecida. Não faz nenhum request de rede -- só parsing de URL --
 * então pode ser chamada com segurança a partir de qualquer Server Action,
 * sem risco de SSRF (quem faz request de verdade é fetchSeguro, abaixo, que
 * já valida a allowlist antes de qualquer fetch).
 */
export function detectarMarketplace(url: string): MarketplaceSlug | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [dominio, slug] of Object.entries(MARKETPLACE_POR_DOMINIO)) {
    if (hostname === dominio || hostname.endsWith(`.${dominio}`)) return slug;
  }
  return null;
}

export function urlDeLojaSuportada(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && hostnamePermitido(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Busca uma URL só se o hostname (e o de cada redirect subsequente) bater
 * com a allowlist -- nunca segue redirect automaticamente sem checar o
 * destino primeiro (spec §8: "o hostname final (pós-redirect) também
 * precisa bater com a allowlist antes do cheerio processar o corpo").
 */
export async function fetchSeguro(urlInicial: string, maxRedirects = 5): Promise<Response | null> {
  let atual = urlInicial;

  for (let i = 0; i <= maxRedirects; i++) {
    let parsed: URL;
    try {
      parsed = new URL(atual);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!hostnamePermitido(parsed.hostname)) return null;

    let res: Response;
    try {
      res = await fetch(atual, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ListaGarimpoBot/1.0)" },
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      try {
        atual = new URL(location, atual).toString();
      } catch {
        return null;
      }
      continue;
    }

    return res;
  }

  return null;
}

const PADROES_HOST_PRIVADO = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /^\[?::ffff:/i,
  /^\[?::\]?$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function pareceHostPrivado(hostname: string): boolean {
  return PADROES_HOST_PRIVADO.some((p) => p.test(hostname));
}

/**
 * Verifica se o hostname resolve (via DNS de verdade, não só regex sobre o
 * texto) para algum IP privado/loopback/link-local. Complementa
 * pareceHostPrivado(): aquela pega o caso óbvio (hostname já É um IP
 * privado, ex. "127.0.0.1"); esta pega o caso que o regex sozinho não cobre
 * -- um hostname PÚBLICO cujo registro DNS aponta pra dentro da rede
 * (DNS rebinding, ou só um domínio configurado assim de propósito). Falha
 * de resolução (host inexistente etc.) é tratada como privado -- nega por
 * padrão, já que o fetch adiante ia falhar de qualquer forma.
 */
export async function enderecoResolvidoEhPrivado(hostname: string): Promise<boolean> {
  if (pareceHostPrivado(hostname)) return true;

  let enderecos: { address: string }[];
  try {
    enderecos = await lookup(hostname, { all: true });
  } catch {
    return true;
  }

  return enderecos.some((e) => pareceHostPrivado(e.address));
}

/**
 * Baixa uma imagem de uma URL externa (o og:image extraído de uma página já
 * validada pela allowlist acima) para reupload no nosso Storage -- nunca
 * hotlink direto (muitas lojas bloqueiam embed cross-origin, e manter tudo
 * no nosso bucket é consistente com o resto do app). Não é a mesma allowlist
 * de marketplace (CDN de imagem costuma ser um domínio totalmente diferente
 * da loja) -- em vez disso, resolve o hostname de verdade (DNS) e recusa
 * qualquer IP privado/loopback/link-local, a cada hop de redirect (nunca
 * segue redirect automaticamente sem essa checagem de novo -- mesma lógica
 * de fetchSeguro, agora aplicada ao IP resolvido, não só ao hostname).
 */
export async function baixarImagemExterna(
  urlInicial: string,
  limiteBytes = 5 * 1024 * 1024,
  maxRedirects = 5,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  let atual = urlInicial;
  let res: Response | null = null;

  for (let i = 0; i <= maxRedirects; i++) {
    let parsed: URL;
    try {
      parsed = new URL(atual);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (await enderecoResolvidoEhPrivado(parsed.hostname)) return null;

    let hop: Response;
    try {
      hop = await fetch(atual, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    } catch {
      return null;
    }

    if (hop.status >= 300 && hop.status < 400) {
      const location = hop.headers.get("location");
      if (!location) return null;
      try {
        atual = new URL(location, atual).toString();
      } catch {
        return null;
      }
      continue;
    }

    res = hop;
    break;
  }

  if (!res || !res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > limiteBytes) return null;

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (buffer.byteLength > limiteBytes) return null;

  return { bytes: buffer, contentType };
}
