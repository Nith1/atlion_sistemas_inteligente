import { ScrollReveal } from "./scroll-reveal";

const ETAPAS = [
  { titulo: "Destino", descricao: "Você diz qual concurso quer passar." },
  { titulo: "Planejamento Inteligente", descricao: "O sistema organiza disciplinas e assuntos por você." },
  { titulo: "Sessões Adaptativas", descricao: "Cada sessão já sabe o que fazer, em que ordem, por quanto tempo." },
  { titulo: "Aprendizagem", descricao: "Ativação, estudo, consolidação e prática — todo dia." },
  { titulo: "Aprovação", descricao: null },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Como funciona</p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Uma rota. Não uma lista de tarefas.
        </h2>
      </ScrollReveal>

      <div className="relative mt-20 space-y-14 border-l border-white/10 pl-8 sm:pl-10">
        {ETAPAS.map((etapa, i) => (
          <ScrollReveal key={etapa.titulo} delayMs={i * 90} className="relative">
            <span className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-[#C8A15A] sm:-left-[calc(2.5rem+5px)]" />
            <p className="text-xs uppercase tracking-widest text-[#AAB4C3]/60">0{i + 1}</p>
            <p className="mt-2 text-xl font-semibold text-[#F5F3EF] sm:text-2xl">{etapa.titulo}</p>
            {etapa.descricao && <p className="mt-2 max-w-md text-[#AAB4C3]">{etapa.descricao}</p>}
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
