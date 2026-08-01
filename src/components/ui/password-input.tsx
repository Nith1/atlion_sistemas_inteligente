"use client";

import { useState } from "react";

// Input de senha com botão de mostrar/ocultar (o "olhinho") — mesma API de um
// <input> normal, só que fixa type="password"/"text" internamente. tabIndex
// -1 no botão pra não atrapalhar quem navega o formulário via Tab.
export function PasswordInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={mostrar ? "text" : "password"} className={`${className ?? ""} pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setMostrar((v) => !v)}
        aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40 hover:text-foreground"
      >
        {mostrar ? <IconeOlhoFechado className="h-4 w-4" /> : <IconeOlho className="h-4 w-4" />}
      </button>
    </div>
  );
}

function IconeOlho(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a15.7 15.7 0 0 1-3.1 4.1M6.5 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
