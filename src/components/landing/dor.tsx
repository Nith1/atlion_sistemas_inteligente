import { ScrollReveal } from "./scroll-reveal";

const DECISOES = [
  "Qual matéria estudar?",
  "Quanto tempo dedicar?",
  "Revisar ou aprender algo novo?",
  "Anki ou questões?",
  "Por onde recomeçar?",
  "Lei seca ou jurisprudência?",
  "O que já esqueci?",
];

const ROTACOES = [-3, 2, -1, 3, -2, 1, -2];

export function Dor() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">A dor</p>
      </ScrollReveal>

      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Todo concurseiro acredita
          <br />
          que seu problema é disciplina.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={180}>
        <p className="mt-8 text-2xl font-semibold text-[#F5F3EF] sm:text-3xl">Não é.</p>
      </ScrollReveal>

      <ScrollReveal delayMs={260}>
        <p className="mt-3 max-w-lg text-lg text-[#AAB4C3]">
          Seu problema é tomar centenas de pequenas decisões todos os dias.
        </p>
      </ScrollReveal>

      <div className="relative mt-24 flex flex-col items-center">
        <ScrollReveal delayMs={140} className="flex max-w-md flex-wrap items-center justify-center gap-3">
          {DECISOES.map((decisao, i) => (
            <span
              key={decisao}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#AAB4C3]/45 line-through decoration-[#AAB4C3]/30"
              style={{ transform: `rotate(${ROTACOES[i]}deg)` }}
            >
              {decisao}
            </span>
          ))}
        </ScrollReveal>

        <ScrollReveal
          delayMs={480}
          className="relative -mt-2 rounded-2xl border border-white/[0.08] bg-[#111D2D] px-8 py-6 text-center shadow-[0_0_90px_-20px_rgba(200,161,90,0.22)]"
        >
          <p className="text-xs uppercase tracking-widest text-[#AAB4C3]/70">Próxima ação</p>
          <p className="mt-2 text-xl font-semibold text-[#F5F3EF]">Direito Administrativo</p>
          <div className="mt-4 rounded-md bg-[#C8A15A] px-6 py-2 text-sm font-semibold text-[#08111D]">
            Começar sessão
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
