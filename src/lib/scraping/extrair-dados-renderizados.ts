import * as cheerio from "cheerio";

export type DadosExtraidos = { titulo: string | null; imagem: string | null; preco: number | null };

function paraNumero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const n = Number(valor.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Procura, entre os blocos `<script type="application/ld+json">` da página,
 * um objeto com `@type: "Product"` (schema.org) -- muitas lojas grandes
 * incluem isso mesmo em páginas montadas por JavaScript, porque é o jeito
 * padrão de ajudar buscadores a entender o produto. Quando existe, é a
 * fonte mais confiável (nome/imagem/preço estruturados, não texto solto).
 */
function extrairDeJsonLd($: cheerio.CheerioAPI): DadosExtraidos | null {
  const blocos = $('script[type="application/ld+json"]');
  for (const el of blocos.toArray()) {
    const texto = $(el).contents().text();
    let dado: unknown;
    try {
      dado = JSON.parse(texto);
    } catch {
      continue;
    }
    const candidatos = Array.isArray(dado) ? dado : [dado];
    for (const item of candidatos) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      if (obj["@type"] !== "Product") continue;

      const nome = typeof obj.name === "string" ? obj.name : null;
      const imagem = typeof obj.image === "string" ? obj.image : Array.isArray(obj.image) ? obj.image[0] : null;
      const offers = obj.offers as Record<string, unknown> | undefined;
      const preco = offers ? paraNumero(offers.price) : null;

      if (nome || imagem || preco != null) {
        return { titulo: nome, imagem: imagem ?? null, preco };
      }
    }
  }
  return null;
}

function extrairDeMetaTags($: cheerio.CheerioAPI): DadosExtraidos | null {
  const titulo = $('meta[property="og:title"]').attr("content")?.trim() || null;
  const imagem = $('meta[property="og:image"]').attr("content")?.trim() || null;
  if (!titulo && !imagem) return null;
  return { titulo, imagem, preco: null };
}

/** Último recurso: acha um valor em "R$ 1.234,56" solto no texto visível da página. */
function extrairPrecoDoTexto($: cheerio.CheerioAPI): number | null {
  const texto = $("body").text();
  const match = texto.match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) return null;
  const numero = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Recebe o HTML já renderizado (depois do navegador headless executar o
 * JavaScript da página) e tenta achar nome/imagem/preço, nessa ordem de
 * confiança: JSON-LD (schema.org Product) -> tags og: -> preço solto no
 * texto. Nunca lança; devolve null quando não encontrou nada útil.
 */
export function extrairDadosDeHtmlRenderizado(html: string): DadosExtraidos | null {
  const $ = cheerio.load(html);

  const doJsonLd = extrairDeJsonLd($);
  const doMeta = extrairDeMetaTags($);

  const titulo = doJsonLd?.titulo ?? doMeta?.titulo ?? null;
  const imagem = doJsonLd?.imagem ?? doMeta?.imagem ?? null;
  const preco = doJsonLd?.preco ?? extrairPrecoDoTexto($);

  if (!titulo && !imagem && preco == null) return null;
  return { titulo, imagem, preco };
}
