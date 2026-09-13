import { describe, expect, test } from "vitest";
import { extrairDadosDeHtmlRenderizado } from "./extrair-dados-renderizados";

describe("extrairDadosDeHtmlRenderizado", () => {
  test("extrai nome/imagem/preço de um bloco JSON-LD de Product (fonte mais confiável)", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org/","@type":"Product","name":"Fone bluetooth XYZ",
           "image":"https://cdn.loja.com/fone.jpg",
           "offers":{"@type":"Offer","price":"89.90","priceCurrency":"BRL"}}
        </script>
      </head><body></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)).toEqual({
      titulo: "Fone bluetooth XYZ",
      imagem: "https://cdn.loja.com/fone.jpg",
      preco: 89.9,
    });
  });

  test("cai pras tags og: quando não há JSON-LD", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Camiseta Polo" />
        <meta property="og:image" content="https://cdn.loja.com/camiseta.jpg" />
      </head><body></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)).toEqual({
      titulo: "Camiseta Polo",
      imagem: "https://cdn.loja.com/camiseta.jpg",
      preco: null,
    });
  });

  test("tenta reconhecer um preço em R$ no texto visível quando não achou em nenhum outro lugar", () => {
    const html = `
      <html><head><meta property="og:title" content="Produto qualquer" /></head>
      <body><div class="preco-final">R$ 129,90</div></body></html>
    `;
    const resultado = extrairDadosDeHtmlRenderizado(html);
    expect(resultado?.preco).toBe(129.9);
  });

  test("prefere o preço do JSON-LD mesmo se também houver um preço solto no texto", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Product","name":"Produto","offers":{"price":"50.00"}}
        </script>
      </head><body><div>De R$ 200,00 por R$ 999,99</div></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)?.preco).toBe(50);
  });

  test("devolve null quando não encontra nome nem imagem em lugar nenhum", () => {
    const html = `<html><head></head><body><div>Página sem nada útil</div></body></html>`;
    expect(extrairDadosDeHtmlRenderizado(html)).toBeNull();
  });

  test("não quebra com JSON-LD malformado -- cai pro og: normalmente", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ isso não é json válido </script>
        <meta property="og:title" content="Produto via og" />
      </head><body></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)?.titulo).toBe("Produto via og");
  });

  test("JSON-LD com @type como lista (ex.: [\"Product\", \"IndividualProduct\"]) ainda é reconhecido", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@type":["Product","IndividualProduct"],"name":"Produto com tipos múltiplos","offers":{"price":"25"}}</script>
      </head><body></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)?.titulo).toBe("Produto com tipos múltiplos");
  });

  test("preço 'De R$ 200,00 por R$ 99,99' no texto -- pega o preço final (por), não o riscado (de)", () => {
    const html = `
      <html><head><meta property="og:title" content="Produto em promoção" /></head>
      <body><div>De R$ 200,00 por R$ 99,99</div></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)?.preco).toBe(99.99);
  });

  test("JSON-LD pode vir como lista de blocos -- acha o do tipo Product entre outros", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>
        <script type="application/ld+json">{"@type":"Product","name":"Achado entre outros","offers":{"price":"10"}}</script>
      </head><body></body></html>
    `;
    expect(extrairDadosDeHtmlRenderizado(html)?.titulo).toBe("Achado entre outros");
  });
});
