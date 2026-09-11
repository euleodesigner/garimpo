// Slugs reservados que colidem com o roteamento (spec §5) -- uma lista com
// um desses slugs ficaria permanentemente inacessível, porque o middleware
// sempre resolve esses hosts para o dashboard antes de olhar pro slug.
export const SLUGS_RESERVADOS = ["app", "www", "api", "admin", "mail", "ftp", "root"];

export function normalizarSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sugerirSlug(nome: string): string {
  const base = normalizarSlug(nome).slice(0, 24);
  const sufixo = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${sufixo}` : sufixo;
}

export function slugValido(slug: string): { ok: boolean; erro?: string } {
  const normalizado = normalizarSlug(slug);
  if (normalizado !== slug) {
    return { ok: false, erro: "Use só letras minúsculas, números e hífen." };
  }
  if (normalizado.length < 3) {
    return { ok: false, erro: "O endereço precisa ter pelo menos 3 caracteres." };
  }
  if (SLUGS_RESERVADOS.includes(normalizado)) {
    return { ok: false, erro: "Esse endereço é reservado, escolha outro." };
  }
  return { ok: true };
}
