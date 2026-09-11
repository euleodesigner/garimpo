"use server";

import * as cheerio from "cheerio";
import { fetchSeguro, urlDeLojaSuportada } from "@/lib/marketplace";

export type DadosProduto = { titulo: string | null; imagem: string | null; preco: number | null };

// Busca automática de nome/imagem/preço ao sair do campo de link (spec §4,
// §8) -- nunca inclui qualquer campo de link (original ou convertido), só
// os três campos de exibição. A conversão de afiliado em si (que precisa
// das credenciais reais das lojas) fica pra quando essas credenciais
// existirem -- aqui só lemos og:title/og:image/preço público da página.
export async function buscarDadosProduto(url: string): Promise<DadosProduto | { erro: string }> {
  if (!url.trim()) return { erro: "Cole um link primeiro." };

  if (!urlDeLojaSuportada(url)) {
    // loja fora da allowlist -- não é erro, só não dá pra buscar
    // automaticamente; o formulário cai no preenchimento manual
    return { titulo: null, imagem: null, preco: null };
  }

  const res = await fetchSeguro(url);
  if (!res || !res.ok) {
    return { titulo: null, imagem: null, preco: null };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return { titulo: null, imagem: null, preco: null };
  }

  let html: string;
  try {
    html = await res.text();
  } catch {
    return { titulo: null, imagem: null, preco: null };
  }

  const $ = cheerio.load(html);
  const titulo =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    null;
  const imagem = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // preço não tem tag Open Graph amplamente suportada (spec §8) -- tenta as
  // variantes mais comuns, mas o fallback manual é esperado com frequência,
  // principalmente em SPAs (Shein/Temu) que só injetam o preço via JS
  const precoTexto =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[property="og:price:amount"]').attr("content") ||
    $('[itemprop="price"]').attr("content") ||
    null;
  const preco = precoTexto ? Number(precoTexto.replace(",", ".")) : null;

  return {
    titulo,
    imagem,
    preco: preco != null && !Number.isNaN(preco) ? preco : null,
  };
}
