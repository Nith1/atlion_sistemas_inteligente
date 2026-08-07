"use client";

// Modal com o visual da Atlion, no lugar do confirm() nativo do navegador
// (que sai feio/genérico, principalmente rodando dentro de webview/Electron).
export function ConfirmDialog({
  mensagem,
  pending,
  onConfirmar,
  onCancelar,
}: {
  mensagem: string;
  pending?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-foreground/10 bg-background p-5 shadow-xl">
        <p className="text-sm text-foreground">{mensagem}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md px-4 py-2 text-sm text-foreground/60 ring-1 ring-foreground/20 hover:text-foreground hover:ring-foreground/40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirmar}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
