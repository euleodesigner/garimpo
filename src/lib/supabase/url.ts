/**
 * Normaliza NEXT_PUBLIC_SUPABASE_URL para a origem pura (protocolo + host),
 * descartando qualquer path colado por engano (ex.: "/rest/v1/", barra
 * final). Um valor com path quebra silenciosamente toda chamada de auth do
 * supabase-js com "Invalid path specified in request URL" -- erro que só
 * aparece dentro do fetch, não na validação de construção do client.
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}
