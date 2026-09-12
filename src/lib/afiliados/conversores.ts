/** Anexa um parâmetro de query (ex.: tag de afiliado) na URL original. */
export function converterTagUrl(urlOriginal: string, paramNome: string, valor: string): string {
  const url = new URL(urlOriginal);
  url.searchParams.set(paramNome, valor);
  return url.toString();
}

/** Deep link padrão da rede Awin -- redireciona pelo domínio deles, sem precisar de API/secret. */
export function converterAwinDeepLink(
  urlOriginal: string,
  publisherId: string,
  merchantId: string,
): string {
  const params = new URLSearchParams({
    awinmid: merchantId,
    awinaffid: publisherId,
    clickref: "",
    p: urlOriginal,
  });
  return `https://www.awin1.com/cread.php?${params.toString()}`;
}
