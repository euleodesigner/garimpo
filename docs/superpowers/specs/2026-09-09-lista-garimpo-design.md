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
  convidados (§7.3); ir para a loja é o redirect de compra (§7.6).
- Painel admin com 3 abas: Afiliados & APIs, Banner promocional, Usuários — a aba de
  afiliados mostra, por loja, o modo de integração e um status "ativo" / "sem
  conversão".
- O número de WhatsApp de contato (`admin_config.whatsapp_numero`, usado no popup
  de §8) é editado dentro da aba **Banner promocional** — não existe uma 4ª aba
  dedicada; é só mais um campo de configuração do owner ali, junto do link do
  banner.

## 5. Arquitetura de rotas (multi-tenant em um único app Next.js)

Um único app Next.js atende dois contextos de domínio:

- `app.listagarimpo.com.br` → painel (auth, criador, admin) — grupo de rotas
  `app/(dashboard)/...`.
- `{slug}.listagarimpo.com.br` → página pública de uma lista — grupo de rotas
  `app/(public)/...`.

Um **middleware** lê o header `Host` em toda requisição:
- Se o host é o domínio do app (`app.`, `www.` ou o domínio raiz sem subdomínio),
  deixa passar normalmente para o dashboard — `www.` é tratado como sinônimo do
  domínio raiz, nunca como um slug de lista.
- Se é qualquer outro subdomínio, faz **rewrite** interno para `/l/[slug]/...`
  dentro do grupo público — o visitante nunca vê essa URL interna, só o subdomínio
  real na barra de endereço. Se o `slug` não corresponder a nenhuma lista, mostra
  um 404 normal (não faz fallback silencioso pro dashboard).

**Ambiente local (antes de qualquer deploy):** subdomínios de `localhost` resolvem
para `127.0.0.1` sem precisar editar `/etc/hosts`, e funcionam nos navegadores
modernos. Então em dev: `app.localhost:3000` para o painel e
`aniversario-kvqj.localhost:3000` para testar a página pública — o mesmo middleware
funciona sem nenhum código condicional de "modo dev". Em produção, só aponta o DNS
wildcard real (`*.listagarimpo.com.br`) para a VPS.

**Slugs reservados:** a validação de slug (na sugestão automática do passo 2 da
criação e na aba Configurações) rejeita uma lista curada de palavras que colidem
com o roteamento — `app`, `www`, `api`, `admin`, `mail`, `ftp`, `root` — além do
domínio raiz sem subdomínio. Sem essa checagem, uma lista com slug `app` fica
permanentemente inacessível no seu próprio subdomínio, porque o middleware sempre
resolve `app.` para o dashboard antes de sequer olhar para o slug. Hostnames não
diferenciam maiúsculas de minúsculas, então tanto a comparação com a lista de
reservados quanto a própria coluna `slug` normalizam sempre para minúsculas antes
de salvar/comparar — `App` é rejeitado pelo mesmo motivo que `app`.

**Sessão compartilhada entre `app.` e `{slug}.`:** por padrão, um cookie de sessão
do Supabase Auth criado em `app.listagarimpo.com.br` não é enviado em requisições
para `aniversario-kvqj.listagarimpo.com.br` — são hosts diferentes. Isso importa
porque três coisas dependem de `auth.uid()` estar disponível mesmo quando o
creator está navegando na página pública da própria lista: §7.6
(`products_public`/`reservations_public`), §7.3 (`reserve_product`, "o dono não
reserva o próprio presente") e o Route Handler de redirect de compra (§7.6,
`/api/go/[productId]`, que decide entre `link_original` e `link_afiliado`
conforme quem chama é ou não o dono da lista). Por isso, o cookie de sessão é
emitido com `Domain=.listagarimpo.com.br` (nota o ponto inicial — abrange
qualquer subdomínio), configurado uma vez no helper de Supabase Auth do Next.js
(`@supabase/ssr`). Em dev local, `*.localhost` também aceita `Domain=.localhost`
do mesmo jeito, então o comportamento é idêntico nos dois ambientes. Sem essa
configuração, o guard de "não reservar o próprio presente" (§7.3) e a
visibilidade de listas ainda não `ativa` para o próprio creator (§7.6)
simplesmente não funcionam na página pública — o creator aparece como anônimo
lá, mesmo logado no painel. Para o Route Handler de redirect, a consequência é
mais grave que "aparecer anônimo": o creator anônimo passaria a receber
`link_afiliado` em vez de `link_original` ao clicar "Ir para a loja" na própria
lista — violação direta da Regra Inviolável #1, não só uma perda de
funcionalidade.

Compartilhar o cookie entre subdomínios amplia o alcance de qualquer XSS: uma
página pública renderiza texto que o próprio creator ou os guests escreveram
(nome da lista, descrição, recadinhos) — antes, um XSS ali só afetaria aquele
subdomínio; com o cookie valendo pra `*.listagarimpo.com.br`, ele passaria a
valer também pra `app.`. **O cookie do `@supabase/ssr` não é `HttpOnly` por
padrão** — precisa ser lido via `document.cookie` pelo client de browser
(`createBrowserClient`) pra manter a sessão reativa no client-side, então não dá
pra simplesmente marcar `HttpOnly` sem quebrar esse client. Isso significa que a
defesa real contra essa escalada **não é o cookie, é nunca ter o XSS em primeiro
lugar**:
- Nenhum texto vindo de creator/guest (nome, descrição, recadinhos, RSVP) é
  renderizado com `dangerouslySetInnerHTML` em lugar nenhum do app — o
  escapamento automático do JSX do React já impede XSS armazenado por esse texto,
  tanto nas páginas públicas quanto no painel.
- `Secure` (só em HTTPS) e `SameSite=Lax` continuam ativos (padrão do
  `@supabase/ssr`, só o `Domain` muda) — protegem contra interceptação em
  trânsito e contra o cookie vazar em navegação cross-site, mas não contra um XSS
  que já rodou no mesmo domínio.
- Como reforço adicional (não substitui a regra acima), a página pública envia um
  header `Content-Security-Policy` restringindo `script-src` a `'self'` — reduz o
  impacto de um XSS que escape da revisão de código, mas o controle real continua
  sendo nunca injetar HTML não confiável.

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

**`reservations.status`** ganha um segundo valor além do `'reservado'` original:
`'cancelado'` (usado por `cancel_reservation()`, §7.3, quando o creator libera uma
reserva individual sem excluir o produto). Só linhas `'reservado'` contam para a
disponibilidade acima.

**Exclusão de produto com reservas:** a FK `reservations.product_id` usa
`on delete cascade` — excluir um produto tem que sempre ser possível (é o único
caminho de correção da Regra Inviolável #3, e não pode ficar bloqueado por ter
reservas), e apagar o produto apaga *todas* as reservas daquele item junto. Como
isso pode remover a reserva de vários convidados de uma vez só pra corrigir o
produto, a tela de exclusão (aba Presentes) exibe uma confirmação sempre que o
produto tiver reservas ativas: "Este item tem N reserva(s); excluir libera-o para
outros convidados e as reservas atuais são perdidas." Quando o creator só precisa
liberar **uma** reserva específica (ex.: convidado cancelou, mas o produto em si
está correto), o caminho é `cancel_reservation()` (§7.3), não excluir o produto.

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

Usada nas políticas de `profiles` (listar todos, ativar/inativar, excluir) e
`admin_config` (acesso total) — **sempre em políticas escopadas `to authenticated`,
nunca dentro de uma política que também precisa valer para `anon`**. O RLS do
Postgres só avalia as políticas cujo `to <role>` bate com o papel da sessão atual:
uma política `to authenticated` simplesmente não entra em jogo quando a sessão é
anônima, então isso nunca gera erro de permissão para o guest — desde que
`is_owner()` nunca seja misturada com `OR` dentro da mesma política que também
aceita `anon`. Onde `products`/`lists` precisam de leitura tanto autenticada
(creator/owner) quanto anônima (guest), são políticas **separadas** por papel, uma
para `to authenticated` e outra para `to anon`, nunca uma condição única
combinando os dois.

**Autoedição de perfil:** `profiles` não tem uma política genérica de `update` do
tipo `using (id = (select auth.uid()))`, porque isso abriria a coluna `role` (e
`status`) para o próprio creator se autopromover a `owner`. Quando existir uma tela
de "editar meu perfil", ela só pode alterar campos não sensíveis (`nome`) através
de uma função `security definer` que, além de tocar só essa coluna, filtra
explicitamente a própria linha do usuário — sem esse filtro, qualquer creator
autenticado poderia sobrescrever o nome de qualquer outro usuário:

```sql
create or replace function public.update_own_profile(p_nome text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.profiles;
begin
  update public.profiles
    set nome = p_nome
    where id = (select auth.uid())  -- crítico: sem este filtro, atualiza a
                                     -- linha de qualquer usuário, não só a
                                     -- de quem está chamando a função
    returning * into v_perfil;
  return v_perfil;
end;
$$;

grant execute on function public.update_own_profile(text) to authenticated;
```

`role` e `status` só mudam por ação do owner (via as políticas `is_owner()` acima)
ou por migration manual (bootstrap do primeiro owner, §11).

### 7.3 Reserva atômica (evita presente duplicado em corrida)

Dois convidados podem tentar reservar o último item ao mesmo tempo. Em vez de o
client ler a contagem e depois inserir (janela de corrida), a reserva passa por uma
função de banco que trava a linha do produto durante a checagem:

`guest_telefone` é sempre armazenado **normalizado** (só dígitos, sem máscara, sem
código de país — `normalizar_telefone()` remove tudo que não é número e, quando o
resultado indica DDI `55` na frente, remove esse prefixo também). Sem isso,
`"(11) 99999-9999"`, `"11999999999"` e `"+55 11 99999-9999"` seriam tratados como
convidados diferentes, e tanto a checagem de duplicata quanto o índice único abaixo
deixariam de proteger contra o mesmo convidado reservando duas vezes:

```sql
create or replace function private.normalizar_telefone(p_telefone text)
returns text
language sql
immutable
as $$
  -- 12/13 dígitos = DDI 55 na frente (12 = DDD + fixo, 13 = DDD + celular);
  -- um número nacional legítimo de 10/11 dígitos nunca cai aqui, mesmo os que
  -- começam com "55" (DDD válido no Rio Grande do Sul), porque o total de
  -- dígitos dele é sempre 10 ou 11, nunca 12/13
  select case
    when length(d) in (12, 13) and left(d, 2) = '55' then right(d, length(d) - 2)
    else d
  end
  from (select regexp_replace(p_telefone, '\D', '', 'g') as d) t;
$$;

-- garante que o mesmo convidado (mesmo telefone normalizado) não conte duas
-- vezes contra a quantidade se o pedido de reserva for reenviado (retry de
-- rede, duplo clique)
create unique index reservations_unica_por_convidado
  on public.reservations (product_id, private.normalizar_telefone(guest_telefone))
  where status = 'reservado';

create or replace function public.reserve_product(
  p_product_id uuid, p_guest_nome text, p_guest_telefone text
)
-- devolve só id/status/flag "nova" — nunca a linha completa de
-- reservations: é uma RPC pública (grant a anon), então devolver
-- guest_nome/guest_telefone aqui permitiria qualquer chamador anônimo
-- descobrir quem reservou um item só sabendo (ou testando) um telefone, sem
-- nenhuma autenticação. O "nova" o chamador usa pra decidir se dispara
-- e-mail de notificação, sem que um retry idempotente gere um segundo
-- e-mail para a mesma reserva
returns table (reserva_id uuid, status text, nova boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qtd int;
  v_owner_id uuid;
  v_list_status text;
  v_telefone text := private.normalizar_telefone(p_guest_telefone);
  v_reservados int;
  v_existente_id uuid;
  v_existente_status text;
  v_nova_id uuid;
  v_nova_status text;
begin
  -- telefone inválido/nulo (poucos dígitos, ou nenhum) normalizaria pra uma
  -- string curta, vazia, ou NULL — sem essa checagem, chamadores diferentes
  -- que mandassem um "telefone" sem dígitos suficientes (ou omitindo o
  -- campo) colidiriam no mesmo valor normalizado e cairiam um na reserva do
  -- outro; "NULL < 10" não é verdadeiro nem falso em SQL, então o "is null"
  -- explícito é necessário — sem ele, um telefone omitido passaria batido
  if v_telefone is null or length(v_telefone) < 10 then
    raise exception 'Telefone inválido';
  end if;

  select p.quantidade, l.owner_id, l.status into v_qtd, v_owner_id, v_list_status
    from public.products p
    join public.lists l on l.id = p.list_id
    where p.id = p_product_id
    for update of p;
  if v_qtd is null then
    raise exception 'Produto não encontrado';
  end if;

  -- pedido repetido do mesmo convidado devolve a reserva já feita, em vez de
  -- tentar consumir uma segunda vaga ou estourar em erro — checado antes de
  -- QUALQUER regra de negócio abaixo (dono, lista ativa), de propósito: uma
  -- reserva que já existe continua válida mesmo que o estado por trás dela
  -- tenha mudado depois que o convidado reservou (lista arquivada nesse
  -- meio-tempo, ou a sessão do próprio chamador virando autenticada entre a
  -- tentativa original e um retry de rede tardio) — um retry não pode
  -- estourar erro numa reserva que já foi confirmada com sucesso
  select r.id, r.status into v_existente_id, v_existente_status
    from public.reservations r
    where r.product_id = p_product_id
      and private.normalizar_telefone(r.guest_telefone) = v_telefone
      and r.status = 'reservado';
  if found then
    return query select v_existente_id, v_existente_status, false;
    return;
  end if;

  -- daqui pra baixo só roda pra uma reserva realmente NOVA — o bloco acima
  -- já filtrou qualquer retry de uma reserva existente

  -- o dono da lista não reserva o próprio presente
  if (select auth.uid()) is not null and (select auth.uid()) = v_owner_id then
    raise exception 'Você não pode reservar um item da sua própria lista';
  end if;

  -- mesma regra de visibilidade pública do §7.6 (lista precisa estar
  -- 'ativa') — sem essa checagem aqui, chamar a função direto pela API (RPC
  -- pública, sem passar pela página) permitiria reservar itens de uma lista
  -- arquivada, mesmo que a página pública já não sirva mais essa lista para
  -- ninguém. Nota sobre o trade-off da ordem acima: para uma lista já
  -- arquivada, um telefone com reserva existente ainda recebe sucesso (bloco
  -- de retry acima) e um telefone sem reserva recebe este erro — então quem
  -- já soubesse um telefone conseguiria inferir se ele reservou algo ali,
  -- mesmo após o arquivamento. Essa mesma inferência (achou vs. não achou)
  -- já existe hoje para qualquer lista ativa — é inerente a identificar
  -- convidado só por telefone, sem conta — e não devolve nome nem telefone
  -- (a função não retorna essas colunas, ver comentário no topo), só
  -- confirma que aquele telefone reservou aquele item. Fechar essa brecha
  -- por completo exigiria um token de reserva separado do telefone, fora do
  -- escopo desta spec; o trade-off aceito aqui é priorizar retry idempotente
  -- sobre esconder por completo a existência de reservas em listas
  -- arquivadas.
  if v_list_status <> 'ativa' then
    raise exception 'Esta lista não está mais aceitando reservas';
  end if;

  select count(*) into v_reservados from public.reservations
    where product_id = p_product_id and status = 'reservado';

  if v_reservados >= v_qtd then
    raise exception 'Este item não está mais disponível';
  end if;

  insert into public.reservations (product_id, guest_nome, guest_telefone)
    values (p_product_id, p_guest_nome, v_telefone)
    returning id, status into v_nova_id, v_nova_status;

  return query select v_nova_id, v_nova_status, true;
end;
$$;

grant execute on function public.reserve_product(uuid, text, text) to anon, authenticated;
```

A tabela `reservations` não recebe `insert` direto de `anon` — só através dessa
função. A transação é curta: no caminho normal, um lock de linha + duas buscas
(duplicata + contagem de vagas) + um insert; no caminho de retry (convidado já
tinha reservado), só o lock de linha + a busca da duplicata, sem contagem nem
insert. Sem chamadas externas em nenhum dos dois caminhos, seguindo a prática
recomendada de manter transações curtas para não segurar locks.

**Cancelar uma reserva individual:** a Regra Inviolável #3 (delete+recreate) é
sobre o *produto*, não sobre reservas — exigir excluir o produto inteiro pra
liberar a reserva de um convidado apagaria (via `on delete cascade`, §6) também as
reservas de outros convidados no mesmo item. Por isso existe uma função separada,
usada pela aba Convidados do creator:

```sql
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  -- primeiro confirma que a reserva existe e pertence a uma lista do
  -- usuário logado, seja qual for o status atual dela
  select r.status into v_status
    from public.reservations r
    join public.products p on p.id = r.product_id
    join public.lists l on l.id = p.list_id
    where r.id = p_reservation_id
      and l.owner_id = (select auth.uid())
    for update of r;

  if not found then
    -- id inexistente ou reserva de uma lista que não é sua
    raise exception 'Reserva não encontrada ou você não tem permissão para cancelá-la';
  end if;

  if v_status = 'cancelado' then
    return; -- retry idempotente (duplo clique, retry de rede): já está
            -- cancelada, mesmo comportamento de reserve_product() (§7.3) —
            -- não é erro, só não há nada a fazer
  end if;

  update public.reservations set status = 'cancelado' where id = p_reservation_id;
end;
$$;

grant execute on function public.cancel_reservation(uuid) to authenticated;
```

Cancelar muda `status` para `'cancelado'` (não apaga a linha) — a contagem de
disponibilidade (§6) já só conta `status = 'reservado'`, então o item volta a
ficar disponível imediatamente.

**Onde dispara o e-mail de reserva:** nunca dentro de `reserve_product()` — a
função fica só com banco, sem chamada externa. Quem chama o Resend é a Server
Action que o formulário de reserva do guest invoca: ela chama `reserve_product()`
e só dispara o e-mail se `nova = true` — se `nova = false`, é um retry do mesmo
convidado e o e-mail já foi enviado na primeira vez. O envio acontece já fora de
qualquer transação/lock do Postgres; se o Resend falhar ou demorar, a reserva já
está confirmada — o pior caso é o creator não receber o e-mail, nunca o guest
perder a reserva ou receber notificação duplicada.

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
- Os campos que são segredo de fato (`shopee_app_secret`, `awin_api_key`,
  `admitad_client_secret`) são gravados via **Supabase Vault**
  (`vault.create_secret()`), não como coluna de texto puro — `admin_config` guarda
  só o `id` do segredo no Vault. Editar uma credencial já existente chama
  `vault.update_secret(id, novo_valor)` — nunca cria um segredo órfão novo no Vault
  a cada troca de chave. Campos que são só identificadores públicos
  (`shopee_app_id`, `awin_publisher_id`, `admitad_client_id`) podem continuar como
  coluna normal em `admin_config`.
- O schema `vault` só é acessível ao papel `service_role` por padrão (nem
  `authenticated` consegue consultar `vault.decrypted_secrets`) — isso importa
  porque RLS não protege contra acesso direto ao Postgres (um `pg_dump`, um
  backup, o editor SQL do próprio Supabase); quem tiver esse tipo de acesso bruto
  ainda não lê o segredo em texto puro. Isso implica **dois caminhos de leitura
  diferentes**, que não podem ser confundidos:
  - **Tela de admin (owner edita/visualiza credenciais):** a Server Action
    primeiro confere `is_owner()` na sessão do usuário logado (autorização) e só
    então lê/grava o segredo usando o **cliente admin** (service role) — nunca
    com o client autenticado do próprio usuário.
  - **Conversão de link ao criador colar uma URL (§8):** é código interno do
    sistema, disparado pela ação de qualquer `creator`, não do owner — **não
    passa por `is_owner()`**, porque o creator nunca é dono da plataforma. Essa
    Server Action já usa o cliente admin (service role) diretamente para ler o
    segredo e chamar a API da loja, sem checagem de papel: o creator nunca vê o
    valor do segredo, só o resultado (o produto salvo), então não há nada a
    autorizar além do que a RLS de `products`/`lists` já garante (ele só está
    criando um produto na própria lista).
- `SUPABASE_SERVICE_ROLE_KEY` continua sendo a única exceção que fica em variável de
  ambiente pura, porque ela precisa existir antes de qualquer usuário logar.

Continuam em variável de ambiente (infraestrutura, não dado de negócio):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_ROOT_DOMAIN`.

### 7.5 Imutabilidade de produto

Em vez de uma trigger que bloqueia só alguns campos, a política de RLS de `products`
simplesmente **não tem `update` para o papel `creator`** — só `insert` e `delete`
(nas próprias listas). Sem policy de update, nenhum campo é editável por ninguém
além do owner (que não edita produtos de terceiros de qualquer forma). Mais simples
do que uma trigger e igualmente à prova de falhas.

`products` **não tem policy de `select` para `anon` nem `authenticated`, e nenhuma
das duas roles recebe `grant select` na tabela base** — só `insert`/`delete` para
`authenticated` (creator, restrito às próprias listas). Isso é intencional e é o
ponto central da §7.6: RLS sozinha não esconde uma coluna específica de quem já
pode ler a linha, então a única forma de garantir que `link_afiliado` nunca escape
é impedir qualquer leitura direta da tabela, para qualquer papel que não seja
`service_role`. Isso não pode ficar implícito ("simplesmente não conceder"): a
migration inclui um `revoke` explícito logo após criar a tabela, porque os
privilégios padrão do schema `public` no Supabase costumam conceder `select` a
`anon`/`authenticated` em tabelas novas:

```sql
revoke select on public.products from anon, authenticated;
revoke select on public.reservations from anon, authenticated;
```

### 7.6 Leitura pública

O gate de "essa lista pode ser vista publicamente" é a coluna que já existe em
`lists`: `status = 'ativa'` (uma lista `arquivada` não é servida no subdomínio
público).

```sql
-- lists: anon só lê listas ativas; nunca lê admin_config, secrets, etc.
-- (lists não tem coluna sensível equivalente a link_afiliado, então aqui RLS
-- por linha + seleção explícita de colunas na Server Component já bastam)
create policy lists_leitura_publica on public.lists
  for select
  to anon
  using (status = 'ativa');

grant select on public.lists to anon, authenticated;
```

`lists`: a query pública nunca faz `select *`; a Server Component da página
pública seleciona explicitamente as colunas necessárias (nome, descrição,
aparência, flags), nunca campos internos.

`products`: aqui a coluna sensível (`link_afiliado`) torna o RLS por linha
insuficiente — uma policy de `select` na tabela base sempre devolveria a linha
inteira pra quem tem permissão, expondo o link de afiliado no primeiro
`select('*')` que alguém escrever (foi exatamente esse o defeito encontrado numa
revisão anterior deste documento). A correção não é só criar uma view seletiva:
é também garantir que **a tabela base não tenha nenhum `grant select` para `anon`
ou `authenticated`**, para que uma consulta direta via API (PostgREST/Supabase
client) simplesmente não tenha permissão, RLS à parte. A view roda com o
privilégio de quem a criou (não do papel `anon`/`authenticated`, que nunca tem
select na base) — mas embute manualmente a mesma regra de visibilidade que uma
RLS equivalente teria. Essa regra ("lista ativa, ou eu sou o dono dela") é usada
por duas views (`products_public` e `reservations_public` logo abaixo), então
fica numa função só, pra não haver duas cópias do mesmo `where` divergindo com o
tempo — sem `set search_path`, porque essa função já referencia `public.lists` de
forma totalmente qualificada (não há risco de sequestro de search_path pra
proteger) e, sem essa cláusula, o Postgres consegue *inlinear* a função direto na
consulta da view em vez de rodar uma sub-consulta por linha, evitando a
degradação de performance que uma função com `SET` causaria numa página pública
com muitos produtos:

```sql
create or replace function private.lista_visivel(p_list_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.lists
    where id = p_list_id
      and (status = 'ativa' or owner_id = (select auth.uid()))
  );
$$;

-- diferente de is_owner() (§7.2), esta função NÃO fica travada para
-- anon/authenticated: ela não protege nada sensível, só decide se uma lista é
-- visível (mesma pergunta que a RLS pública já responderia). Concedendo
-- EXECUTE a anon/authenticated, ela continua funcionando mesmo se um dia
-- alguém marcar products_public/reservations_public como
-- security_invoker = true (aí a view passaria a rodar com o privilégio de
-- quem chama, não de quem criou) — sem essa concessão, essa mudança futura
-- quebraria as duas views com "permission denied" sem aviso nenhum aqui.
grant execute on function private.lista_visivel(uuid) to anon, authenticated;

create view public.products_public as
  select p.id, p.list_id, p.nome, p.descricao, p.preco, p.moeda, p.quantidade,
         p.imagem_url, p.created_at
  from public.products p
  where private.lista_visivel(p.list_id);

grant select on public.products_public to anon, authenticated;
```

`auth.uid()` continua funcionando normalmente dentro da view (lê a sessão da
requisição atual, não é afetado pelo privilégio de quem criou a view) — então o
creator, autenticado, vê os próprios produtos mesmo que a lista ainda não esteja
`ativa`, e o guest anônimo só vê produtos de listas ativas. É essa view — nunca a
tabela `products` — que tanto a aba Presentes do creator quanto a página pública
do guest consultam. A tabela base `products` (com `link_afiliado` etc.) só é lida
diretamente pelo código server-side da camada de afiliação (§8) e pelo Route
Handler de redirect abaixo, sempre com o cliente **admin** (service role, que
ignora `grant`/RLS por definição).

O redirect de compra ("ir para a loja") é um Route Handler `GET
/api/go/[productId]` que lê o produto **e a lista dele** com o cliente admin.
Se a lista não está `ativa` **e** quem está chamando não é o dono dela, devolve
um 404 normal — mesma regra de visibilidade de `lista_visivel()` (§7.6), sem a
qual um link `/api/go/[productId]` guardado ou compartilhado continuaria
funcionando para uma lista já arquivada, mesmo com a página pública dela fora
do ar. Passando por essa checagem: se quem está chamando é o próprio dono da
lista (`auth.uid() = list.owner_id` — acontece quando o creator visita a
página pública da própria lista, cenário previsto em §5), o `302` aponta
sempre para `link_original`, nunca para `link_afiliado`. Para qualquer outro
visitante (guest, ou creator que não é dono desta lista), o `302` aponta para
`link_afiliado ?? link_original`. Essa distinção existe porque, diferente de
um payload JSON, o cabeçalho `Location` de um redirect **é visível no
browser** (aba Network, `curl -I`, `fetch(..., {redirect: 'manual'})`) —
devolver sempre `link_afiliado` aqui vazaria o link de afiliado para o próprio
creator assim que ele clicasse "Ir para a loja" na própria lista, violando a
Regra Inviolável #1. O valor do link nunca aparece em um payload JSON entregue
ao browser, em nenhum dos dois casos.

`reservations`: mesmo raciocínio de `products` — a tabela base não tem `grant
select` para `anon`/`authenticated` (só `insert`, indiretamente, via
`reserve_product()`, §7.3), e uma view expõe só o necessário:

```sql
create view public.reservations_public as
  select r.id, r.product_id, r.status
  from public.reservations r
  join public.products p on p.id = r.product_id
  where private.lista_visivel(p.list_id);

grant select on public.reservations_public to anon, authenticated;
```

A página pública e a aba Presentes usam essa view só pra saber se um
`product_id` está com `status = 'reservado'` (pinta o card como indisponível) —
`guest_nome`/`guest_telefone` nunca aparecem nela. A aba Convidados (que precisa
mostrar nome e telefone de quem reservou) é uma tela só do creator: lê a tabela
`reservations` completa através de uma Server Action com o cliente admin, depois
de confirmar que a lista pertence ao usuário logado — não por RLS de `select` na
tabela base, pelo mesmo motivo acima (evitar que qualquer `grant select` na base
vire uma porta de saída para dados que deveriam passar só pela view).

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
número vindo de `admin_config.whatsapp_numero`. Como a RLS de `admin_config`
(§7.4) não dá `select` a `anon` em nenhuma circunstância, esse número nunca é
lido direto pelo client — a Server Component da página pública o busca com o
cliente admin (mesmo padrão do Route Handler de redirect, §7.6) e repassa só o
número em si para o popup, nunca o restante de `admin_config`.

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
- **GitHub:** repositório dedicado a este projeto —
  `https://github.com/euleodesigner/garimpo.git` (já criado, vazio, configurado
  como `origin` local).
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
  (API oficial). A tela de admin pra cadastrar credenciais só é construída na
  Fase 5 — então, pra testar a conversão Shopee nesta fase, as credenciais reais
  são inseridas direto via SQL editor do Supabase (mesmo espírito do bootstrap
  manual do primeiro owner na Fase 1): `shopee_app_id` com um `update
  admin_config` normal (é identificador público, coluna de texto — §7.4), e
  `shopee_app_secret` com `select vault.create_secret(...)` (é segredo de fato).
  Até a Fase 5 trazer a tela de verdade. Também nesta fase: scraping via cheerio
  + fallback manual, popup de WhatsApp.
- **Fase 5 — Admin:** config de afiliados (armazenada em `admin_config`, §7.4) —
  agora com a tela de verdade para o owner editar as credenciais inseridas
  manualmente na Fase 4, tabela de usuários, banner, WhatsApp.
- **Fase 6 — Notificações + Deploy:** e-mail de reserva via Resend, deploy no
  EasyPanel, teste do fluxo completo com usuários reais.

## 12. Como trabalhar neste projeto

Mantido da spec original: explicações em português claro, sem assumir conhecimento
profundo de programação; avisar antes de comandos destrutivos; nunca expor segredos
em logs/prints/commits; parar e pedir quando faltar uma credencial em vez de
inventar valores; soluções simples antes de soluções "espertas"; alertar sobre
qualquer risco de segurança antes de implementar.
