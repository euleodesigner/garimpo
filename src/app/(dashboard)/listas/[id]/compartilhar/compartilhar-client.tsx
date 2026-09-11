"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui";

export function CompartilharClient({ url }: { url: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 300 }).then(setQr);
  }, [url]);

  return (
    <Card>
      <h2 className="text-xl font-extrabold text-ink">Compartilhe sua lista</h2>
      <p className="mt-1 text-sm text-sub">
        Envie o link para família e amigos verem e escolherem presentes.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
          className="cursor-pointer rounded-lg bg-ink px-4 text-sm font-bold text-white"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>

      {qr && (
        <div className="mt-5 flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code da lista" className="h-36 w-36 rounded-xl border border-line" />
          <p className="max-w-xs text-sm leading-relaxed text-sub">
            QR Code gerado automaticamente. (Sem personalização de cores.)
          </p>
        </div>
      )}
    </Card>
  );
}
