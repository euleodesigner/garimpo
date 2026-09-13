import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey } from "./url";

// Domínio-base do cookie de sessão (spec §5 "Sessão compartilhada"):
// - produção: .listagarimpo.com.br (via NEXT_PUBLIC_ROOT_DOMAIN)
// - dev com sessão compartilhada: .garimpo.test (entradas fixas no /etc/hosts)
// - *.localhost: navegadores recusam Domain=.localhost, então o cookie fica
//   host-only (sem Domain) -- funciona pra navegar dentro de um único host,
//   mas não sustenta sessão compartilhada entre app.localhost e
//   outraLista.localhost (limitação documentada na spec, não um bug daqui)
function cookieDomainFor(hostname: string): string | undefined {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (rootDomain && (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`))) {
    return `.${rootDomain}`;
  }
  if (hostname === "garimpo.test" || hostname.endsWith(".garimpo.test")) {
    return ".garimpo.test";
  }
  return undefined;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  const domain = cookieDomainFor(hostname);

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookieOptions: {
        domain,
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, domain }),
          );
        },
      },
    },
  );

  // força o refresh do token de sessão -- necessário pra manter o cookie
  // válido entre navegações, o @supabase/ssr não faz isso sozinho no
  // middleware sem essa chamada
  await supabase.auth.getUser();

  return response;
}
