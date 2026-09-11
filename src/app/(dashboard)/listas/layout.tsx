import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../auth-actions";

export default async function ListasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-card px-5 py-3">
        <span className="font-extrabold tracking-wide text-ink">⛏️ Lista Garimpo</span>
        <form action={logout} className="ml-auto">
          <button className="cursor-pointer text-sm font-semibold text-sub hover:text-ink">
            Sair
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
