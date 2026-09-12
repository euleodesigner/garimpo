import { describe, expect, test } from "vitest";
import { escolherDadosProduto } from "./afiliacao";

describe("escolherDadosProduto", () => {
  test("sem dado da Shopee, mantém nome e preço que vieram do formulário", () => {
    const resultado = escolherDadosProduto({ nome: "Fone genérico", preco: 49.9 }, null);
    expect(resultado).toEqual({ nome: "Fone genérico", preco: 49.9 });
  });

  test("com dado da Shopee, o nome da API sempre prevalece sobre o do formulário", () => {
    const resultado = escolherDadosProduto(
      { nome: "Nome digitado pelo criador", preco: 49.9 },
      { nome: "Nome oficial da Shopee", preco: 39.9, imagem: null },
    );
    expect(resultado.nome).toBe("Nome oficial da Shopee");
  });

  test("com dado da Shopee, o preço da API sempre prevalece sobre o do formulário", () => {
    const resultado = escolherDadosProduto(
      { nome: "Qualquer", preco: 100 },
      { nome: "Qualquer", preco: 39.9, imagem: null },
    );
    expect(resultado.preco).toBe(39.9);
  });

  test("se a Shopee respondeu mas sem preço, mantém o preço do formulário", () => {
    const resultado = escolherDadosProduto(
      { nome: "Qualquer", preco: 100 },
      { nome: "Nome da Shopee", preco: null, imagem: null },
    );
    expect(resultado.preco).toBe(100);
  });
});
