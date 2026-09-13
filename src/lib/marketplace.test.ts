import { describe, expect, test } from "vitest";
import { detectarMarketplace, hostnamePermitido, urlDeLojaSuportada } from "./marketplace";

describe("detectarMarketplace", () => {
  test("reconhece link curto oficial da Shopee (br.shp.ee) gerado pelo botão compartilhar", () => {
    expect(detectarMarketplace("https://br.shp.ee/5Towb25R")).toBe("shopee");
  });

  test("reconhece link completo de produto da Shopee", () => {
    expect(detectarMarketplace("https://shopee.com.br/produto-i.123.456")).toBe("shopee");
  });

  test("link de loja não suportada devolve null", () => {
    expect(detectarMarketplace("https://exemplo.com/produto")).toBeNull();
  });
});

describe("hostnamePermitido", () => {
  test("permite o domínio de link curto da Shopee (necessário pro fetchSeguro seguir o redirect)", () => {
    expect(hostnamePermitido("br.shp.ee")).toBe(true);
  });
});

describe("urlDeLojaSuportada", () => {
  test("aceita link curto shp.ee", () => {
    expect(urlDeLojaSuportada("https://br.shp.ee/5Towb25R")).toBe(true);
  });
});
