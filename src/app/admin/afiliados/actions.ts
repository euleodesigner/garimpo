"use server";

import { revalidatePath } from "next/cache";
import { exigirOwner } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { lojaPorId, type LojaConfig } from "@/lib/afiliados/lojas";
import { converterLinkShopee } from "@/lib/shopee-afiliado";
import type { MarketplaceSlug } from "@/lib/marketplace";

type State = { erro?: string; ok?: boolean } | undefined;

// Link real de um produto Shopee só pra exercitar a assinatura/credencial --
// não precisa ser um produto específico "certo", a API responde com erro de
// credencial mesmo pra um product id inexistente se App ID/Secret baterem.
const LINK_TESTE_SHOPEE = "https://shopee.com.br/product/7398215/1";

async function testarCredencial(
  loja: LojaConfig,
  identificador: string,
  identificador2: string,
  secret: string | null,
): Promise<{ ok: boolean; erro?: string }> {
  switch (loja.tipo) {
    case "shopee": {
      if (!identificador || !secret) {
        return { ok: false, erro: "Preencha o App ID e o App Secret." };
      }
      const resultado = await converterLinkShopee(LINK_TESTE_SHOPEE, {
        appId: identificador,
        appSecret: secret,
      });
      return resultado
        ? { ok: true }
        : {
            ok: false,
            erro: "A Shopee recusou a credencial (App ID/Secret inválidos, expirados, ou fora do ar).",
          };
    }
    case "tag_url": {
      if (!identificador) return { ok: false, erro: "Preencha a tag de afiliado." };
      if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(identificador)) {
        return { ok: false, erro: "Formato de tag parece inválido (use só letras, números, - e .)." };
      }
      return { ok: true };
    }
    case "awin": {
      if (!identificador || !identificador2) {
        return { ok: false, erro: "Preencha o Publisher ID e o Merchant ID." };
      }
      if (!/^\d+$/.test(identificador) || !/^\d+$/.test(identificador2)) {
        return {
          ok: false,
          erro: "Publisher ID e Merchant ID da Awin costumam ser só números -- confira os valores.",
        };
      }
      return { ok: true };
    }
    case "manual":
      return { ok: false, erro: "Conversão automática ainda não implementada para esta loja." };
  }
}

export async function salvarCredencialLoja(
  lojaId: MarketplaceSlug,
  _prev: State,
  formData: FormData,
): Promise<State> {
  await exigirOwner();

  const loja = lojaPorId(lojaId);
  if (!loja) return { erro: "Loja desconhecida." };

  const identificador = String(formData.get("identificador") ?? "").trim();
  const identificador2 = String(formData.get("identificador2") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const habilitado = formData.get("habilitado") === "on";
  const limpar = formData.get("limpar") === "on";

  const admin = createAdminClient();

  if (limpar) {
    const { error } = await admin.rpc("admin_salvar_credencial_loja", {
      p_loja: lojaId,
      p_habilitado: false,
      p_identificador: null,
      p_identificador2: null,
      p_limpar_secret: true,
    });
    if (error) return { erro: "Não foi possível remover." };
    await admin.rpc("admin_registrar_teste_credencial", { p_loja: lojaId, p_ok: null, p_erro: null });
    revalidatePath("/admin/afiliados");
    return { ok: true };
  }

  const { error } = await admin.rpc("admin_salvar_credencial_loja", {
    p_loja: lojaId,
    p_habilitado: habilitado,
    p_identificador: identificador || null,
    p_identificador2: identificador2 || null,
    p_secret: secret || null,
  });
  if (error) return { erro: "Não foi possível salvar." };

  if (!habilitado) {
    // desligado de propósito -- não faz sentido mostrar vermelho de algo
    // que não está em uso.
    await admin.rpc("admin_registrar_teste_credencial", { p_loja: lojaId, p_ok: null, p_erro: null });
    revalidatePath("/admin/afiliados");
    return { ok: true };
  }

  // Pra testar de verdade precisa do secret atual -- se o campo veio em
  // branco (convenção "deixe em branco pra manter o já salvo"), busca o que
  // já está no Vault em vez de reprovar por engano.
  let secretParaTeste = secret || null;
  if (loja.temSecret && !secretParaTeste) {
    const { data: credAtual } = await admin
      .rpc("admin_ler_credencial_loja", { p_loja: lojaId })
      .maybeSingle<{ identificador: string | null; identificador2: string | null; secret: string | null }>();
    secretParaTeste = credAtual?.secret ?? null;
  }

  // Testa de verdade na hora (feedback visual de status pede isso -- círculo
  // verde só quando funciona de fato, vermelho com o motivo quando não).
  const resultadoTeste = await testarCredencial(loja, identificador, identificador2, secretParaTeste);
  await admin.rpc("admin_registrar_teste_credencial", {
    p_loja: lojaId,
    p_ok: resultadoTeste.ok,
    p_erro: resultadoTeste.erro ?? null,
  });

  revalidatePath("/admin/afiliados");
  return { ok: true };
}
