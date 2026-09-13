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
      // schema.org permite "@type" como string única OU lista de tipos
      // (ex.: ["Product", "IndividualProduct"]) -- aceitar só a string exata
      // deixava passar batido um formato válido e comum.
      const tipo = obj["@type"];
      const ehProduto = tipo === "Product" || (Array.isArray(tipo) && tipo.includes("Product"));
      if (!ehProduto) continue;

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

/**
 * Último recurso: acha um valor em "R$ 1.234,56" solto no texto visível da
 * página. Pega a ÚLTIMA ocorrência, não a primeira -- padrão comum de
 * promoção é "De R$ 200,00 por R$ 99,99", onde o primeiro valor é o preço
 * riscado (o de antes do desconto), não o que o convidado paga de verdade.
 */
function extrairPrecoDoTexto($: cheerio.CheerioAPI): number | null {
  const texto = $("body").text();
  const matches = [...texto.matchAll(/R\$\s*([\d.]+,\d{2})/g)];
  if (!matches.length) return null;
  const ultimo = matches[matches.length - 1][1];
  const numero = Number(ultimo.replace(/\./g, "").replace(",", "."));
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
