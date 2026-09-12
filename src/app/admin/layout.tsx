import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { logoutAdmin } from "./actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin-acess");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, status, excluido_em")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || perfil.role !== "owner" || perfil.status === "inativo" || perfil.excluido_em) {
    redirect("/admin-acess");
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-card px-5 py-3">
        <span className="font-extrabold tracking-wide text-ink">⛏️ Lista Garimpo — Admin</span>
        <form action={logoutAdmin} className="ml-auto">
          <button className="cursor-pointer text-sm font-semibold text-sub hover:text-ink">
            Sair
          </button>
        </form>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          <AdminNav />
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
