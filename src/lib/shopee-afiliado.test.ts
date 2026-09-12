import { describe, expect, test, vi } from "vitest";
import { extrairIdsProdutoShopee, buscarProdutoShopeeV2 } from "./shopee-afiliado";

describe("extrairIdsProdutoShopee", () => {
  test("extrai shopId e itemId de uma URL de produto padrão", () => {
    const url = "https://shopee.com.br/Fone-de-ouvido-bluetooth-i.123456789.987654321";
    expect(extrairIdsProdutoShopee(url)).toEqual({ shopId: "123456789", itemId: "987654321" });
  });

  test("extrai ids mesmo com query string no final (ex.: parâmetros de tracking)", () => {
    const url = "https://shopee.com.br/Produto-i.111.222?sp_atk=abc&xptdk=def";
    expect(extrairIdsProdutoShopee(url)).toEqual({ shopId: "111", itemId: "222" });
  });

  test("devolve null para uma URL da Shopee sem o padrão -i.<shopId>.<itemId>", () => {
    const url = "https://shopee.com.br/busca?keyword=fone";
    expect(extrairIdsProdutoShopee(url)).toBeNull();
  });

  test("devolve null para URL inválida", () => {
    expect(extrairIdsProdutoShopee("não é uma url")).toBeNull();
  });
});

describe("buscarProdutoShopeeV2", () => {
  const credenciais = { appId: "app-teste", appSecret: "segredo-teste" };

  test("devolve nome/preço/imagem do produto quando a API responde com sucesso", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          productOfferV2: {
            nodes: [
              {
                productName: "Fone de ouvido bluetooth",
                priceMin: "89.90",
                imageUrl: "https://cf.shopee.com.br/file/abc123",
              },
            ],
          },
        },
      }),
    });

    const resultado = await buscarProdutoShopeeV2("222", "111", credenciais, fetchFalso as unknown as typeof fetch);

    expect(resultado).toEqual({
      nome: "Fone de ouvido bluetooth",
      preco: 89.9,
      imagem: "https://cf.shopee.com.br/file/abc123",
    });
  });

  test("devolve null quando a API não encontra o produto (lista vazia)", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { productOfferV2: { nodes: [] } } }),
    });

    const resultado = await buscarProdutoShopeeV2("222", "111", credenciais, fetchFalso as unknown as typeof fetch);
    expect(resultado).toBeNull();
  });

  test("devolve null quando a resposta HTTP não é ok", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const resultado = await buscarProdutoShopeeV2("222", "111", credenciais, fetchFalso as unknown as typeof fetch);
    expect(resultado).toBeNull();
  });

  test("devolve null (nunca lança) quando o fetch falha por rede/timeout", async () => {
    const fetchFalso = vi.fn().mockRejectedValue(new Error("timeout"));
    const resultado = await buscarProdutoShopeeV2("222", "111", credenciais, fetchFalso as unknown as typeof fetch);
    expect(resultado).toBeNull();
  });
});
