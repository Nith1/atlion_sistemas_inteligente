import { ScrollReveal } from "./scroll-reveal";

const PERGUNTAS = [
  {
    pergunta: "Preciso ter o edital pronto pra usar a ATLION?",
    resposta:
      "Não. Você pode colar um edital antigo ou o índice de um livro depois, na tela de Planejamento — a ATLION organiza os assuntos automaticamente.",
  },
  {
    pergunta: "A ATLION ensina o conteúdo, como um curso?",
    resposta:
      "Não. Você estuda no seu próprio material — curso, livro ou videoaula. A ATLION decide a ordem, o tempo e o momento certo de cada etapa.",
  },
  {
    pergunta: "Como a ATLION decide o que estudar a cada sessão?",
    resposta:
      "Ela olha o que você já estudou e há quanto tempo, e monta a sessão com o pilar certo pra aquele momento — ativação, aprendizagem, consolidação ou prática.",
  },
  {
    pergunta: "Funciona pra qualquer concurso?",
    resposta:
      "Sim. Você cadastra as disciplinas do seu concurso e o tipo de cada uma, e a sessão se adapta — jurídica, exatas, humanas, informática ou idiomas.",
  },
  {
    pergunta: "Dá pra usar pelo celular?",
    resposta: "Sim. A plataforma inteira funciona em qualquer tela — celular, tablet ou computador.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-2xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">FAQ</p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl">Perguntas comuns.</h2>
      </ScrollReveal>

      <div className="mt-14 divide-y divide-white/[0.07] border-t border-white/[0.07]">
        {PERGUNTAS.map((item, i) => (
          <ScrollReveal key={item.pergunta} delayMs={i * 50}>
            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-left text-[#F5F3EF] marker:content-none">
                <span className="text-base font-medium sm:text-lg">{item.pergunta}</span>
                <span className="ml-4 shrink-0 text-xl text-[#AAB4C3] transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-xl text-sm text-[#AAB4C3] sm:text-base">{item.resposta}</p>
            </details>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
