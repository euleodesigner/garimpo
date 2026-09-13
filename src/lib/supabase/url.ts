// Reserva pros valores públicos do projeto Supabase -- NÃO são segredo (a
// chave "publishable"/anon é protegida por RLS, não por sigilo; a URL do
// projeto é, por definição, pública). Servem só de rede de segurança pra
// quando a variável de ambiente não chega até o build (aconteceu de verdade
// no Easypanel: a variável estava configurada no painel, mas o bundle final
// saía sem ela -- causa raiz não confirmada, mas o build-arg do Docker não
// estava sendo repassado de forma confiável). O valor da env var, quando
// presente, sempre tem prioridade sobre isso aqui.
const SUPABASE_URL_RESERVA = "https://wlqpbqpjxnszwmjvfmfs.supabase.co";
const SUPABASE_ANON_KEY_RESERVA = "sb_publishable_b3Lo7_9kATLeFbma5I6RCQ_XU9tdZtM";

/**
 * Normaliza NEXT_PUBLIC_SUPABASE_URL para a origem pura (protocolo + host),
 * descartando qualquer path colado por engano (ex.: "/rest/v1/", barra
 * final). Um valor com path quebra silenciosamente toda chamada de auth do
 * supabase-js com "Invalid path specified in request URL" -- erro que só
 * aparece dentro do fetch, não na validação de construção do client.
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_RESERVA;
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_RESERVA;
}
