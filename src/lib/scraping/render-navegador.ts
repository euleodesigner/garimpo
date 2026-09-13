import type { Browser } from "playwright-core";
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
 *
 * Limitação conhecida (mesma da função `baixarImagemExterna`, não é uma
 * regressão introduzida aqui): a checagem de IP privado resolve o DNS uma
 * vez, mas quem faz a conexão de verdade depois é o Chromium, com a própria
 * resolução -- em teoria um domínio malicioso com TTL bem curto poderia
 * "trocar" de IP entre as duas resoluções (DNS rebinding). Bloquear isso de
 * verdade exigiria fixar o IP resolvido na conexão real, o que o Playwright
 * não expõe de forma simples por requisição.
 */
export async function renderizarEExtrairDados(url: string): Promise<DadosExtraidos | null> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (!executablePath) return null;

  let browser: Browser | null = null;
  try {
    // Import dinâmico (não no topo do arquivo) de propósito: se o pacote
    // falhar ao carregar por qualquer motivo no ambiente de produção (ex.:
    // biblioteca do sistema faltando), isso NÃO pode derrubar a Server
    // Action inteira (`buscarDadosProduto`) pra QUALQUER link -- só essa
    // tentativa específica de plano B falha, silenciosamente, aqui dentro
    // do try/catch.
    const { chromium } = await import("playwright-core");
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
    // "networkidle" quase nunca dispara em SPA de loja grande (analytics/
    // tracking em segundo plano mantêm a rede "ocupada" pra sempre) --
    // sempre estourava os 4s de timeout nessas páginas, exatamente o caso
    // que esse plano B deveria cobrir. "domcontentloaded" dá o HTML inicial
    // (onde JSON-LD/tags og: costumam já estar) sem depender da rede nunca
    // silenciar de vez.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });

    if (!hostnamePermitido(new URL(page.url()).hostname)) return null;

    const html = await page.content();
    return extrairDadosDeHtmlRenderizado(html);
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
