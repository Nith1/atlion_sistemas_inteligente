import { ScrollReveal } from "./scroll-reveal";

const FLUXO = [
  "Você estudou Controle de Constitucionalidade.",
  "Alguns dias se passam.",
  "O motor percebe a perda natural de retenção.",
  "Você erra duas questões relacionadas.",
  "A ATLION recalcula automaticamente.",
  "Sua próxima sessão começa com Ativação Cognitiva.",
  "Depois, segue pro conteúdo novo.",
];

export function AtivacaoCognitiva() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">O diferencial</p>
      </ScrollReveal>

      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Ativação Cognitiva.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={160}>
        <p className="mt-5 max-w-lg text-lg text-[#AAB4C3]">
          Não é revisão espaçada. Não é só Anki. Não é só questões. É preparar o cérebro pra aprender de novo.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={240}>
        <p className="mt-4 max-w-lg text-[#AAB4C3]">
          Antes de qualquer conteúdo novo, a ATLION recupera automaticamente o que você já estudou naquela
          disciplina — por questões, Anki, ou os dois. Você não escolhe. O motor decide.
        </p>
      </ScrollReveal>

      <div className="relative mt-16 space-y-8 border-l border-white/10 pl-8 sm:pl-10">
        {FLUXO.map((passo, i) => {
          const destaque = i === FLUXO.length - 2;
          return (
            <ScrollReveal key={passo} delayMs={i * 90} className="relative">
              <span
                className={`absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full sm:-left-[calc(2.5rem+5px)] ${
                  destaque ? "bg-[#C8A15A]" : "bg-white/20"
                }`}
              />
              <p className={destaque ? "text-lg font-semibold text-[#F5F3EF]" : "text-[#AAB4C3]"}>{passo}</p>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
