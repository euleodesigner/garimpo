import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Domínios raiz reconhecidos como "contexto do app" (painel), além de
// qualquer host que caia fora deles como subdomínio (spec §5). Local dev
// aceita tanto *.localhost quanto *.garimpo.test; produção usa
// NEXT_PUBLIC_ROOT_DOMAIN.
const ROOT_DOMAINS = [process.env.NEXT_PUBLIC_ROOT_DOMAIN, "localhost", "garimpo.test"].filter(
  (d): d is string => Boolean(d),
);

function getSubdomain(hostname: string): string | null {
  for (const root of ROOT_DOMAINS) {
    if (hostname === root) return null;
    if (hostname.endsWith(`.${root}`)) {
      return hostname.slice(0, -(root.length + 1));
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  const subdomain = getSubdomain(hostname);

  // sem subdomínio, ou app./www. -- contexto do painel, passa direto
  if (!subdomain || subdomain === "app" || subdomain === "www") {
    return await updateSession(request);
  }

  // qualquer outro subdomínio -- rewrite interno pro grupo público, o
  // visitante nunca vê essa URL, só o subdomínio real na barra de endereço
  const url = request.nextUrl.clone();
  url.pathname = `/l/${subdomain}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
