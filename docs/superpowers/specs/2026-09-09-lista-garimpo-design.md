# Lista Garimpo — Design

Status: aguardando revisão do dono do projeto.

## 1. Visão de negócio

Lista Garimpo é uma plataforma de listas de presentes (wishlist / gift registry), no
estilo do "Lista Ideal", com um modelo de negócio diferente: a monetização é por
afiliação, e quem recebe a comissão é o **dono da plataforma**, nunca o usuário que
cria a lista.

**A regra central:** quando um criador cola o link de um produto, o sistema converte
esse link — nos bastidores, só no servidor — para um link de afiliado da conta do
dono. O criador nunca vê, edita ou sabe que esse link de afiliado existe. Para ele é
só uma lista de presentes comum.

Três papéis:
- **owner** — dono da plataforma. Acesso total: credenciais de afiliado, usuários,
  banner promocional, WhatsApp de contato.
- **creator** — cria e gerencia suas próprias listas, sem nenhuma informação de
  afiliação visível.
- **guest** — acessa a lista pública por subdomínio, vê os presentes, reserva um item
  informando nome + telefone (sem conta).

## 2. Regras invioláveis

Têm precedência sobre qualquer outra instrução deste documento. Se um pedido futuro
violar uma delas, isso deve ser sinalizado antes de implementar.

1. O link de afiliado nunca é exposto ao creator nem ao guest como "link de
   afiliado" — em nenhuma tela, API ou resposta JSON. O guest usa o link (o redirect
   acontece no servidor); o creator não tem acesso ao campo em nenhuma circunstância.
2. Nenhuma informação de afiliação, comissão, marketplace detectado ou status de
   monetização aparece para creator ou guest. Essa informação existe só no painel
   owner.
3. Um produto (card), depois de criado, não pode ser editado pelo creator — só
   excluído e recriado. Isso impede trocar o link depois da conversão de afiliado.
4. Credenciais e segredos nunca vão para o código-fonte nem para o Git. Ficam em
   variáveis de ambiente (infraestrutura) ou em tabela protegida por RLS
   (ver §7.4 — decisão sobre onde cada segredo mora).
5. A conversão de link e qualquer lógica de afiliação roda só no server-side —
   Server Actions ou Route Handlers. Nunca em componente client, nunca exposta ao
   browser.
6. RLS ligado em todas as tabelas com dados de usuário. Um creator só lê/escreve as
   próprias listas e produtos.

## 3. Stack técnica

- **Frontend + Backend:** Next.js (App Router) + React + TypeScript.
- **Estilização:** Tailwind CSS. *(Decisão fechada nesta conversa — a spec original
  deixava "a definir" entre Tailwind e CSS-in-JS; Tailwind ganha por ser o padrão do
  ecossistema Next.js e mais fácil de manter para quem não é dev full-time.)*
- **Banco + Auth + Storage:** Supabase (Postgres, Supabase Auth, Supabase Storage).
- **Hospedagem:** VPS própria via **EasyPanel** (Docker + deploy por git push + SSL
  automático + wildcard de subdomínio). *(Correção: a spec original citava Coolify;
  a ferramenta real em uso é EasyPanel. Arquitetura não muda — EasyPanel cobre o
  mesmo conjunto de recursos: build a partir do git, certificado automático,
  domínios wildcard.)*
- **E-mail transacional:** Resend (notificação de reserva). Redefinição de senha usa
  o fluxo nativo do Supabase Auth.
- **Versionamento:** GitHub. Fluxo: commit local → push → deploy automático no
  EasyPanel.

Restrições: sem bibliotecas pesadas sem necessidade; sem `localStorage`/
`sessionStorage` para dados sensíveis (sessão via Supabase Auth); todo acesso a
segredo/afiliação roda em Server Action ou Route Handler.

## 4. Identidade visual

Tema "garimpo". Paleta (definida na spec original, mantida):

| Papel | Cor |
|---|---|
| Fundo areia | `#F5F0E8` |
| Tinta (texto) | `#241E17` |
| Texto secundário | `#6B5D4F` |
| Cartão creme | `#FFFDF9` |
| Linhas | `#E2D8C8` |
| Ação primária (terracota) | `#B4552D` |
| Sucesso / reservado (jade) | `#1F6F5C` |
| Destaque (ouro) | `#C08A2D` |
| Perigo | `#A8352B` |
| WhatsApp | `#25D366` |

Essas cores viram tokens no `tailwind.config` (`bg`, `ink`, `sub`, `line`, `card`,
`clay`, `jade`, `gold`, `danger`, `whatsapp`), para não haver hex-codes soltos pelos
componentes.

O arquivo `lista-garimpo-prototipo.jsx` (protótipo React de arquivo único, com dados
simulados) é a referência de UI e fluxo para as três visões. Ele confirma detalhes
que orientam o design abaixo:
- Fluxo de criação de lista em 2 passos (nome/descrição → tipo de evento + slug
  sugerido automaticamente a partir do nome).
- Dentro da lista, navegação lateral com 7 abas: Presentes, Recadinhos, Convidados,
  Compartilhar, Info. do Evento, Aparência, Configurações.
- No modal de adicionar presente, o link é colado e a busca automática de dados
  acontece ao sair do campo (`onBlur`), com campos de nome/preço/imagem editáveis
  antes de salvar, e fallback de upload manual de imagem.
- Na página pública, "Selecionar este presente" (reservar) e "Ir para a loja"
  (comprar) são **duas ações separadas** — reservar trava o item para os outros
  convidados; ir para a loja é o redirect de compra. Confirmado como parte deste
  design (§9.4).
- Painel admin com 3 abas: Afiliados & APIs, Banner promocional, Usuários — a aba de
  afiliados mostra, por loja, o modo de integração e um status "ativo" / "sem
  conversão".

## 5. Arquitetura de rotas (multi-tenant em um único app Next.js)

Um único app Next.js atende dois contextos de domínio:

- `app.listagarimpo.com.br` → painel (auth, criador, admin) — grupo de rotas
  `app/(dashboard)/...`.
- `{slug}.listagarimpo.com.br` → página pública de uma lista — grupo de rotas
  `app/(public)/...`.

Um **middleware** lê o header `Host` em toda requisição:
- Se o host é o domínio do app (`app.` ou o domínio raiz), deixa passar normalmente
  para o dashboard.
- Se é um subdomínio de lista, faz **rewrite** interno para `/l/[slug]/...` dentro do
  grupo público — o visitante nunca vê essa URL interna, só o subdomínio real na
  barra de endereço.

**Ambiente local (antes de qualquer deploy):** subdomínios de `localhost` resolvem
para `127.0.0.1` sem precisar editar `/etc/hosts`, e funcionam nos navegadores
modernos. Então em dev: `app.localhost:3000` para o painel e
`aniversario-kvqj.localhost:3000` para testar a página pública — o mesmo middleware
funciona sem nenhum código condicional de "modo dev". Em produção, só aponta o DNS
wildcard real (`*.listagarimpo.com.br`) para a VPS.

## 6. Modelo de dados

Tabelas conforme a spec original (`profiles`, `lists`, `products`, `reservations`,
`messages`, `rsvps`, `admin_config`), com os seguintes refinamentos de
implementação:

**`profiles`** é populada automaticamente por um trigger em `auth.users` (`on
insert` → cria a linha correspondente em `profiles` com `role = 'creator'` por
padrão). Isso evita ter que sincronizar manualmente cadastro do Supabase Auth com a
tabela de perfis.

**`products.quantidade`** define quantos convidados podem reservar aquele item no
total. Não existe um contador redundante — disponibilidade é sempre calculada como
`quantidade > count(reservations where product_id = X and status = 'reservado')`.

**Storage (Supabase Storage):** um bucket público `public-media`, com subpastas:
- `products/{list_id}/{product_id}.ext` — imagens de produto.
- `lists/{list_id}/banner.ext` e `lists/{list_id}/perfil.ext` — aparência da lista.
- `admin/banner.ext` — imagem do banner promocional do owner.

Leitura pública (guests precisam ver as imagens); escrita restrita por policy de
storage a quem é dono do `list_id` correspondente (ou ao owner, na pasta `admin/`).

## 7. Segurança e RLS

### 7.1 Padrão de política

Todas as políticas usam `(select auth.uid())` (não `auth.uid()` solto), para que a
função seja avaliada uma vez por query, não uma vez por linha — impacto real de
performance em tabelas maiores. Toda coluna usada em política de RLS (`owner_id`,
`list_id`, `product_id`) tem índice.

### 7.2 Checagem de papel (owner) via função privada

Em vez de repetir `exists (select 1 from profiles where id = auth.uid() and role =
'owner')` em cada política, existe uma função auxiliar:

```sql
create or replace function private.is_owner()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

revoke execute on function private.is_owner() from public, anon, authenticated;
grant execute on function private.is_owner() to authenticated; -- só para uso interno em policies
```

Usada nas políticas de `profiles` (listar todos, ativar/inativar, excluir),
`admin_config` (acesso total) e como checagem adicional em `products`/`lists` onde
fizer sentido.

### 7.3 Reserva atômica (evita presente duplicado em corrida)

Dois convidados podem tentar reservar o último item ao mesmo tempo. Em vez de o
client ler a contagem e depois inserir (janela de corrida), a reserva passa por uma
função de banco que trava a linha do produto durante a checagem:

```sql
create or replace function public.reserve_product(
  p_product_id uuid, p_guest_nome text, p_guest_telefone text
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qtd int;
  v_reservados int;
  v_nova public.reservations;
begin
  select quantidade into v_qtd from public.products where id = p_product_id for update;
  if v_qtd is null then
    raise exception 'Produto não encontrado';
  end if;

  select count(*) into v_reservados from public.reservations
    where product_id = p_product_id and status = 'reservado';

  if v_reservados >= v_qtd then
    raise exception 'Este item não está mais disponível';
  end if;

  insert into public.reservations (product_id, guest_nome, guest_telefone)
    values (p_product_id, p_guest_nome, p_guest_telefone)
    returning * into v_nova;

  return v_nova;
end;
$$;

grant execute on function public.reserve_product(uuid, text, text) to anon, authenticated;
```

A tabela `reservations` não recebe `insert` direto de `anon` — só através dessa
função. A transação é curta (um lock de linha + uma contagem + um insert), sem
chamadas externas no meio, seguindo a prática recomendada de manter transações
curtas para não segurar locks.

### 7.4 Onde moram os segredos de afiliação — decisão

A spec original deixava em aberto: variável de ambiente vs. tabela `admin_config`
com RLS. **Decisão adotada:** os campos de credencial (`shopee_app_id`,
`shopee_app_secret`, `awin_publisher_id`, `awin_api_key`, `admitad_client_id`,
`admitad_client_secret`) ficam em `admin_config`, editáveis pelo owner direto no
painel (como o protótipo mostra — campos de input por loja), e não em variável de
ambiente.

Motivo: o protótipo já desenha essa UX (owner edita credenciais na tela, sem precisar
mexer no servidor), e trocar uma chave de API não deveria exigir um redeploy. Isso é
seguro desde que:
- RLS em `admin_config` permite `select`/`update` só a `private.is_owner()`.
- Toda leitura desses campos para uso real (chamar a API da Shopee, montar um link
  Awin) acontece em Server Action/Route Handler usando a sessão do usuário logado —
  nunca uma query direta do client, mesmo que a RLS já bloquearia.
- `SUPABASE_SERVICE_ROLE_KEY` continua sendo a única exceção que fica em variável de
  ambiente pura, porque ela precisa existir antes de qualquer usuário logar.

Continuam em variável de ambiente (infraestrutura, não dado de negócio):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_ROOT_DOMAIN`.

### 7.5 Imutabilidade de produto

Em vez de uma trigger que bloqueia só alguns campos, a política de RLS de `products`
simplesmente **não tem `update` para o papel `creator`** — só `insert`, `select`
(nas próprias listas) e `delete`. Sem policy de update, nenhum campo é editável por
ninguém além do owner (que não edita produtos de terceiros de qualquer forma). Mais
simples do que uma trigger e igualmente à prova de falhas.

### 7.6 Leitura pública

`lists`: select público permitido só para servir a página pública por slug — a
query pública nunca faz `select *`; a Server Component da página pública seleciona
explicitamente as colunas necessárias (nome, descrição, aparência, flags), nunca
campos internos.

`products`: select público retorna todas as colunas exceto `link_afiliado`,
`marketplace` e `afiliacao_status` — usando uma **view** `public.products_public`
que expõe só as colunas seguras, com RLS própria de leitura anônima. O redirect de
compra ("ir para a loja") é um Route Handler `GET /api/go/[productId]` que lê o
produto completo com o cliente **admin** (service role, só no servidor) e devolve um
`302` para `link_afiliado ?? link_original` — o valor do link nunca aparece em um
payload JSON entregue ao browser.

`reservations`: guest insere só via `reserve_product()` (§7.3); leitura pública
retorna apenas `product_id` e se está reservado (para pintar o card como
indisponível) — telefone do convidado nunca é lido publicamente, só pelo creator
dono da lista (aba Convidados).

`messages`/`rsvps`: insert público permitido; leitura pública normal (são
conteúdos que o próprio guest espera ver publicados).

## 8. Camada de afiliação (server-side)

Mantida como descrita na spec original — conversor plugável por marketplace,
detecção por domínio, e os quatro comportamentos por loja (Shopee via API oficial,
Shein/Temu/Magalu via rede de afiliados, Amazon e Mercado Livre sem monetização
automática por ora).

**Busca de dados do produto (imagem/título/preço) para lojas fora da Shopee:** feita
com a biblioteca `cheerio` para ler `og:image`/`og:title`/preço do HTML da página do
produto (server-side fetch). É uma dependência pequena e padrão de mercado para
parsing de HTML — mais confiável que regex manual, sem ser uma biblioteca pesada.
Upload manual de imagem continua como fallback obrigatório (algumas lojas bloqueiam
scraping).

**Popup de WhatsApp** (quando `afiliacao_status` ∈ {`sem_api`, `sem_autorizacao`,
`nao_aplicavel`}): mantido como especificado, texto sem menção a comissão/afiliação,
número vindo de `admin_config.whatsapp_numero`.

## 9. Funcionalidades por visão

Conforme spec original (seção 8), sem alterações — mantidas aqui por referência:

- **owner:** config de afiliados/APIs, tabela de usuários (cadastro, ativar/
  inativar, excluir, reset de senha via Supabase Auth), banner promocional,
  WhatsApp de contato.
- **creator:** auth por e-mail/senha (sem Google), minhas listas, criar lista (2
  passos), abas dentro da lista (Presentes, Recadinhos, Convidados, Compartilhar,
  Info. do Evento, Aparência, Configurações) — nunca vê nada de afiliação.
- **guest:** vê lista + banner promocional, reserva item (nome + telefone),
  recadinhos e RSVP conforme flags da lista, notificação por e-mail ao criador
  quando um item é reservado (se `feat_notif_email`).
- **Cortado (não implementar):** galeria de fotos, amigo secreto, login Google,
  qualquer módulo financeiro/Pix/pagamento.

**QR Code** (aba Compartilhar): gerado com a biblioteca `qrcode` (leve, sem
dependências pesadas), renderizado no client a partir da URL pública da lista — sem
personalização de cor, conforme especificado.

## 10. Infraestrutura de desenvolvimento

Estado atual (checado nesta conversa): nada provisionado ainda para este projeto.

- **Supabase:** organização existente `claude-teste` tem um projeto,
  `aula-crm` — **não será tocado**. Um projeto novo e isolado, `lista-garimpo`, será
  criado na mesma organização, região `sa-east-1` (mesma região do projeto
  existente, adequada para usuários no Brasil). Bancos de projetos diferentes no
  Supabase são completamente isolados.
- **GitHub:** repositório novo dedicado a este projeto. Abordagem: instalar o `gh`
  CLI localmente (não estava disponível neste ambiente) e criar o repo por aqui —
  alternativa é você criar o repositório vazio manualmente e passar a URL.
- **VPS + EasyPanel:** app novo e isolado dentro do EasyPanel existente, sem alterar
  nenhum app já configurado lá. Deploy via git push, seguindo o fluxo padrão do
  EasyPanel (Docker + build automático).
- **Local:** `npm run dev` com Next.js, apontando para o projeto Supabase novo via
  `.env.local` (nunca commitado). Subdomínios testados via `*.localhost` (§5).

## 11. Roadmap de implementação

Mantido como a spec original definiu (fatias pequenas, parar ao final de cada fase
para revisão):

- **Fase 0 — Setup:** Next.js + TypeScript + Tailwind, `.gitignore`/`.env.example`,
  repositório GitHub, projeto Supabase novo, conexão client server-side/browser.
- **Fase 1 — Banco + Auth:** migrations das tabelas (§6), RLS completo (§7),
  cadastro/login/esqueci-senha via Supabase Auth. Primeiro usuário `owner`: cadastro
  normal como creator, depois `update profiles set role = 'owner'` manual via SQL
  editor do Supabase — não é necessário construir uma ferramenta de seed separada
  para isso.
- **Fase 2 — Criador:** minhas listas, criar lista (2 passos), abas da lista, sem
  nenhuma informação de afiliação.
- **Fase 3 — Página pública + subdomínios:** middleware (§5), renderização pública
  por slug, `reserve_product()` (§7.3), Route Handler de redirect de compra (§7.6).
- **Fase 4 — Afiliação:** conversores por marketplace, começando por Shopee
  (API oficial — precisa de `shopee_app_id`/`shopee_app_secret` reais para testar),
  scraping via cheerio + fallback manual, popup de WhatsApp.
- **Fase 5 — Admin:** config de afiliados (armazenada em `admin_config`, §7.4),
  tabela de usuários, banner, WhatsApp.
- **Fase 6 — Notificações + Deploy:** e-mail de reserva via Resend, deploy no
  EasyPanel, teste do fluxo completo com usuários reais.

## 12. Como trabalhar neste projeto

Mantido da spec original: explicações em português claro, sem assumir conhecimento
profundo de programação; avisar antes de comandos destrutivos; nunca expor segredos
em logs/prints/commits; parar e pedir quando faltar uma credencial em vez de
inventar valores; soluções simples antes de soluções "espertas"; alertar sobre
qualquer risco de segurança antes de implementar.
