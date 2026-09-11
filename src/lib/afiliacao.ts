import { detectarMarketplace, type MarketplaceSlug } from "./marketplace";
import { converterLinkShopee, type CredenciaisShopee } from "./shopee-afiliado";

export type AfiliacaoStatus = "convertido" | "sem_api" | "sem_autorizacao" | "nao_aplicavel";

export type ResultadoAfiliacao = {
  marketplace: MarketplaceSlug | null;
  linkAfiliado: string | null;
  afiliacaoStatus: AfiliacaoStatus | null;
};

/**
 * Decide marketplace/link_afiliado/afiliacao_status pra um link colado pelo
 * creator (spec §7.4/§8/§11 Fase 4). `converter` é injetável só pra permitir
 * verificar esta função sem depender de rede real na Shopee -- em produção
 * sempre usa converterLinkShopee (valor default do parâmetro).
 *
 * Amazon/Mercado Livre: nao_aplicavel sempre -- sem programa de monetização
 * automática por decisão de negócio (§8), não é "falta de credencial".
 * Shein/Temu/Magalu: sem_api sempre nesta fase -- só a Shopee tem conversor
 * (roadmap Fase 4, §11: "começando por Shopee").
 * Shopee: sem_api se não há credencial configurada; sem_autorizacao se a
 * chamada à API falhou por qualquer motivo (credencial inválida, produto
 * não elegível, rate limit etc. -- a API não distingue essas causas de forma
 * confiável o bastante pra separar em mais estados); convertido se deu certo.
 */
export async function resolverAfiliacao(
  url: string,
  credenciaisShopee: CredenciaisShopee | null,
  converter: typeof converterLinkShopee = converterLinkShopee,
): Promise<ResultadoAfiliacao> {
  const marketplace = detectarMarketplace(url);

  if (marketplace === "amazon" || marketplace === "mercado_livre") {
    return { marketplace, linkAfiliado: null, afiliacaoStatus: "nao_aplicavel" };
  }

  if (marketplace === "shopee") {
    if (!credenciaisShopee) {
      return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
    }
    const linkAfiliado = await converter(url, credenciaisShopee);
    return linkAfiliado
      ? { marketplace, linkAfiliado, afiliacaoStatus: "convertido" }
      : { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_autorizacao" };
  }

  if (marketplace) {
    return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
  }

  return { marketplace: null, linkAfiliado: null, afiliacaoStatus: null };
}
