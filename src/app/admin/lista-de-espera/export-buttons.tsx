"use client";

import { useState } from "react";

type Inscrito = { email: string; whatsapp: string; created_at: string };

function paraCsv(inscritos: Inscrito[]) {
  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
  const linhas = [
    ["email", "whatsapp", "data_cadastro"].join(","),
    ...inscritos.map((i) =>
      [escapar(i.email), escapar(i.whatsapp), escapar(i.created_at)].join(",")
    ),
  ];
  return linhas.join("\n");
}

// normaliza pra formato internacional (55DDDNUMERO) — o que a maioria das
// ferramentas de disparo em massa do WhatsApp espera
function paraNumeroWhatsapp(whatsapp: string) {
  const digitos = whatsapp.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export function ExportButtons({ inscritos }: { inscritos: Inscrito[] }) {
  const [copiado, setCopiado] = useState<"emails" | "whatsapp" | null>(null);

  function baixarCsv() {
    const blob = new Blob([paraCsv(inscritos)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lista-de-espera-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copiarEmails() {
    navigator.clipboard.writeText(inscritos.map((i) => i.email).join(", "));
    setCopiado("emails");
  }

  function copiarWhatsapp() {
    navigator.clipboard.writeText(inscritos.map((i) => paraNumeroWhatsapp(i.whatsapp)).join("\n"));
    setCopiado("whatsapp");
  }

  const botao = "rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/5";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={baixarCsv} className={botao}>
        Baixar CSV
      </button>
      <button
        type="button"
        onClick={copiarEmails}
        className={botao}
      >
        {copiado === "emails" ? "Copiado!" : "Copiar emails"}
      </button>
      <button
        type="button"
        onClick={copiarWhatsapp}
        className={botao}
      >
        {copiado === "whatsapp" ? "Copiado!" : "Copiar WhatsApp"}
      </button>
    </div>
  );
}
