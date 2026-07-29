"use client";

import { useFormStatus } from "react-dom";

// useFormStatus só enxerga o estado do <form> ancestral quando chamado num
// componente filho dele — por isso isso precisa ser um componente à parte,
// não dá pra ler `pending` direto na página que declara o <form>.
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (pendingText ?? "Enviando...") : children}
    </button>
  );
}
