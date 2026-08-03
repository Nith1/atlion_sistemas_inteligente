export const metadata = {
  title: "Assinatura inativa — ATLION",
};

export default function AssinaturaInativaPage() {
  const checkoutUrl = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Assinatura inativa</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <p>
          Não encontramos uma assinatura ativa pra essa conta — ela pode ter expirado, sido
          cancelada ou reembolsada. Pra voltar a usar a ATLION, reative sua assinatura.
        </p>

        {checkoutUrl && (
          <a
            href={checkoutUrl}
            className="inline-block rounded-lg px-7 py-3 text-sm font-semibold"
            style={{ backgroundColor: "#c9a227", color: "#142440" }}
          >
            Reativar assinatura
          </a>
        )}

        <p className="text-foreground/50">
          Dúvida ou algo errado? Fala com a gente em{" "}
          <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
            contato@atlionestudos.com.br
          </a>
          .
        </p>
      </div>
    </main>
  );
}
