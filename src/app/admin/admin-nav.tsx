"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  ["usuarios", "👥 Usuários"],
  ["config", "🛠️ Configurações"],
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ABAS.map(([k, label]) => {
        const href = `/admin/${k}`;
        const ativo = pathname === href;
        return (
          <Link
            key={k}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
              ativo ? "bg-card text-ink" : "text-sub hover:bg-card hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
