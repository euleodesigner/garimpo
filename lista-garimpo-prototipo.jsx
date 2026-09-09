import React, { useState, useMemo } from "react";

/*
  LISTA GARIMPO — Protótipo clicável (dados simulados / mock)
  ------------------------------------------------------------
  Três visões, alternáveis pelo seletor no topo:
    1) Admin (dono da plataforma) — config de afiliados + tabela de usuários
    2) Criador — monta a lista (baseado nos prints, sem a parte financeira)
    3) Convidado — vê a lista pública e reserva itens

  A CAMADA DE AFILIAÇÃO É SIMULADA aqui. Nada de API real ainda.
  O objetivo é validar a experiência antes de construir o backend (Supabase).

  Identidade visual: tema "garimpo" — peneirar achados. Tons de terra
  quentes + verde-jade, tipografia com um display sério. Sem copiar o
  azul do concorrente.
*/

// ---------- TOKENS DE ESTILO ----------
const T = {
  bg: "#F5F0E8",        // areia clara
  ink: "#241E17",       // marrom quase preto
  sub: "#6B5D4F",       // marrom médio (texto secundário)
  line: "#E2D8C8",      // linhas
  card: "#FFFDF9",      // cartão creme
  clay: "#B4552D",      // terracota queimada (ação primária)
  clayDark: "#8E3F1F",
  jade: "#1F6F5C",      // verde-jade (sucesso / reservado)
  jadeSoft: "#E3EFEA",
  gold: "#C08A2D",      // ouro garimpado (destaques)
  danger: "#A8352B",
};

const chip = (bg, fg) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  background: bg, color: fg, fontSize: 12, fontWeight: 600,
  padding: "3px 10px", borderRadius: 999,
});

// ---------- DADOS SIMULADOS ----------
const LOJAS = {
  shopee:  { nome: "Shopee",        modo: "API oficial",      comissao: true,  cor: "#EE4D2D" },
  shein:   { nome: "SHEIN",         modo: "Rede (Awin)",      comissao: true,  cor: "#111" },
  temu:    { nome: "TEMU",          modo: "Rede (Admitad)",   comissao: true,  cor: "#FF7A1A" },
  magalu:  { nome: "Magalu",        modo: "Rede (Awin)",      comissao: true,  cor: "#0086FF" },
  amazon:  { nome: "Amazon",        modo: "Link cru",         comissao: false, cor: "#FF9900" },
  ml:      { nome: "Mercado Livre", modo: "Link cru",         comissao: false, cor: "#FFE600" },
  outra:   { nome: "Outra loja",    modo: "Link cru",         comissao: false, cor: "#999" },
};

// detecta a loja pelo domínio do link colado (simulado)
function detectarLoja(url) {
  const u = url.toLowerCase();
  if (u.includes("shopee")) return "shopee";
  if (u.includes("shein")) return "shein";
  if (u.includes("temu")) return "temu";
  if (u.includes("magalu") || u.includes("magazineluiza")) return "magalu";
  if (u.includes("amazon") || u.includes("amzn")) return "amazon";
  if (u.includes("mercadolivre") || u.includes("mercadolibre")) return "ml";
  if (u.trim() === "") return null;
  return "outra";
}

const PRODUTOS_INICIAIS = [
  { id: 1, nome: "Camiseta Polo Infantil com Bordado - Tam 1", preco: "59,90", loja: "shopee", img: "👕", qtd: 1, reservadoPor: null },
  { id: 2, nome: "Jardineira Curta Denim - Tam 1", preco: "159,00", loja: "shein", img: "👖", qtd: 1, reservadoPor: null },
  { id: 3, nome: "Livro com sons - Conhecendo os Sons da Fazenda", preco: "41,75", loja: "magalu", img: "📚", qtd: 1, reservadoPor: "Amanda C." },
  { id: 4, nome: "Conjunto Moletom Estampa Mickey - Tam 12m", preco: "89,90", loja: "temu", img: "🧸", qtd: 1, reservadoPor: null },
  { id: 5, nome: "Sandália Infantil - Tam 20", preco: "99,90", loja: "amazon", img: "👟", qtd: 1, reservadoPor: null },
];

const USUARIOS = [
  { id: 1, nome: "Leonardo Pereira", email: "pereiraleoadm@gmail.com", cadastro: "23/08/2025", listas: 1, status: "ativo" },
  { id: 2, nome: "Marina Duarte", email: "marina.d@gmail.com", cadastro: "01/09/2025", listas: 3, status: "ativo" },
  { id: 3, nome: "Rafael Nunes", email: "rafa.nunes@hotmail.com", cadastro: "04/09/2025", listas: 0, status: "inativo" },
  { id: 4, nome: "Camila Torres", email: "camila.t@outlook.com", cadastro: "06/09/2025", listas: 2, status: "ativo" },
];

// ============================================================
export default function ListaGarimpo() {
  const [view, setView] = useState("criador");
  const [logado, setLogado] = useState(false);   // controla se mostra auth ou o app

  // Banner promocional — configurado no Admin, exibido pro convidado.
  // Leva o público comprador pro grupo de ofertas (onde os links já são seus de afiliado).
  const [banner, setBanner] = useState({
    ativo: true,
    titulo: "Quer encontrar produtos com desconto para sua lista?",
    texto: "Entre no grupo oficial do Garimpo Marisa e encontre seus presentes com o melhor desconto!",
    link: "https://chat.whatsapp.com/seu-grupo-aqui",
    cta: "Entrar no grupo",
    lojas: ["shopee", "amazon", "ml", "magalu", "shein", "temu"],
  });

  // A visão do convidado é pública (não exige login). Criador e Admin exigem.
  const precisaLogin = (view === "criador" || view === "admin") && !logado;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* seletor de visão do protótipo */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: T.ink,
        color: "#F5F0E8", padding: "10px 20px", display: "flex",
        alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5 }}>
          ⛏️ Lista Garimpo <span style={{ opacity: .5, fontWeight: 400, fontSize: 13 }}>· protótipo</span>
        </span>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
          {[
            ["criador", "👤 Criador da lista"],
            ["convidado", "🎁 Convidado"],
            ["admin", "🛠️ Admin (dono)"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              style={{ cursor: "pointer", border: "none", borderRadius: 8,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                background: view === k ? T.clay : "rgba(255,255,255,.1)",
                color: "#F5F0E8" }}>
              {label}
            </button>
          ))}
          {/* estado de login (só afeta criador/admin) */}
          <span style={{ width: 1, height: 20, background: "rgba(255,255,255,.2)", margin: "0 4px" }} />
          <button onClick={() => setLogado(!logado)}
            style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8,
              padding: "7px 12px", fontSize: 12.5, fontWeight: 600, background: "transparent", color: "#F5F0E8" }}>
            {logado ? "Sair" : "Deslogado"}
          </button>
        </div>
      </div>

      {precisaLogin
        ? <Auth onEntrar={() => setLogado(true)} />
        : <>
            {view === "criador" && <Criador />}
            {view === "convidado" && <Convidado banner={banner} />}
            {view === "admin" && <Admin banner={banner} setBanner={setBanner} />}
          </>}
    </div>
  );
}

// ============================================================
// AUTENTICAÇÃO — login / cadastro / esqueci a senha
// ============================================================
function Auth({ onEntrar }) {
  const [modo, setModo] = useState("login"); // login | cadastro | recuperar
  const [enviado, setEnviado] = useState(false);

  return (
    <div style={{ minHeight: "calc(100vh - 44px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⛏️</div>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>LISTA GARIMPO</div>
        </div>

        <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 18, padding: 28 }}>
          {modo === "login" && (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Entrar ✌️</h1>
              <p style={{ margin: "0 0 22px", color: T.sub, fontSize: 14 }}>Faça login para acessar sua conta.</p>
              <label style={lbl}>E-mail *</label>
              <input type="email" style={inp} placeholder="voce@email.com" />
              <label style={lbl}>Senha *</label>
              <input type="password" style={inp} placeholder="••••••••" />
              <button onClick={onEntrar} style={{ ...btnPrimary, width: "100%", marginTop: 20 }}>Entrar</button>
              <p style={{ textAlign: "center", fontSize: 13.5, color: T.sub, marginTop: 18 }}>
                Não tem uma conta?{" "}
                <button onClick={() => setModo("cadastro")} style={linkBtn}>Cadastre-se</button>
              </p>
              <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 4 }}>
                <button onClick={() => { setModo("recuperar"); setEnviado(false); }} style={linkBtn}>Esqueci minha senha</button>
              </p>
            </>
          )}

          {modo === "cadastro" && (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Criar conta 🎉</h1>
              <p style={{ margin: "0 0 22px", color: T.sub, fontSize: 14 }}>Comece a montar suas listas de presentes.</p>
              <label style={lbl}>Nome *</label>
              <input style={inp} placeholder="Seu nome" />
              <label style={lbl}>E-mail *</label>
              <input type="email" style={inp} placeholder="voce@email.com" />
              <label style={lbl}>Senha *</label>
              <input type="password" style={inp} placeholder="Crie uma senha" />
              <button onClick={onEntrar} style={{ ...btnPrimary, width: "100%", marginTop: 20 }}>Criar conta</button>
              <p style={{ textAlign: "center", fontSize: 13.5, color: T.sub, marginTop: 18 }}>
                Já tem conta?{" "}
                <button onClick={() => setModo("login")} style={linkBtn}>Entrar</button>
              </p>
            </>
          )}

          {modo === "recuperar" && (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Recuperar senha 🔑</h1>
              {enviado ? (
                <>
                  <p style={{ margin: "14px 0 0", color: T.jade, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                    ✓ Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
                  </p>
                  <button onClick={() => setModo("login")} style={{ ...btnGhost, marginTop: 18, padding: "10px 0" }}>← Voltar ao login</button>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 22px", color: T.sub, fontSize: 14, lineHeight: 1.5 }}>
                    Informe seu e-mail e enviaremos um link para você criar uma nova senha.
                  </p>
                  <label style={lbl}>E-mail *</label>
                  <input type="email" style={inp} placeholder="voce@email.com" />
                  <button onClick={() => setEnviado(true)} style={{ ...btnPrimary, width: "100%", marginTop: 20 }}>
                    Enviar link de redefinição
                  </button>
                  <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 18 }}>
                    <button onClick={() => setModo("login")} style={linkBtn}>← Voltar ao login</button>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VISÃO 1 — CRIADOR
// ============================================================
// tela: "listas" (painel) | "criar" (fluxo 2 passos) | "lista" (dentro da lista)
function Criador() {
  const [tela, setTela] = useState("listas");
  const [listas, setListas] = useState([
    { id: 1, nome: "Lucca 1 aninho", tipo: "🎂 Aniversário", convidados: 7, produtos: 5, status: "ativa" },
  ]);
  const [listaAtiva, setListaAtiva] = useState(null);

  if (tela === "listas") {
    return <MinhasListas listas={listas}
      onCriar={() => setTela("criar")}
      onAbrir={(l) => { setListaAtiva(l); setTela("lista"); }} />;
  }
  if (tela === "criar") {
    return <CriarLista
      onCancelar={() => setTela("listas")}
      onConcluir={(nova) => {
        const l = { id: Date.now(), ...nova, convidados: 0, produtos: 0, status: "ativa" };
        setListas([...listas, l]);
        setListaAtiva(l);
        setTela("lista");
      }} />;
  }
  return <DentroDaLista lista={listaAtiva} onVoltar={() => setTela("listas")} />;
}

// ---- Painel: Minhas Listas ----
function MinhasListas({ listas, onCriar, onAbrir }) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>Minhas listas</h1>
          <p style={{ color: T.sub, margin: "4px 0 0" }}>Todas as suas listas de presentes.</p>
        </div>
        <button onClick={onCriar} style={{ cursor: "pointer", border: "none", background: T.clay,
          color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>
          + Criar lista
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "22px 0" }}>
        <span style={{ ...chip(T.card, T.ink), boxShadow: "0 1px 0 " + T.line, padding: "8px 16px" }}>🎁 Ativas</span>
        <span style={{ ...chip("transparent", T.sub), padding: "8px 16px" }}>📦 Arquivadas</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {listas.map(l => (
          <div key={l.id} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{l.nome}</h3>
              <div style={{ width: 52, height: 52, borderRadius: 999, background: T.bg,
                display: "grid", placeItems: "center", fontSize: 24 }}>👶</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "14px 0", color: T.sub, fontSize: 14 }}>
              <span>😋 {l.convidados} convidados</span>
              <span>🎁 {l.produtos} produtos</span>
              <span style={chip(T.jadeSoft, T.jade)}>{l.tipo}</span>
            </div>
            <button onClick={() => onAbrir(l)} style={{ cursor: "pointer", width: "100%",
              border: "1px solid " + T.line, background: "transparent", color: T.ink,
              fontWeight: 700, fontSize: 14, padding: "11px 0", borderRadius: 10 }}>
              Gerenciar lista →
            </button>
          </div>
        ))}
      </div>
      <p style={{ color: T.sub, fontSize: 13, marginTop: 16 }}>Mostrando {listas.length} de {listas.length} listas.</p>
    </div>
  );
}

// ---- Fluxo de criação em 2 passos ----
function CriarLista({ onCancelar, onConcluir }) {
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");
  const [tipo, setTipo] = useState("🎂 Aniversário");
  const [url, setUrl] = useState("");

  const tipos = ["🏠 Chá de Casa Nova","👶 Chá de Bebê","💍 Casamento","🎂 Aniversário",
    "🍳 Chá de Panela","🍽️ Chá de Cozinha","💑 Noivado","🍼 Chá de Fraldas","💛 Chá Revelação",
    "👑 Quinze Anos","🎓 Formatura","💕 Chá de Lingerie","🎅 Amigo Secreto","🎈 Festa Infantil",
    "🌽 Festa Junina","💎 Bodas","🐾 Festinha do Pet","⛪ Evento da Igreja","❤️ Dia dos Namorados",
    "🎄 Natal","🛒 Compras","📚 Material Escolar","✨ Outro"];

  // sugere URL a partir do nome
  const urlSugerida = url || (nome ? nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) + "-" + Math.random().toString(36).slice(2, 6) : "");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 40 }}>⛏️</div>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 0.5 }}>LISTA GARIMPO</div>
      </div>

      {/* indicador de passo */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {[1, 2].map(n => (
          <div key={n} style={{ width: 40, height: 5, borderRadius: 999,
            background: passo >= n ? T.clay : T.line }} />
        ))}
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 16, padding: 26 }}>
        {passo === 1 ? (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800 }}>🎉 Dê um nome à sua lista</h2>
            <p style={{ margin: "0 0 20px", color: T.sub, fontSize: 14, lineHeight: 1.5 }}>
              Você sempre pode mudar isso depois, então mantenha simples por enquanto.
            </p>
            <label style={lbl}>Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} style={inp}
              placeholder="Ex.: Chá de Panela da Renata e do João" />
            <label style={lbl}>Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              style={{ ...inp, minHeight: 100, resize: "vertical" }}
              placeholder="Conte um pouco sobre o evento (opcional)" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
              <button onClick={onCancelar} style={btnGhost}>Cancelar</button>
              <button onClick={() => nome && setPasso(2)}
                style={{ ...btnPrimary, opacity: nome ? 1 : .5, cursor: nome ? "pointer" : "not-allowed" }}>
                Próximo →
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800 }}>🛠️ Que tipo de evento é?</h2>
            <p style={{ margin: "0 0 20px", color: T.sub, fontSize: 14 }}>
              Isso ajuda a organizar sua lista e o endereço público dela.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
              gap: 8, maxHeight: 280, overflowY: "auto", padding: 2 }}>
              {tipos.map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  style={{ cursor: "pointer", padding: "14px 6px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: tipo === t ? T.jadeSoft : "#fff",
                    border: "1.5px solid " + (tipo === t ? T.jade : T.line),
                    color: tipo === t ? T.jade : T.ink }}>
                  {t}
                </button>
              ))}
            </div>
            <label style={{ ...lbl, marginTop: 20 }}>Endereço público *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input value={urlSugerida} onChange={e => setUrl(e.target.value)} style={{ ...inp, flex: 1 }} />
              <span style={{ color: T.sub, fontSize: 14, whiteSpace: "nowrap" }}>.listagarimpo.com.br</span>
            </div>
            <p style={{ color: T.sub, fontSize: 12.5, margin: "6px 0 0" }}>Este será o endereço público da sua lista.</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
              <button onClick={() => setPasso(1)} style={btnGhost}>← Voltar</button>
              <button onClick={() => onConcluir({ nome, desc, tipo, url: urlSugerida })}
                style={btnPrimary}>Criar lista</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Dentro da lista (as abas de gestão) ----
function DentroDaLista({ lista, onVoltar }) {
  const [aba, setAba] = useState("presentes");
  const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS);
  const [modal, setModal] = useState(false);

  const menu = [
    ["presentes", "🎁 Presentes"],
    ["recadinhos", "💬 Recadinhos"],
    ["convidados", "😋 Convidados"],
    ["compartilhar", "🔗 Compartilhar"],
    ["evento", "📅 Info. do Evento"],
    ["aparencia", "🎨 Aparência"],
    ["config", "🛠️ Configurações"],
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      <button onClick={onVoltar} style={{ ...btnGhost, padding: "6px 0", marginBottom: 10 }}>← Minhas listas</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 34, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>{lista?.nome || "Lista"}</h1>
        <span style={chip(T.jadeSoft, T.jade)}>Lista ativa</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24, marginTop: 24 }}>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {menu.map(([k, label]) => (
            <button key={k} onClick={() => setAba(k)}
              style={{ textAlign: "left", cursor: "pointer", border: "none",
                borderRadius: 10, padding: "11px 14px", fontSize: 14.5, fontWeight: 600,
                background: aba === k ? T.card : "transparent",
                color: aba === k ? T.ink : T.sub,
                boxShadow: aba === k ? "0 1px 0 " + T.line : "none" }}>
              {label}
            </button>
          ))}
        </nav>

        <div>
          {aba === "presentes" && (
            <PresentesCriador produtos={produtos} setProdutos={setProdutos}
              abrirModal={() => setModal(true)} />
          )}
          {aba === "config" && <ConfigEvento />}
          {aba === "aparencia" && <Aparencia />}
          {aba === "evento" && <InfoEvento />}
          {aba === "compartilhar" && <Compartilhar />}
          {aba === "convidados" && <ConvidadosCriador />}
          {aba === "recadinhos" && <RecadinhosCriador />}
        </div>
      </div>

      {modal && <ModalCriarPresente onClose={() => setModal(false)}
        onSalvar={(p) => { setProdutos([...produtos, p]); setModal(false); }} />}
    </div>
  );
}

function PresentesCriador({ produtos, setProdutos, abrirModal }) {
  function excluir(id) { setProdutos(produtos.filter(p => p.id !== id)); }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input placeholder="Pesquisar presente…" style={{ flex: 1, minWidth: 180,
          padding: "11px 14px", borderRadius: 10, border: "1px solid " + T.line,
          background: T.card, fontSize: 14 }} />
        <button onClick={abrirModal} style={{ cursor: "pointer", border: "none",
          background: T.clay, color: "#fff", fontWeight: 700, fontSize: 14,
          padding: "11px 20px", borderRadius: 10 }}>+ Adicionar presente</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {produtos.map(p => {
          return (
            <div key={p.id} style={{ display: "flex", gap: 14, alignItems: "center",
              background: T.card, border: "1px solid " + T.line, borderRadius: 14, padding: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, background: T.bg,
                display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>{p.img}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nome}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>R$ {p.preco}</span>
                  {p.reservadoPor && <span style={chip("#EFE7D8", T.gold)}>🔒 reservado por {p.reservadoPor}</span>}
                </div>
              </div>
              <button onClick={() => excluir(p.id)}
                style={{ cursor: "pointer", border: "1px solid " + T.line, background: "transparent",
                  color: T.danger, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
                Excluir
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: T.sub, marginTop: 16, lineHeight: 1.5 }}>
        Depois de criado, o card não pode ser editado — para trocar algo, exclua e cadastre de novo.
      </p>
    </div>
  );
}

function ModalCriarPresente({ onClose, onSalvar }) {
  const [url, setUrl] = useState("");
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [puxado, setPuxado] = useState(false);
  const [mostrarCupom, setMostrarCupom] = useState(false);

  // WhatsApp do Garimpo da Marisa (no sistema real, virá do painel Admin)
  const WHATS = "5512999999999";

  // detecção da loja acontece nos bastidores — NUNCA é mostrada ao criador.
  // guardamos internamente só para salvar o produto com a loja certa.
  const loja = detectarLoja(url);

  // busca automática e silenciosa dos dados do produto ao sair do campo do link
  function buscarAutomatico() {
    if (!url.trim()) return;
    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      setPuxado(true);
      if (!nome) setNome("Produto importado");
      if (!preco) setPreco("79,90");
      // se a loja não é afiliável automaticamente (sem API / sem autorização),
      // oferece o atalho para o WhatsApp do Garimpo. Nada disso menciona "comissão".
      const info = loja ? LOJAS[loja] : null;
      if (info && !info.comissao) setMostrarCupom(true);
    }, 900);
  }

  function abrirWhats() {
    const msg = "Olá, vim do Lista Garimpo e quero um link com desconto para este produto: " + url;
    window.open("https://wa.me/" + WHATS + "?text=" + encodeURIComponent(msg), "_blank");
    setMostrarCupom(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,.5)",
      display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 18,
        padding: 26, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Adicionar presente</h2>
        <p style={{ margin: "0 0 20px", color: T.sub, fontSize: 14 }}>
          Cole o link do produto de qualquer loja e a gente preenche o resto.
        </p>

        <label style={lbl}>Link do produto</label>
        <input value={url}
          onChange={e => { setUrl(e.target.value); setPuxado(false); }}
          onBlur={buscarAutomatico}
          placeholder="Cole aqui o link da loja (Shopee, Magalu, SHEIN…)"
          style={inp} />
        {carregando && (
          <p style={{ margin: "8px 0 0", color: T.sub, fontSize: 13 }}>Buscando dados do produto…</p>
        )}
        {puxado && !carregando && (
          <p style={{ margin: "8px 0 0", color: T.jade, fontSize: 13, fontWeight: 600 }}>
            ✓ Encontramos o produto. Confira as informações abaixo.
          </p>
        )}

        <label style={lbl}>Nome do produto</label>
        <input value={nome} onChange={e => setNome(e.target.value)} style={inp}
          placeholder="Ex.: Camiseta Polo Infantil" />

        <label style={lbl}>Preço (R$)</label>
        <input value={preco} onChange={e => setPreco(e.target.value)} style={inp}
          placeholder="Ex.: 59,90" />

        <label style={lbl}>Imagem</label>
        <div style={{ padding: 18, border: "1.5px dashed " + T.line, borderRadius: 12,
          textAlign: "center", color: T.sub, fontSize: 13, background: T.bg }}>
          {puxado
            ? "🖼️ Imagem carregada automaticamente"
            : "Arraste e solte uma imagem, ou preenchemos automaticamente pelo link"}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ cursor: "pointer", border: "none",
            background: "transparent", color: T.sub, fontWeight: 600, fontSize: 14, padding: "10px 14px" }}>
            Cancelar
          </button>
          <button
            onClick={() => nome && preco && url.trim() && onSalvar({
              id: Date.now(), nome, preco, loja: loja || "outra", img: "🎁", qtd: 1, reservadoPor: null,
            })}
            style={{ cursor: "pointer", border: "none", background: T.clay, color: "#fff",
              fontWeight: 700, fontSize: 14, padding: "10px 22px", borderRadius: 10 }}>
            Salvar presente
          </button>
        </div>

        {/* popup: link/cupom com desconto via WhatsApp (lojas sem afiliação automática) */}
        {mostrarCupom && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,.6)",
            display: "grid", placeItems: "center", zIndex: 200, padding: 16 }}>
            <div style={{ background: T.card, borderRadius: 18, padding: 26, width: "100%", maxWidth: 380,
              position: "relative", textAlign: "center" }}>
              <button onClick={() => setMostrarCupom(false)} aria-label="Fechar"
                style={{ position: "absolute", top: 12, right: 14, cursor: "pointer", border: "none",
                  background: "transparent", color: T.sub, fontSize: 20, lineHeight: 1 }}>×</button>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔎</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                Achamos que dá para pagar menos nesse produto
              </h3>
              <p style={{ margin: "0 0 20px", color: T.sub, fontSize: 14, lineHeight: 1.5 }}>
                Você pode encontrar um cupom ou um link mais barato desse produto com o
                Garimpo da Marisa. Deseja entrar em contato?
              </p>
              <button onClick={abrirWhats}
                style={{ cursor: "pointer", border: "none", background: "#25D366", color: "#fff",
                  fontWeight: 800, fontSize: 15, padding: "13px 0", borderRadius: 12, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🟢</span> Entrar em contato
              </button>
              <button onClick={() => setMostrarCupom(false)}
                style={{ cursor: "pointer", border: "none", background: "transparent", color: T.sub,
                  fontWeight: 600, fontSize: 13, padding: "12px 0 0", width: "100%" }}>
                Agora não, seguir com este link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigEvento() {
  const tipos = ["🏠 Chá de Casa Nova","👶 Chá de Bebê","💍 Casamento","🎂 Aniversário",
    "🍳 Chá de Panela","🎓 Formatura","👑 Quinze Anos","🐾 Festinha do Pet","🎄 Natal","✨ Outro"];
  const [sel, setSel] = useState("🎂 Aniversário");
  return (
    <Bloco titulo="Configure sua lista" sub="Escolha o tipo do evento e o endereço público da lista.">
      <label style={lbl}>Tipo de evento</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
        {tipos.map(t => (
          <button key={t} onClick={() => setSel(t)}
            style={{ cursor: "pointer", padding: "16px 8px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: sel === t ? T.jadeSoft : T.card,
              border: "1.5px solid " + (sel === t ? T.jade : T.line),
              color: sel === t ? T.jade : T.ink }}>
            {t}
          </button>
        ))}
      </div>
      <label style={{ ...lbl, marginTop: 20 }}>Endereço público</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input defaultValue="aniversario-kvqj" style={{ ...inp, flex: 1 }} />
        <span style={{ color: T.sub, fontSize: 14 }}>.listagarimpo.com.br</span>
      </div>
      <SalvarBtn />
    </Bloco>
  );
}

function Aparencia() {
  const [cor, setCor] = useState(T.clay);
  const cores = [T.clay, T.jade, T.gold, "#7A4EAB", "#2D6AA8", T.ink];
  return (
    <Bloco titulo="Personalize sua lista" sub="Nome, descrição, cor, banner, foto de perfil e redes sociais.">
      <label style={lbl}>Nome</label>
      <input defaultValue="Lucca 1 aninho" style={inp} />
      <label style={lbl}>Descrição</label>
      <textarea defaultValue="Sugestões de presentes para o aniversário do Lucca. Roupas Tam 1 ou 12–18 meses."
        style={{ ...inp, minHeight: 90, resize: "vertical" }} />
      <label style={lbl}>Cor principal</label>
      <div style={{ display: "flex", gap: 10 }}>
        {cores.map(c => (
          <button key={c} onClick={() => setCor(c)} style={{ width: 38, height: 38, borderRadius: 10,
            background: c, cursor: "pointer", border: cor === c ? "3px solid " + T.ink : "2px solid " + T.line }} />
        ))}
      </div>
      <label style={lbl}>Banner e foto de perfil</label>
      <div style={{ padding: 18, border: "1.5px dashed " + T.line, borderRadius: 12,
        textAlign: "center", color: T.sub, fontSize: 13, background: T.bg }}>
        Arraste e solte, ou selecione entre seus arquivos
      </div>
      <label style={lbl}>Redes sociais</label>
      <input placeholder="@ do Instagram ou URL" style={inp} />
      <input placeholder="@ do TikTok ou URL" style={{ ...inp, marginTop: 8 }} />
      <SalvarBtn />
    </Bloco>
  );
}

function InfoEvento() {
  const [maps, setMaps] = useState(true);
  return (
    <Bloco titulo="Compartilhe os detalhes do seu evento" sub="Informe data, hora e local da celebração.">
      <label style={lbl}>Localização</label>
      <input placeholder="Ex.: Rua dos Bobos, 0" style={inp} />
      <label style={lbl}>Data e hora</label>
      <input type="datetime-local" style={inp} />
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, cursor: "pointer" }}>
        <input type="checkbox" checked={maps} onChange={e => setMaps(e.target.checked)} style={{ marginTop: 3 }} />
        <span><b>Link do Google Maps</b><br />
          <span style={{ color: T.sub, fontSize: 13 }}>Ao clicar no local, o convidado abre o endereço no Google Maps.</span></span>
      </label>
      <SalvarBtn />
    </Bloco>
  );
}

function Compartilhar() {
  return (
    <Bloco titulo="Compartilhe sua lista" sub="Envie o link para família e amigos verem e escolherem presentes.">
      <label style={lbl}>URL da lista</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value="https://aniversario-kvqj.listagarimpo.com.br/" style={{ ...inp, flex: 1 }} />
        <button style={{ cursor: "pointer", border: "none", background: T.ink, color: "#fff",
          padding: "0 16px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Copiar</button>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ width: 150, height: 150, borderRadius: 12, background: "#fff",
          border: "1px solid " + T.line, display: "grid", placeItems: "center", fontSize: 13, color: T.sub }}>
          [ QR Code ]
        </div>
        <p style={{ color: T.sub, fontSize: 13.5, maxWidth: 260, lineHeight: 1.5 }}>
          QR Code gerado automaticamente. (Sem personalização de cores, conforme combinado.)
        </p>
      </div>
    </Bloco>
  );
}

function ConvidadosCriador() {
  const convidados = [
    ["Julia", "+55 12 99612-2030", "1 produto"],
    ["Thays de Souza Neves", "+55 12 99177-0414", "1 produto"],
    ["Amanda Cristina Delfino", "+55 12 98273-3552", "1 produto"],
  ];
  return (
    <Bloco titulo="Esses são seus convidados" sub="Quem escolheu um presente aparece aqui. RSVP e notificações por e-mail estão ativos.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {convidados.map(([n, tel, prod]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: 12, borderRadius: 12, border: "1px solid " + T.line, background: T.card }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: T.jadeSoft,
              display: "grid", placeItems: "center", fontWeight: 700, color: T.jade }}>
              {n[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div>
              <div style={{ color: T.sub, fontSize: 13 }}>{tel}</div>
            </div>
            <span style={chip("#EFE7D8", T.gold)}>{prod}</span>
          </div>
        ))}
      </div>
    </Bloco>
  );
}

function RecadinhosCriador() {
  return (
    <Bloco titulo="Recadinhos" sub="Recados públicos que seus convidados deixam na lista.">
      {[["Amanda C.", "Parabéns Lucca! Muita saúde 🎉"],
        ["Tio Rafa", "Chegando com tudo na festa!"]].map(([n, msg]) => (
        <div key={n} style={{ padding: 14, borderRadius: 12, border: "1px solid " + T.line,
          background: T.card, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div>
          <div style={{ color: T.sub, fontSize: 14, marginTop: 3 }}>{msg}</div>
        </div>
      ))}
    </Bloco>
  );
}

// ============================================================
// VISÃO 2 — CONVIDADO
// ============================================================
function Convidado({ banner }) {
  const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS);
  const [modalReserva, setModalReserva] = useState(null);

  function reservar(id, nome) {
    setProdutos(produtos.map(p => p.id === id ? { ...p, reservadoPor: nome } : p));
    setModalReserva(null);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 40px" }}>
      {/* banner */}
      <div style={{ height: 150, background: "linear-gradient(120deg," + T.clay + "," + T.gold + ")" }} />
      <div style={{ padding: "0 20px", marginTop: -40 }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, background: T.card,
          border: "4px solid " + T.bg, display: "grid", placeItems: "center", fontSize: 40 }}>👶</div>
        <h1 style={{ fontSize: 30, margin: "12px 0 4px", fontWeight: 800 }}>Lucca 1 aninho</h1>
        <p style={{ color: T.sub, margin: 0, maxWidth: 560, lineHeight: 1.55 }}>
          Sugestões de presentes para o aniversário do Lucca. Escolha um item para
          reservá-lo — assim ninguém compra o mesmo presente que você. 🎈
        </p>

        {/* banner promocional (config no Admin) */}
        {banner?.ativo && (
          <div style={{ marginTop: 22 }}>
            <BannerPromo banner={banner} />
          </div>
        )}

        {/* abas convidado */}
        <div style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, margin: "24px 0 20px" }}>
          {["Presentes", "Recadinhos", "Confirmar presença"].map((a, i) => (
            <div key={a} style={{ padding: "0 0 12px", fontWeight: 700, fontSize: 14.5,
              color: i === 0 ? T.ink : T.sub,
              borderBottom: i === 0 ? "2px solid " + T.clay : "2px solid transparent" }}>{a}</div>
          ))}
        </div>

        {/* lista de presentes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {produtos.map(p => {
            const reservado = !!p.reservadoPor;
            return (
              <div key={p.id} style={{ background: T.card, border: "1px solid " + T.line,
                borderRadius: 16, overflow: "hidden", opacity: reservado ? .72 : 1 }}>
                <div style={{ height: 120, background: T.bg, display: "grid", placeItems: "center", fontSize: 44 }}>{p.img}</div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3, minHeight: 38 }}>{p.nome}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, margin: "8px 0" }}>R$ {p.preco}</div>
                  {reservado ? (
                    <div style={{ ...chip(T.jadeSoft, T.jade), width: "100%", justifyContent: "center", padding: "9px 0" }}>
                      🔒 Reservado por {p.reservadoPor}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => setModalReserva(p)}
                        style={{ cursor: "pointer", border: "none", background: T.jade, color: "#fff",
                          fontWeight: 700, padding: "10px 0", borderRadius: 10, fontSize: 13.5 }}>
                        Selecionar este presente
                      </button>
                      <button style={{ cursor: "pointer", border: "1px solid " + T.line,
                        background: "transparent", color: T.ink, fontWeight: 600, padding: "10px 0",
                        borderRadius: 10, fontSize: 13.5 }}>
                        Ir para a loja ↗
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalReserva && (
        <div onClick={() => setModalReserva(null)} style={{ position: "fixed", inset: 0,
          background: "rgba(20,15,10,.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 18,
            padding: 26, width: "100%", maxWidth: 420 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>Reservar presente</h2>
            <p style={{ margin: "0 0 18px", color: T.sub, fontSize: 14 }}>
              Confirme seu nome e telefone para reservar <b>{modalReserva.nome}</b>. Assim ele fica travado para os outros convidados.
            </p>
            <label style={lbl}>Seu nome</label>
            <input id="rnome" style={inp} placeholder="Como você quer aparecer" />
            <label style={lbl}>Telefone (WhatsApp)</label>
            <input style={inp} placeholder="+55 12 90000-0000" />
            <button
              onClick={() => {
                const n = document.getElementById("rnome").value || "Convidado";
                reservar(modalReserva.id, n);
              }}
              style={{ cursor: "pointer", border: "none", background: T.jade, color: "#fff",
                fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 10, width: "100%", marginTop: 18 }}>
              Confirmar reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// VISÃO 3 — ADMIN (DONO)
// ============================================================
function Admin({ banner, setBanner }) {
  const [aba, setAba] = useState("afiliados");
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 800 }}>Painel do dono</h1>
      <p style={{ color: T.sub, margin: "0 0 22px" }}>Configuração total da plataforma Lista Garimpo.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {[["afiliados", "🔑 Afiliados & APIs"], ["banner", "📣 Banner promocional"], ["usuarios", "👥 Usuários"]].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ cursor: "pointer", border: "none",
            borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700,
            background: aba === k ? T.ink : T.card, color: aba === k ? "#fff" : T.ink,
            boxShadow: "0 1px 0 " + T.line }}>{l}</button>
        ))}
      </div>

      {aba === "afiliados" && <AdminAfiliados />}
      {aba === "banner" && <AdminBanner banner={banner} setBanner={setBanner} />}
      {aba === "usuarios" && <AdminUsuarios />}
    </div>
  );
}

// ---- Admin: configuração do banner promocional ----
function AdminBanner({ banner, setBanner }) {
  const set = (campo, valor) => setBanner({ ...banner, [campo]: valor });
  const toggleLoja = (k) => {
    const tem = banner.lojas.includes(k);
    set("lojas", tem ? banner.lojas.filter(x => x !== k) : [...banner.lojas, k]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      {/* coluna de edição */}
      <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Banner promocional</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={banner.ativo} onChange={e => set("ativo", e.target.checked)} />
            {banner.ativo ? "Ativo" : "Desativado"}
          </label>
        </div>
        <p style={{ color: T.sub, fontSize: 13.5, margin: "6px 0 18px", lineHeight: 1.5 }}>
          Aparece para os convidados dentro das listas, levando-os ao seu grupo de ofertas.
        </p>

        <label style={lbl}>Título</label>
        <input value={banner.titulo} onChange={e => set("titulo", e.target.value)} style={inp} />

        <label style={lbl}>Texto</label>
        <textarea value={banner.texto} onChange={e => set("texto", e.target.value)}
          style={{ ...inp, minHeight: 70, resize: "vertical" }} />

        <label style={lbl}>Link do grupo (WhatsApp, Telegram…)</label>
        <input value={banner.link} onChange={e => set("link", e.target.value)} style={inp}
          placeholder="https://chat.whatsapp.com/..." />

        <label style={lbl}>Texto do botão</label>
        <input value={banner.cta} onChange={e => set("cta", e.target.value)} style={inp} />

        <label style={lbl}>Imagem de fundo (opcional)</label>
        <div style={{ padding: 16, border: "1.5px dashed " + T.line, borderRadius: 12,
          textAlign: "center", color: T.sub, fontSize: 13, background: T.bg }}>
          Arraste e solte uma imagem, ou use o gradiente padrão
        </div>

        <label style={lbl}>Logos de lojas exibidos</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(LOJAS).filter(([k]) => k !== "outra").map(([k, loja]) => {
            const on = banner.lojas.includes(k);
            return (
              <button key={k} onClick={() => toggleLoja(k)}
                style={{ cursor: "pointer", padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                  background: on ? loja.cor : "transparent",
                  color: on ? "#fff" : T.sub,
                  border: "1.5px solid " + (on ? loja.cor : T.line) }}>
                {loja.nome}
              </button>
            );
          })}
        </div>
      </div>

      {/* coluna de pré-visualização */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.sub, margin: "0 0 10px" }}>Prévia (como o convidado vê)</p>
        <BannerPromo banner={banner} />
        {!banner.ativo && (
          <p style={{ fontSize: 12.5, color: T.danger, marginTop: 10 }}>
            Banner desativado — não aparece para os convidados no momento.
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Componente visual do banner (usado na prévia e na visão do convidado) ----
function BannerPromo({ banner }) {
  if (!banner?.ativo) return null;
  const logos = { shopee: "🛍️", amazon: "📦", ml: "🛒", magalu: "🏬", shein: "👗", temu: "🎁" };
  return (
    <div style={{ borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(120deg," + T.ink + "," + T.clayDark + ")",
      color: "#F5F0E8", padding: 22 }}>
      <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>{banner.titulo}</div>
      <div style={{ fontSize: 14, opacity: .9, margin: "8px 0 16px", lineHeight: 1.5 }}>{banner.texto}</div>

      {/* logos das lojas */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {banner.lojas.map(k => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,.14)", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600 }}>
            <span>{logos[k] || "🏷️"}</span>{LOJAS[k]?.nome}
          </span>
        ))}
      </div>

      <a href={banner.link} target="_blank" rel="noreferrer"
        style={{ display: "inline-block", background: T.gold, color: T.ink, textDecoration: "none",
          fontWeight: 800, fontSize: 14, padding: "11px 22px", borderRadius: 10 }}>
        {banner.cta} →
      </a>
    </div>
  );
}

function AdminAfiliados() {
  return (
    <div>
      <p style={{ color: T.sub, fontSize: 14, marginTop: 0, lineHeight: 1.55, maxWidth: 640 }}>
        Cada loja é uma integração separada. Onde há conversão automática, os links que os
        criadores cadastram viram links de afiliado <b>da sua conta</b> — sem que eles vejam
        ou editem. Onde não há, o link entra cru.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        {Object.entries(LOJAS).filter(([k]) => k !== "outra").map(([k, loja]) => (
          <div key={k} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{loja.nome}</span>
              <span style={chip("#F0EADF", loja.cor)}>{loja.modo}</span>
              {loja.comissao
                ? <span style={chip(T.jadeSoft, T.jade)}>● ativo</span>
                : <span style={chip("#F3E7E5", T.danger)}>● sem conversão</span>}
            </div>
            {loja.comissao ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <input placeholder={k === "shopee" ? "App ID" : "ID de afiliado / publisher"} style={inp} />
                <input placeholder={k === "shopee" ? "App Secret" : "Chave da rede (Awin/Admitad)"} style={inp} />
              </div>
            ) : (
              <p style={{ margin: "10px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
                {k === "amazon"
                  ? "Fora da monetização automática por ora (os termos da Amazon restringem tags de terceiros). Encaixe reservado para o modo “tag do próprio criador”."
                  : "Sem API oficial de afiliados. Entra como link cru até haver caminho estável."}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsuarios() {
  const [users, setUsers] = useState(USUARIOS);
  function toggle(id) {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "ativo" ? "inativo" : "ativo" } : u));
  }
  function excluir(id) { setUsers(users.filter(u => u.id !== id)); }

  return (
    <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
          <thead>
            <tr style={{ background: T.bg, textAlign: "left", color: T.sub }}>
              <th style={th}>Usuário</th><th style={th}>Cadastro</th><th style={th}>Listas</th>
              <th style={th}>Status</th><th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: "1px solid " + T.line }}>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{u.nome}</div>
                  <div style={{ color: T.sub, fontSize: 12.5 }}>{u.email}</div>
                </td>
                <td style={td}>{u.cadastro}</td>
                <td style={td}>{u.listas}</td>
                <td style={td}>
                  <span style={chip(u.status === "ativo" ? T.jadeSoft : "#F3E7E5",
                    u.status === "ativo" ? T.jade : T.danger)}>
                    {u.status}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => toggle(u.id)} style={miniBtn}>
                      {u.status === "ativo" ? "Inativar" : "Ativar"}
                    </button>
                    <button style={miniBtn}>Redefinir senha</button>
                    <button onClick={() => excluir(u.id)} style={{ ...miniBtn, color: T.danger, borderColor: T.danger }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- COMPONENTES AUXILIARES ----------
function Bloco({ titulo, sub, children }) {
  return (
    <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 16, padding: 22 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{titulo}</h2>
      {sub && <p style={{ margin: "0 0 18px", color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{sub}</p>}
      {children}
    </div>
  );
}
function SalvarBtn() {
  return <div style={{ textAlign: "right", marginTop: 20 }}>
    <button style={{ cursor: "pointer", border: "none", background: T.clay, color: "#fff",
      fontWeight: 700, fontSize: 14, padding: "11px 26px", borderRadius: 10 }}>Salvar</button>
  </div>;
}

const lbl = { display: "block", fontWeight: 700, fontSize: 13.5, margin: "16px 0 6px" };
const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + T.line,
  background: "#fff", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
const th = { padding: "12px 16px", fontWeight: 700, fontSize: 12.5 };
const td = { padding: "12px 16px", verticalAlign: "top" };
const miniBtn = { cursor: "pointer", border: "1px solid " + T.line, background: "transparent",
  color: T.ink, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 600 };
const btnPrimary = { cursor: "pointer", border: "none", background: T.clay, color: "#fff",
  fontWeight: 700, fontSize: 14, padding: "11px 24px", borderRadius: 10 };
const btnGhost = { cursor: "pointer", border: "none", background: "transparent", color: T.sub,
  fontWeight: 600, fontSize: 14, padding: "11px 14px" };
const linkBtn = { cursor: "pointer", border: "none", background: "transparent", color: T.clay,
  fontWeight: 700, fontSize: "inherit", padding: 0, textDecoration: "underline" };
