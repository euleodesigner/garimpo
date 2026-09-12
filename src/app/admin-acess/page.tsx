import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

// noindex: essa rota não deve ser encontrada por busca nem compartilhada.
// Não substitui controle de acesso de verdade (já feito na action/layout),
// é só uma camada a mais de discrição.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminAcessPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">⛏️</div>
          <div className="mt-1 text-xl font-extrabold tracking-wide text-ink">LISTA GARIMPO</div>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
