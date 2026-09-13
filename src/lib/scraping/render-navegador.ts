import { chromium } from "playwright-core";
import { hostnamePermitido, enderecoResolvidoEhPrivado } from "@/lib/marketplace";
import { extrairDadosDeHtmlRenderizado, type DadosExtraidos } from "./extrair-dados-renderizados";

const TIMEOUT_MS = 4000;

/**
 * Plano B da busca automática (§ camada de dados automáticos): só é chamado
 * quando o scraping simples (fetch + cheerio, sem executar JS) não achou
 * nada -- caso de lojas que montam a página inteira por JavaScript (Shopee,
 * SHEIN, Temu...). Abre um Chromium sem interface, renderiza a página de
 * verdade por até 4s, e reaproveita `extrairDadosDeHtmlRenderizado` pra ler
 * o resultado. Nunca lança: qualquer falha (sem Chromium instalado, timeout,
 * página bloqueou o robô, crash do navegador) devolve null e quem chamou
 * cai pro preenchimento manual, igual já acontece hoje.
 *
 * Segurança: a página abre com JavaScript de verdade, então pode tentar
 * fazer chamadas próprias (XHR/fetch) -- por isso TODA requisição que o
 * navegador faz (não só a navegação principal) é checada contra endereço
 * privado/interno antes de seguir, e o destino final da navegação (depois
 * de redirects) precisa continuar sendo uma das lojas conhecidas.
 */
export async function renderizarEExtrairDados(url: string): Promise<DadosExtraidos | null> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (!executablePath) return null;

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (compatible; ListaGarimpoBot/1.0)",
    });

    await context.route("**/*", async (route) => {
      let hostname: string;
      try {
        hostname = new URL(route.request().url()).hostname;
      } catch {
        await route.abort();
        return;
      }
      if (await enderecoResolvidoEhPrivado(hostname)) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: TIMEOUT_MS });

    if (!hostnamePermitido(new URL(page.url()).hostname)) return null;

    const html = await page.content();
    return extrairDadosDeHtmlRenderizado(html);
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
