import Image from "next/image";
import { ScrollReveal } from "./scroll-reveal";

const TELAS = [
  {
    titulo: "Painel",
    descricao: "Um botão. Ele decide o resto.",
    src: "/screenshots/painel.png",
    largura: 1200,
    altura: 392,
  },
  {
    titulo: "Sessão",
    descricao: "Cada etapa, com tempo e cronômetro próprios.",
    src: "/screenshots/sessao.png",
    largura: 1200,
    altura: 380,
  },
  {
    titulo: "Caderno de Erros",
    descricao: "Todo erro vira revisão — sem planilha.",
    src: "/screenshots/caderno.png",
    largura: 1200,
    altura: 400,
  },
  {
    titulo: "Estatísticas",
    descricao: "Progresso real, por disciplina, sem esforço.",
    src: "/screenshots/estatisticas.png",
    largura: 1200,
    altura: 400,
  },
];

export function Experiencia() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">
          A experiência
        </p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mx-auto mt-5 max-w-lg text-center text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          A interface real. Sem mockup.
        </h2>
      </ScrollReveal>

      <div className="mt-20 space-y-24">
        {TELAS.map((tela, i) => (
          <ScrollReveal key={tela.titulo} delayMs={i * 60}>
            <p className="text-base font-medium text-[#AAB4C3]">
              <span className="text-[#F5F3EF]">{tela.titulo}</span> — {tela.descricao}
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <Image
                src={tela.src}
                alt={`Tela de ${tela.titulo} da ATLION`}
                width={tela.largura}
                height={tela.altura}
                className="h-auto w-full"
                sizes="(max-width: 768px) 100vw, 1152px"
              />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
