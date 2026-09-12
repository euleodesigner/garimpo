import { detectarMarketplace, type MarketplaceSlug } from "./marketplace";
import { converterLinkShopee, type DadosProdutoShopee } from "./shopee-afiliado";
import { converterTagUrl, converterAwinDeepLink } from "./afiliados/conversores";

export type AfiliacaoStatus = "convertido" | "sem_api" | "sem_autorizacao" | "nao_aplicavel";

export type ResultadoAfiliacao = {
  marketplace: MarketplaceSlug | null;
  linkAfiliado: string | null;
  afiliacaoStatus: AfiliacaoStatus | null;
};

export type CredencialLoja = {
  identificador: string | null;
  identificador2: string | null;
  secret: string | null;
};

/**
 * Decide marketplace/link_afiliado/afiliacao_status pra um link colado pelo
 * creator (spec §7.4/§8). `carregarCredencial(loja)` é um loader preguiçoso
 * que só é chamado depois de detectar o marketplace, e devolve null se a
 * loja não está habilitada no painel admin (mesmo resultado de "sem
 * credencial configurada").
 *
 * Amazon: convertido sempre que a tag estiver configurada (decisão de
 * negócio explícita do dono -- ver aviso no painel admin sobre risco de
 * termos de uso). Sem tag: sem_autorizacao.
 * Mercado Livre: sem_api sempre -- não há mecanismo de conversão
 * implementado ainda (sem API pública documentada).
 * SHEIN/Temu/Magalu: convertido via deep link Awin quando publisher+merchant
 * ID estiverem configurados; sem_api caso contrário.
 * Shopee: sem_api se não há credencial; sem_autorizacao se a chamada à API
 * falhou; convertido se deu certo.
 */
export async function resolverAfiliacao(
  url: string,
  carregarCredencial: (loja: MarketplaceSlug) => Promise<CredencialLoja | null>,
  converterShopee: typeof converterLinkShopee = converterLinkShopee,
): Promise<ResultadoAfiliacao> {
  const marketplace = detectarMarketplace(url);
  if (!marketplace) {
    return { marketplace: null, linkAfiliado: null, afiliacaoStatus: null };
  }

  const cred = await carregarCredencial(marketplace);

  switch (marketplace) {
    case "shopee": {
      if (!cred?.identificador || !cred.secret) {
        return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
      }
      const linkAfiliado = await converterShopee(url, {
        appId: cred.identificador,
        appSecret: cred.secret,
      });
      return linkAfiliado
        ? { marketplace, linkAfiliado, afiliacaoStatus: "convertido" }
        : { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_autorizacao" };
    }

    case "amazon": {
      if (!cred?.identificador) {
        return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_autorizacao" };
      }
      return {
        marketplace,
        linkAfiliado: converterTagUrl(url, "tag", cred.identificador),
        afiliacaoStatus: "convertido",
      };
    }

    case "shein":
    case "temu":
    case "magalu": {
      if (!cred?.identificador || !cred.identificador2) {
        return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
      }
      return {
        marketplace,
        linkAfiliado: converterAwinDeepLink(url, cred.identificador, cred.identificador2),
        afiliacaoStatus: "convertido",
      };
    }

    case "mercado_livre":
      return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };

    default:
      return { marketplace, linkAfiliado: null, afiliacaoStatus: "nao_aplicavel" };
  }
}

/**
 * Decide o nome/preço finais de um produto na hora de salvar (§ "camada de
 * dados automáticos"). Hoje só a Shopee tem API oficial capaz de devolver
 * dado de produto pelo link exato -- nenhuma outra loja integrada oferece
 * isso. Por isso, quando `dadosShopee` existe, ele é a fonte de verdade: o
 * nome e o preço da API sempre prevalecem sobre o que veio do formulário
 * (preenchido automaticamente por scraping ou editado à mão pelo criador),
 * porque o objetivo é o card sempre refletir o preço real da loja. Preço
 * ausente na resposta da API (nunca acontece na prática, mas a API não dá
 * essa garantia) cai de volta pro valor do formulário.
 */
export function escolherDadosProduto(
  formulario: { nome: string; preco: number | null },
  dadosShopee: DadosProdutoShopee | null,
): { nome: string; preco: number | null } {
  if (!dadosShopee) return formulario;
  return {
    nome: dadosShopee.nome,
    preco: dadosShopee.preco ?? formulario.preco,
  };
}
