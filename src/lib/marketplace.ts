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
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

function pareceHostPrivado(hostname: string): boolean {
  return PADROES_HOST_PRIVADO.some((p) => p.test(hostname));
}

/**
 * Baixa uma imagem de uma URL externa (o og:image extraído de uma página já
 * validada pela allowlist acima) para reupload no nosso Storage -- nunca
 * hotlink direto (muitas lojas bloqueiam embed cross-origin, e manter tudo
 * no nosso bucket é consistente com o resto do app). Não é a mesma allowlist
 * de marketplace (CDN de imagem costuma ser um domínio totalmente diferente
 * da loja), mas recusa hosts que parecem apontar pra rede interna -- defesa
 * razoável dado que a URL já veio do conteúdo de uma página confiável, não
 * de entrada direta do creator.
 */
export async function baixarImagemExterna(
  url: string,
  limiteBytes = 5 * 1024 * 1024,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (pareceHostPrivado(parsed.hostname)) return null;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > limiteBytes) return null;

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (buffer.byteLength > limiteBytes) return null;

  return { bytes: buffer, contentType };
}
