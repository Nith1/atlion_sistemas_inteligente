"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "./confirm-dialog";

// useFormStatus só enxerga o estado do <form> ancestral quando chamado num
// componente filho dele — por isso isso precisa ser um componente à parte,
// não dá pra ler `pending` direto na página que declara o <form>.
export function SubmitButton({
  children,
  pendingText,
  className,
  confirmMessage,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  // Quando definido, mostra o ConfirmDialog antes de submeter — usado nos
  // botões que fecham um ciclo de sessão, onde um clique sem querer perde o
  // que foi digitado.
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  const [confirmando, setConfirmando] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        disabled={pending}
        aria-busy={pending}
        onClick={(e) => {
          if (confirmMessage) {
            e.preventDefault();
            setConfirmando(true);
          }
        }}
        className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? (pendingText ?? "Enviando...") : children}
      </button>

      {confirmando && (
        <ConfirmDialog
          mensagem={confirmMessage!}
          pending={pending}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            setConfirmando(false);
            // dispara o submit de verdade do <form> pai — o botão em si não
            // pode submeter direto na primeira vez (ver preventDefault acima).
            buttonRef.current?.form?.requestSubmit();
          }}
        />
      )}
    </>
  );
}
