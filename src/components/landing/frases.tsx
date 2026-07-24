import { ScrollReveal } from "./scroll-reveal";

const FRASES = [
  "Decisão é a maior fonte de cansaço mental de quem estuda para concurso.",
  "Por isso o Motor de Aprendizagem recalcula sua rota antes de você precisar pensar nela.",
  "Sem tela em branco. Sem “por onde eu começo hoje”.",
];

export function Frases() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <div className="space-y-20 sm:space-y-28">
        {FRASES.map((frase, i) => (
          <ScrollReveal key={frase} delayMs={i * 60}>
            <p className="text-2xl font-medium leading-snug tracking-tight text-[#F5F3EF] sm:text-3xl md:text-4xl">
              {frase}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
