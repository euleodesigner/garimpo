# Fase 4 (restante) — Conversor de Afiliação Shopee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao criador salvar um presente com link da Shopee, o sistema converte o link em link de afiliado do dono da plataforma automaticamente (quando as credenciais existirem) e, para lojas sem conversão automática nesta fase, oferece ao criador um atalho de WhatsApp para pedir um link com desconto — sem nunca expor link de afiliado, marketplace detectado ou status de afiliação ao creator ou ao guest.

**Architecture:** Duas funções Postgres `SECURITY DEFINER` (schema `private`) dão à Server Action de salvar presente acesso só-leitura às credenciais da Shopee (guardadas em `admin_config` + Supabase Vault), sem exigir `SUPABASE_SERVICE_ROLE_KEY` na aplicação — mesmo padrão já usado por `get_redirect_link()` e `is_owner()` neste projeto. A lógica de detecção de loja e decisão de status de afiliação fica em módulos puros e testáveis (`src/lib/marketplace.ts`, `src/lib/afiliacao.ts`), sem I/O direto, para poder ser verificada sem precisar de banco nem da API real da Shopee. A chamada HTTP para a Shopee fica isolada em `src/lib/shopee-afiliado.ts`. Tudo roda só dentro das Server Actions já existentes (`adicionarPresente`, `buscarDadosProduto`) — nenhum código novo de client component fala com banco, Vault ou API de loja.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Supabase (Postgres + RLS + Vault), módulo `crypto` nativo do Node para a assinatura HMAC da API da Shopee — sem dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-09-lista-garimpo-design.md` (seções relevantes: §2 Regras Invioláveis #1/#2/#4/#5, §7.4 "Onde moram os segredos de afiliação", §8 "Camada de afiliação (server-side)", §11 roadmap Fase 4/5).

**Estado atual confirmado nesta sessão (via MCP do Supabase, projeto `garimpo` / `wlqpbqpjxnszwmjvfmfs`):**
- A tabela `admin_config` e as colunas `products.link_afiliado` / `products.marketplace` / `products.afiliacao_status` **já existem no banco** (de uma fase anterior), com RLS (`admin_config_all_owner`, restrita a `private.is_owner()`) e o `check` de `afiliacao_status` já aceitando `'convertido' | 'sem_api' | 'sem_autorizacao' | 'nao_aplicavel'`.
- `admin_config` tem `shopee_app_id` (texto) e `shopee_app_secret_vault_id` (uuid, aponta pra `vault.decrypted_secrets`) — ainda ambos `null`, nenhuma credencial configurada.
- A view `banner_publico` já expõe `whatsapp_numero` de `admin_config` para `anon`/`authenticated` (é assim que a página pública vai ler o número sem RLS bloquear — mas essa view hoje só é consultada com `select` parcial na página pública; este plano usa a mesma view a partir do fluxo do creator).
- Nada do lado da aplicação usa essas colunas ainda: `adicionarPresente` sempre insere `link_afiliado`/`marketplace`/`afiliacao_status` implicitamente como `null` (não estão no payload do insert).
- `src/lib/marketplace.ts` já tem a allowlist de domínios (`DOMINIOS_PERMITIDOS`) e `fetchSeguro`/`baixarImagemExterna`, usados pela busca automática (Fase 4 adiantada, já funcionando). Este plano reaproveita e estende esse arquivo.

## Global Constraints

- Link de afiliado nunca é exposto ao creator nem ao guest em nenhuma tela/API/JSON (Regra Inviolável #1, spec §2).
- Nenhuma informação de afiliação, comissão, marketplace detectado ou status de afiliação aparece para creator ou guest — nem como texto, nem como nome de campo no payload que o client recebe (Regra Inviolável #2, spec §2).
- Credenciais e segredos nunca vão para código-fonte nem Git — ficam em `admin_config` (identificador público) ou Supabase Vault (segredo de fato), nunca coluna de texto puro (Regra Inviolável #4, §7.4).
- Toda lógica de afiliação roda só em Server Action ou Route Handler, nunca em client component (Regra Inviolável #5, §2).
- A conversão de afiliado só acontece no momento de salvar (clique em "Salvar presente"), lendo o link direto do formulário nesse instante — nunca reaproveitando um valor computado durante o `onBlur` (§7.4).
- Sem biblioteca nova para a assinatura HTTP/HMAC — usar `crypto` nativo do Node (spec §3, "sem bibliotecas pesadas sem necessidade").
- Owner nunca é checado (`is_owner()`) no caminho de conversão — quem aciona é o creator, que nunca é dono da plataforma (§7.4).

---

## File Structure

- Create: `src/lib/shopee-afiliado.ts` — assinatura HMAC + chamada HTTP pra API oficial de afiliados da Shopee. Só I/O de rede, sem tocar banco.
- Modify: `src/lib/marketplace.ts` — adiciona `MarketplaceSlug` e `detectarMarketplace()`; refatora `DOMINIOS_PERMITIDOS` pra derivar do mesmo mapa (sem duas listas de domínio divergindo).
- Create: `src/lib/afiliacao.ts` — `resolverAfiliacao()`, função pura que decide `marketplace`/`link_afiliado`/`afiliacao_status` a partir da URL e das credenciais (recebe o conversor Shopee por parâmetro, injetável — testável sem rede nem banco).
- Modify: `src/app/(dashboard)/listas/[id]/presentes/actions.ts` — `adicionarPresente` passa a ler as credenciais via RPC, chamar `resolverAfiliacao()` e gravar `marketplace`/`link_afiliado`/`afiliacao_status` no insert.
- Modify: `src/app/(dashboard)/listas/[id]/presentes/buscar-dados-action.ts` — `buscarDadosProduto` passa a devolver também `ofertaWhatsapp: { numero: string } | null` (nunca o marketplace, nunca o status — só o sinal "oferece o atalho" + o número).
- Modify: `src/app/(dashboard)/listas/[id]/presentes/add-presente-modal.tsx` — mostra o popup de WhatsApp quando `ofertaWhatsapp` vier preenchido do `onBlur`.
- Migration no Supabase (projeto `garimpo`, via MCP `apply_migration`, sem arquivo local — mesmo padrão de provisionamento direto já usado no Task 4 do plano da Fase 0): funções `private.credenciais_shopee()` e `private.shopee_configurado()`.

---

### Task 1: Funções SQL para ler credenciais da Shopee sem `is_owner()`

**Files:**
- Nenhum arquivo local — aplicado direto no projeto Supabase `garimpo` (`wlqpbqpjxnszwmjvfmfs`) via ferramenta MCP `apply_migration`.

**Interfaces:**
- Produces: `private.credenciais_shopee()` — `returns table(app_id text, app_secret text)`, `security definer`, concedida a `authenticated` (sem checar `is_owner()`, por design — §7.4). `private.shopee_configurado()` — `returns boolean`, mesma concessão, usada só para decidir se mostra o popup de WhatsApp, nunca vaza a credencial em si.
- Consumes (Task 3 e 4 chamam via `supabase.rpc(...)`): `supabase.rpc("credenciais_shopee")` devolve `{ data: { app_id: string | null; app_secret: string | null } | null }`; `supabase.rpc("shopee_configurado")` devolve `{ data: boolean | null }`.

- [ ] **Step 1: Aplicar a migration via MCP do Supabase**

Chamar a ferramenta MCP `apply_migration` do Supabase (`project_id: "wlqpbqpjxnszwmjvfmfs"`, `name: "credenciais_shopee_rpc"`) com esta query:

```sql
-- private.credenciais_shopee(): lê app_id + segredo decriptado do Vault para
-- a conversão de link da Shopee. NÃO checa private.is_owner() -- quem aciona
-- essa conversão é o creator ao salvar um presente, e o creator nunca é o
-- dono da plataforma (spec §7.4). SECURITY DEFINER porque authenticated não
-- tem select em admin_config (RLS restrita a is_owner()) nem em
-- vault.decrypted_secrets. LEFT JOIN garante que a função sempre devolve
-- uma linha (mesmo sem credencial configurada ainda), com colunas null --
-- quem chama decide o que fazer com app_id/app_secret null (afiliacao_status
-- = 'sem_api').
create or replace function private.credenciais_shopee()
returns table (app_id text, app_secret text)
language sql
security definer
stable
set search_path = ''
as $$
  select ac.shopee_app_id, vs.decrypted_secret
  from public.admin_config ac
  left join vault.decrypted_secrets vs on vs.id = ac.shopee_app_secret_vault_id
  where ac.id = true;
$$;

grant execute on function private.credenciais_shopee() to authenticated;

-- private.shopee_configurado(): só diz SE existe credencial configurada,
-- nunca o valor -- usado pelo onBlur do formulário de presente pra decidir
-- se oferece o atalho de WhatsApp (spec §8), sem vazar a credencial nem
-- qualquer campo de afiliação/marketplace pro client (Regra Inviolável #2).
create or replace function private.shopee_configurado()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_config
    where id = true
      and shopee_app_id is not null
      and shopee_app_secret_vault_id is not null
  );
$$;

grant execute on function private.shopee_configurado() to authenticated;
```

- [ ] **Step 2: Verificar que as funções existem, têm o grant certo e devolvem o resultado esperado sem credencial configurada**

Chamar a ferramenta MCP `execute_sql` do Supabase (`project_id: "wlqpbqpjxnszwmjvfmfs"`) com:

```sql
select has_function_privilege('authenticated', 'private.credenciais_shopee()', 'execute') as pode_credenciais,
       has_function_privilege('authenticated', 'private.shopee_configurado()', 'execute') as pode_configurado;

select * from private.credenciais_shopee();
select private.shopee_configurado() as configurado;
```

Expected: `pode_credenciais` e `pode_configurado` ambos `true`; `credenciais_shopee()` devolve uma linha com `app_id` e `app_secret` ambos `null`; `shopee_configurado()` devolve `false` — reflete o estado real hoje (nenhuma credencial cadastrada ainda).

Nenhum commit nesta task — é só schema aplicado direto no Supabase, sem arquivo local (mesmo padrão do Task 4 do plano da Fase 0).

---

### Task 2: Biblioteca de detecção de marketplace e conversão Shopee (pura, sem banco)

**Files:**
- Modify: `src/lib/marketplace.ts`
- Create: `src/lib/shopee-afiliado.ts`
- Create: `src/lib/afiliacao.ts`

**Interfaces:**
- Consumes: nada de banco — só o `converterLinkShopee` real (rede) ou um fake injetado nos testes manuais abaixo.
- Produces: `detectarMarketplace(url: string): MarketplaceSlug | null` (de `marketplace.ts`); `converterLinkShopee(urlOriginal: string, credenciais: CredenciaisShopee): Promise<string | null>` (de `shopee-afiliado.ts`); `resolverAfiliacao(url: string, credenciaisShopee: CredenciaisShopee | null, converter?: typeof converterLinkShopee): Promise<ResultadoAfiliacao>` (de `afiliacao.ts`) — é isso que a Task 3 chama.

- [ ] **Step 1: Adicionar `MarketplaceSlug` e `detectarMarketplace` em `marketplace.ts`, derivando a allowlist do mesmo mapa**

Substituir o topo de `src/lib/marketplace.ts` (linhas 1-24, o bloco de `DOMINIOS_PERMITIDOS` e `hostnamePermitido`) por:

```typescript
// Detecção de loja por domínio + fetch seguro (spec §8). A allowlist é
// também o gate de segurança do fetch, não só roteamento: sem ela, o campo
// de link vira um SSRF -- o creator (menor privilégio do sistema) poderia
// colar uma URL apontando pra dentro da rede interna. Por isso o hostname é
// checado ANTES de qualquer fetch, inclusive a cada hop de redirect.
//
// O mesmo mapa também alimenta detectarMarketplace() (usado pela conversão
// de afiliado, §7.4/§8) -- domínio permitido e marketplace detectado são a
// mesma pergunta ("essa URL é de uma loja que reconhecemos?"), então ficam
// numa fonte só pra não haver duas listas de domínio divergindo com o tempo.
export type MarketplaceSlug = "shopee" | "shein" | "temu" | "magalu" | "amazon" | "mercado_livre";

const MARKETPLACE_POR_DOMINIO: Record<string, MarketplaceSlug> = {
  "shopee.com.br": "shopee",
  "shopee.com": "shopee",
  "shein.com": "shein",
  "shein.com.br": "shein",
  "temu.com": "temu",
  "magazineluiza.com.br": "magalu",
  "magalu.com": "magalu",
  "amazon.com.br": "amazon",
  "amazon.com": "amazon",
  "amzn.to": "amazon",
  "mercadolivre.com.br": "mercado_livre",
  "mercadolibre.com": "mercado_livre",
};

export function hostnamePermitido(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return Object.keys(MARKETPLACE_POR_DOMINIO).some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Devolve o marketplace detectado pelo hostname da URL, ou null se não é uma
 * loja reconhecida. Não faz nenhum request de rede -- só parsing de URL --
 * então pode ser chamada com segurança a partir de qualquer Server Action,
 * sem risco de SSRF (quem faz request de verdade é fetchSeguro, abaixo, que
 * já valida a allowlist antes de qualquer fetch).
 */
export function detectarMarketplace(url: string): MarketplaceSlug | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [dominio, slug] of Object.entries(MARKETPLACE_POR_DOMINIO)) {
    if (hostname === dominio || hostname.endsWith(`.${dominio}`)) return slug;
  }
  return null;
}
```

O resto do arquivo (`urlDeLojaSuportada`, `fetchSeguro`, `PADROES_HOST_PRIVADO`, `pareceHostPrivado`, `baixarImagemExterna`) continua exatamente igual, sem mudança.

- [ ] **Step 2: Verificar `detectarMarketplace` com um script descartável**

```bash
npx --yes tsx --tsconfig tsconfig.json -e "
import assert from 'node:assert/strict';
import { detectarMarketplace, hostnamePermitido } from './src/lib/marketplace.ts';

assert.equal(detectarMarketplace('https://shopee.com.br/produto-i.1.2'), 'shopee');
assert.equal(detectarMarketplace('https://www.shein.com/produto.html'), 'shein');
assert.equal(detectarMarketplace('https://www.amazon.com.br/dp/B000'), 'amazon');
assert.equal(detectarMarketplace('https://www.mercadolivre.com.br/p/1'), 'mercado_livre');
assert.equal(detectarMarketplace('https://www.google.com'), null);
assert.equal(detectarMarketplace('não é url'), null);
assert.equal(hostnamePermitido('shopee.com.br'), true);
assert.equal(hostnamePermitido('malicious.internal'), false);
console.log('OK: detectarMarketplace/hostnamePermitido');
"
```

Expected: imprime `OK: detectarMarketplace/hostnamePermitido`, sem erro de `AssertionError`.

- [ ] **Step 3: Criar `src/lib/shopee-afiliado.ts`**

```typescript
import { createHash } from "crypto";

// API oficial de afiliados da Shopee (GraphQL, região Brasil). Assinatura:
// SHA256(AppId + Timestamp(segundos) + Payload(JSON exato do body) + Secret),
// hex lowercase -- documentado em https://www.affiliateshopee.com.br/documentacao.
// Timeout curto (mesma lógica de fetchSeguro em marketplace.ts): a Server
// Action de salvar presente não pode travar esperando a Shopee responder.
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";
const TIMEOUT_MS = 5000;

export type CredenciaisShopee = { appId: string; appSecret: string };

function assinar(appId: string, timestamp: number, payload: string, secret: string): string {
  return createHash("sha256").update(appId + timestamp + payload + secret).digest("hex");
}

/**
 * Converte um link de produto/loja da Shopee em link de afiliado via
 * generateShortLink. Devolve null (nunca lança) em qualquer falha -- rede,
 * timeout, credencial inválida, resposta com `errors` -- porque quem chama
 * (resolverAfiliacao) trata "não converteu" como afiliacao_status =
 * 'sem_autorizacao', não como erro fatal do fluxo de salvar o presente.
 */
export async function converterLinkShopee(
  urlOriginal: string,
  credenciais: CredenciaisShopee,
): Promise<string | null> {
  const payload = JSON.stringify({
    query: `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(urlOriginal)} }) { shortLink } }`,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = assinar(credenciais.appId, timestamp, payload, credenciais.appSecret);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${credenciais.appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const shortLink = json?.data?.generateShortLink?.shortLink;
  return typeof shortLink === "string" && shortLink.length > 0 ? shortLink : null;
}
```

- [ ] **Step 4: Criar `src/lib/afiliacao.ts`**

```typescript
import { detectarMarketplace, type MarketplaceSlug } from "./marketplace";
import { converterLinkShopee, type CredenciaisShopee } from "./shopee-afiliado";

export type AfiliacaoStatus = "convertido" | "sem_api" | "sem_autorizacao" | "nao_aplicavel";

export type ResultadoAfiliacao = {
  marketplace: MarketplaceSlug | null;
  linkAfiliado: string | null;
  afiliacaoStatus: AfiliacaoStatus | null;
};

/**
 * Decide marketplace/link_afiliado/afiliacao_status pra um link colado pelo
 * creator (spec §7.4/§8/§11 Fase 4). `converter` é injetável só pra permitir
 * verificar esta função sem depender de rede real na Shopee -- em produção
 * sempre usa converterLinkShopee (valor default do parâmetro).
 *
 * Amazon/Mercado Livre: nao_aplicavel sempre -- sem programa de monetização
 * automática por decisão de negócio (§8), não é "falta de credencial".
 * Shein/Temu/Magalu: sem_api sempre nesta fase -- só a Shopee tem conversor
 * (roadmap Fase 4, §11: "começando por Shopee").
 * Shopee: sem_api se não há credencial configurada; sem_autorizacao se a
 * chamada à API falhou por qualquer motivo (credencial inválida, produto
 * não elegível, rate limit etc. -- a API não distingue essas causas de forma
 * confiável o bastante pra separar em mais estados); convertido se deu certo.
 */
export async function resolverAfiliacao(
  url: string,
  credenciaisShopee: CredenciaisShopee | null,
  converter: typeof converterLinkShopee = converterLinkShopee,
): Promise<ResultadoAfiliacao> {
  const marketplace = detectarMarketplace(url);

  if (marketplace === "amazon" || marketplace === "mercado_livre") {
    return { marketplace, linkAfiliado: null, afiliacaoStatus: "nao_aplicavel" };
  }

  if (marketplace === "shopee") {
    if (!credenciaisShopee) {
      return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
    }
    const linkAfiliado = await converter(url, credenciaisShopee);
    return linkAfiliado
      ? { marketplace, linkAfiliado, afiliacaoStatus: "convertido" }
      : { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_autorizacao" };
  }

  if (marketplace) {
    return { marketplace, linkAfiliado: null, afiliacaoStatus: "sem_api" };
  }

  return { marketplace: null, linkAfiliado: null, afiliacaoStatus: null };
}
```

- [ ] **Step 5: Verificar `resolverAfiliacao` com um conversor fake (sem rede real)**

```bash
npx --yes tsx --tsconfig tsconfig.json -e "
import assert from 'node:assert/strict';
import { resolverAfiliacao } from './src/lib/afiliacao.ts';

const cred = { appId: 'x', appSecret: 'y' };

// Shopee sem credencial -> sem_api
let r = await resolverAfiliacao('https://shopee.com.br/produto-i.1.2', null);
assert.deepEqual(r, { marketplace: 'shopee', linkAfiliado: null, afiliacaoStatus: 'sem_api' });

// Shopee com credencial, conversor fake que funciona -> convertido
r = await resolverAfiliacao('https://shopee.com.br/produto-i.1.2', cred, async () => 'https://s.shopee.com.br/abc');
assert.deepEqual(r, { marketplace: 'shopee', linkAfiliado: 'https://s.shopee.com.br/abc', afiliacaoStatus: 'convertido' });

// Shopee com credencial, conversor fake que falha -> sem_autorizacao
r = await resolverAfiliacao('https://shopee.com.br/produto-i.1.2', cred, async () => null);
assert.deepEqual(r, { marketplace: 'shopee', linkAfiliado: null, afiliacaoStatus: 'sem_autorizacao' });

// Amazon -> nao_aplicavel, mesmo com credencial Shopee configurada
r = await resolverAfiliacao('https://www.amazon.com.br/dp/B000', cred);
assert.deepEqual(r, { marketplace: 'amazon', linkAfiliado: null, afiliacaoStatus: 'nao_aplicavel' });

// Shein -> sem_api (sem conversor nesta fase)
r = await resolverAfiliacao('https://www.shein.com/produto.html', cred);
assert.deepEqual(r, { marketplace: 'shein', linkAfiliado: null, afiliacaoStatus: 'sem_api' });

// Loja não reconhecida -> tudo null
r = await resolverAfiliacao('https://www.google.com', cred);
assert.deepEqual(r, { marketplace: null, linkAfiliado: null, afiliacaoStatus: null });

console.log('OK: resolverAfiliacao');
"
```

Expected: imprime `OK: resolverAfiliacao`, sem `AssertionError`.

- [ ] **Step 6: Build e commit**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

```bash
git add src/lib/marketplace.ts src/lib/shopee-afiliado.ts src/lib/afiliacao.ts
git commit -m "feat: conversor de afiliação Shopee (biblioteca pura, sem wiring ainda)"
```

---

### Task 3: Wire da conversão de afiliado no salvar presente

**Files:**
- Modify: `src/app/(dashboard)/listas/[id]/presentes/actions.ts:1-6` (imports) e `:95-103` (insert)

**Interfaces:**
- Consumes: `resolverAfiliacao` de `@/lib/afiliacao` (Task 2); RPC `credenciais_shopee` (Task 1).
- Produces: `products.marketplace`/`link_afiliado`/`afiliacao_status` passam a ser preenchidos de verdade a partir de agora, em vez de sempre `null`.

- [ ] **Step 1: Atualizar os imports de `actions.ts`**

Substituir:

```typescript
import { createClient } from "@/lib/supabase/server";
import { baixarImagemExterna } from "@/lib/marketplace";
```

por:

```typescript
import { createClient } from "@/lib/supabase/server";
import { baixarImagemExterna } from "@/lib/marketplace";
import { resolverAfiliacao } from "@/lib/afiliacao";
```

- [ ] **Step 2: Ler as credenciais e resolver a afiliação antes do insert**

Substituir o bloco final de `adicionarPresente` (o `const { error } = await supabase.from("products").insert({...})` e o que vem antes dele, a partir de onde `imagemUrl` já foi resolvida) — trocar:

```typescript
  const { error } = await supabase.from("products").insert({
    id: produtoId,
    list_id: listaId,
    nome,
    preco,
    link_original: link,
    quantidade: 1,
    imagem_url: imagemUrl,
  });
```

por:

```typescript
  // Conversão de afiliado (spec §7.4): roda aqui, no clique de salvar, lendo
  // `link` direto do formulário -- nunca reaproveita nenhum valor computado
  // durante o onBlur (busca automática de nome/preço/imagem, acima). Lê a
  // credencial via RPC security definer (Task 1) -- não passa por
  // is_owner(), porque quem está salvando é o creator, nunca o owner.
  const { data: credRow } = await supabase.rpc("credenciais_shopee").maybeSingle();
  const credenciaisShopee =
    credRow?.app_id && credRow?.app_secret
      ? { appId: credRow.app_id, appSecret: credRow.app_secret }
      : null;
  const { marketplace, linkAfiliado, afiliacaoStatus } = await resolverAfiliacao(
    link,
    credenciaisShopee,
  );

  // "O resultado devolvido ao client nunca é a linha inteira" (spec §7.4) --
  // por isso este insert nunca encadeia .select(): devolver a linha criada
  // vazaria link_afiliado/link_original/marketplace/afiliacao_status pro
  // browser do creator, violando a Regra Inviolável #1.
  const { error } = await supabase.from("products").insert({
    id: produtoId,
    list_id: listaId,
    nome,
    preco,
    link_original: link,
    quantidade: 1,
    imagem_url: imagemUrl,
    marketplace,
    link_afiliado: linkAfiliado,
    afiliacao_status: afiliacaoStatus,
  });
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Verificar em runtime que o insert grava os campos certos (sem credencial Shopee ainda configurada)**

Com o dev server rodando (`npm run dev`) e logado como creator numa lista existente, adicionar um presente colando um link de `shopee.com.br`, depois checar a linha via MCP `execute_sql` (`project_id: "wlqpbqpjxnszwmjvfmfs"`):

```sql
select nome, marketplace, afiliacao_status, link_afiliado from public.products order by created_at desc limit 1;
```

Expected: `marketplace = 'shopee'`, `afiliacao_status = 'sem_api'` (nenhuma credencial configurada ainda), `link_afiliado` é `null`. Repetir colando um link da Amazon: `marketplace = 'amazon'`, `afiliacao_status = 'nao_aplicavel'`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/listas/[id]/presentes/actions.ts"
git commit -m "feat: wire da conversão de afiliado no salvar presente"
```

---

### Task 4: Sinal e popup de WhatsApp no modal de adicionar presente

**Files:**
- Modify: `src/app/(dashboard)/listas/[id]/presentes/buscar-dados-action.ts` (inteiro)
- Modify: `src/app/(dashboard)/listas/[id]/presentes/add-presente-modal.tsx`

**Interfaces:**
- Consumes: RPC `shopee_configurado` (Task 1); view `banner_publico` (já existe); `detectarMarketplace` (Task 2).
- Produces: `DadosProduto.ofertaWhatsapp: { numero: string } | null` — o client só recebe isso ou `null`, nunca o marketplace nem o status (Regra Inviolável #2).

- [ ] **Step 1: Atualizar `buscar-dados-action.ts` para devolver `ofertaWhatsapp`**

Substituir o arquivo inteiro por:

```typescript
"use server";

import * as cheerio from "cheerio";
import { fetchSeguro, urlDeLojaSuportada, detectarMarketplace } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";

export type DadosProduto = {
  titulo: string | null;
  imagem: string | null;
  preco: number | null;
  // Sinal pro modal oferecer o atalho de WhatsApp (spec §8) -- nunca o
  // marketplace detectado nem o afiliacao_status em si (Regra Inviolável
  // #2): o client só sabe "hoje dá pra pedir um link com desconto nesta
  // loja" + o número, nunca por quê nem em qual loja.
  ofertaWhatsapp: { numero: string } | null;
};

// Busca automática de nome/imagem/preço ao sair do campo de link (spec §4,
// §8) -- nunca inclui qualquer campo de link (original ou convertido), só
// os três campos de exibição. A conversão de afiliado em si (que precisa
// das credenciais reais das lojas) fica pra quando essas credenciais
// existirem -- aqui só lemos og:title/og:image/preço público da página.
export async function buscarDadosProduto(url: string): Promise<DadosProduto | { erro: string }> {
  if (!url.trim()) return { erro: "Cole um link primeiro." };

  const ofertaWhatsapp = await resolverOfertaWhatsapp(url);

  if (!urlDeLojaSuportada(url)) {
    // loja fora da allowlist -- não é erro, só não dá pra buscar
    // automaticamente; o formulário cai no preenchimento manual
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  const res = await fetchSeguro(url);
  if (!res || !res.ok) {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
  }

  let html: string;
  try {
    html = await res.text();
  } catch {
    return { titulo: null, imagem: null, preco: null, ofertaWhatsapp };
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
    ofertaWhatsapp,
  };
}

/**
 * Decide se oferece o atalho de WhatsApp (spec §8: quando afiliacao_status
 * ficaria sem_api/sem_autorizacao/nao_aplicavel) sem nunca calcular nem
 * expor o afiliacao_status de verdade aqui -- só a pergunta booleana "essa
 * loja converte automaticamente hoje?". Shopee só conta como "converte" se
 * já há credencial configurada (private.shopee_configurado()); qualquer
 * outra loja reconhecida (Shein/Temu/Magalu/Amazon/Mercado Livre) sempre
 * oferece o atalho nesta fase. Loja não reconhecida -> sem oferta (nada pra
 * "achar mais barato" numa loja que o sistema nem identifica).
 */
async function resolverOfertaWhatsapp(url: string): Promise<{ numero: string } | null> {
  const marketplace = detectarMarketplace(url);
  if (!marketplace) return null;

  const supabase = await createClient();

  if (marketplace === "shopee") {
    const { data: configurado } = await supabase.rpc("shopee_configurado");
    if (configurado) return null;
  }

  const { data: banner } = await supabase
    .from("banner_publico")
    .select("whatsapp_numero")
    .maybeSingle();

  return banner?.whatsapp_numero ? { numero: banner.whatsapp_numero } : null;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Mostrar o popup em `add-presente-modal.tsx`**

Adicionar estado e o popup. Trocar a linha de imports:

```typescript
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";
```

por:

```typescript
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";
import type { DadosProduto } from "./buscar-dados-action";
```

Adicionar um novo estado logo depois de `const [imagemAutoUrl, setImagemAutoUrl] = useState<string | null>(null);`:

```typescript
  const [ofertaWhatsapp, setOfertaWhatsapp] = useState<DadosProduto["ofertaWhatsapp"]>(null);
```

Em `aoSairDoLink`, depois de `if (resultado.imagem) setImagemAutoUrl(resultado.imagem);`, adicionar:

```typescript
      setOfertaWhatsapp(resultado.ofertaWhatsapp);
```

No final do componente, antes do `</div>` que fecha o card do modal (logo depois do `</form>`), adicionar o popup:

```tsx
        {ofertaWhatsapp && (
          <div
            onClick={() => setOfertaWhatsapp(null)}
            className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card p-6 text-center"
            >
              <div className="mb-2 text-4xl">🔎</div>
              <h3 className="text-lg font-extrabold text-ink">
                Achamos que dá para pagar menos nesse produto
              </h3>
              <p className="mt-2 text-sm text-sub">
                Você pode encontrar um cupom ou um link mais barato desse produto com a gente.
                Deseja entrar em contato?
              </p>
              <a
                href={`https://wa.me/${ofertaWhatsapp.numero}?text=${encodeURIComponent(
                  "Olá, vim do Lista Garimpo e quero um link com desconto para este produto: " +
                    (document.querySelector<HTMLInputElement>('input[name="link"]')?.value ?? ""),
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOfertaWhatsapp(null)}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-3.5 text-sm font-extrabold text-white"
              >
                🟢 Entrar em contato
              </a>
              <button
                type="button"
                onClick={() => setOfertaWhatsapp(null)}
                className="mt-3 w-full py-2.5 text-xs font-semibold text-sub"
              >
                Agora não, seguir com este link
              </button>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Verificar em runtime no navegador**

Com `npm run dev` rodando, logado como creator numa lista, abrir "Adicionar presente" e colar um link de `shein.com`: o popup de WhatsApp deve aparecer automaticamente logo após "Buscando dados do produto…" terminar, com o texto acima (sem citar "Shein", "comissão" ou "afiliação" em nenhum momento). Clicar em "Entrar em contato" deve abrir `https://wa.me/<numero>?text=...` numa nova aba. Colar um link de `shopee.com.br` (sem credencial configurada ainda) também deve mostrar o popup, já que `shopee_configurado()` ainda devolve `false`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/listas/[id]/presentes/buscar-dados-action.ts" "src/app/(dashboard)/listas/[id]/presentes/add-presente-modal.tsx"
git commit -m "feat: popup de WhatsApp para lojas sem conversão automática de afiliado"
```

---

## Configuração manual das credenciais reais da Shopee (quando existirem)

Igual ao bootstrap manual do primeiro `owner` na Fase 1 e ao provisionamento direto da Fase 0 — quando você tiver `app_id`/`app_secret` reais da Shopee Affiliate, rode isto no SQL editor do Supabase (projeto `garimpo`), sem precisar de deploy novo:

```sql
update public.admin_config set shopee_app_id = 'SEU_APP_ID_AQUI' where id = true;

select vault.create_secret('SEU_APP_SECRET_AQUI', 'shopee_app_secret') as secret_id;
-- copie o secret_id que essa chamada devolve e cole no comando abaixo:

update public.admin_config
set shopee_app_secret_vault_id = 'COLE_O_SECRET_ID_AQUI'::uuid
where id = true;
```

Depois disso, `private.shopee_configurado()` passa a devolver `true` e o próximo presente Shopee salvo já converte de verdade (`afiliacao_status = 'convertido'`) — sem precisar mexer em código. A Fase 5 troca esse passo manual por uma tela de verdade no painel admin.

---

## Self-Review

**1. Cobertura do escopo aprovado:** item 1 (tabela/colunas de credencial) já existia no banco, confirmado via MCP — não precisa de migration nova de schema, só das duas funções de leitura (Task 1). Item 2 (colunas em `products`) idem, já existiam. Item 3 (conversor Shopee) → Task 2. Item 4 (wire em `adicionarPresente`, com os quatro valores de `afiliacao_status`) → Task 3. Item 5 (popup de WhatsApp sem vazar afiliação) → Task 4.

**2. Placeholders:** nenhum "TBD"/"implementar depois". A única coisa deixada para configuração posterior (credenciais reais da Shopee) é operação do usuário, não código — documentada com SQL exato, executável assim que os valores existirem, mesmo padrão do bootstrap manual da Fase 1.

**3. Consistência de tipos/nomes:** `ResultadoAfiliacao`/`AfiliacaoStatus` (Task 2) são os mesmos nomes usados em `actions.ts` (Task 3, desestruturando `marketplace`/`linkAfiliado`/`afiliacaoStatus`). `DadosProduto.ofertaWhatsapp` (Task 4, `buscar-dados-action.ts`) é o mesmo tipo importado e consumido em `add-presente-modal.tsx`. `CredenciaisShopee` é definido em `shopee-afiliado.ts` e reexportado/reutilizado em `afiliacao.ts` sem redefinição duplicada.

**4. Regras invioláveis:** #1 e #2 checadas explicitamente em cada ponto onde um valor cruzaria a fronteira server→client (insert sem `.select()` na Task 3; `ofertaWhatsapp` nunca carrega marketplace/status na Task 4). #4 — nenhuma credencial em código, só em `admin_config`/Vault, lidas via função `security definer`. #5 — toda leitura de credencial e chamada à Shopee roda dentro de Server Actions (`adicionarPresente`, `buscarDadosProduto`), nunca em `"use client"`.
