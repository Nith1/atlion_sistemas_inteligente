import { ScrollReveal } from "./scroll-reveal";

const PILARES = [
  { numero: "01", titulo: "Ativação Cognitiva", descricao: "Reaquece o que você já estudou, antes de aprender algo novo." },
  { numero: "02", titulo: "Aprendizagem", descricao: "O assunto certo, na hora certa — sempre." },
  { numero: "03", titulo: "Consolidação", descricao: "Lei seca, jurisprudência ou exercícios — o que fixa o conteúdo." },
  { numero: "04", titulo: "Prática", descricao: "Questões novas, pra medir o que realmente ficou." },
];

export function Metodologia() {
  return (
    <section id="metodologia" className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">
          Metodologia
        </p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mx-auto mt-5 max-w-lg text-center text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Quatro pilares. Toda sessão.
        </h2>
      </ScrollReveal>

      <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {PILARES.map((pilar, i) => (
          <ScrollReveal key={pilar.numero} delayMs={i * 80} className="bg-[#08111D] p-8">
            <p className="text-xs font-semibold tracking-widest text-[#C8A15A]">{pilar.numero}</p>
            <p className="mt-4 text-lg font-semibold text-[#F5F3EF]">{pilar.titulo}</p>
            <p className="mt-2 text-sm text-[#AAB4C3]">{pilar.descricao}</p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
