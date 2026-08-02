import { ScrollReveal } from "./scroll-reveal";

const PERGUNTAS = [
  {
    pergunta: "Funciona para qualquer concurso?",
    resposta:
      "Sim. Você cadastra suas disciplinas e materiais, e a ATLION adapta a preparação para qualquer área: jurídica, fiscal, policial, tribunais, controle, saúde, exatas, informática ou idiomas.",
  },
  {
    pergunta: "A ATLION ensina o conteúdo como um curso?",
    resposta:
      "Não. Você continua estudando pelo material que preferir: curso, livro, PDF ou videoaula. A ATLION decide apenas o que estudar, quando estudar e quanto tempo dedicar.",
  },
  {
    pergunta: "Como a ATLION sabe o que devo estudar em cada sessão?",
    resposta:
      "Ela analisa continuamente seu histórico de estudos, revisões, desempenho, tempo sem contato com cada assunto e evolução. A partir desses dados, monta automaticamente a próxima sessão ideal.",
  },
  {
    pergunta: "Preciso ter o edital para começar?",
    resposta:
      "Não. Você pode começar usando um edital anterior, o índice de um livro ou simplesmente cadastrar suas disciplinas. Quando um novo edital sair, basta atualizar as informações e a ATLION reorganiza toda a preparação.",
  },
  {
    pergunta: "E se eu ficar dias ou semanas sem estudar?",
    resposta:
      "Não é necessário reorganizar tudo manualmente. A ATLION recalcula automaticamente sua preparação considerando o tempo parado e prioriza o que realmente precisa ser retomado.",
  },
  {
    pergunta: "Posso alterar a sessão que a ATLION criou?",
    resposta:
      "Pode. Você continua no controle. Sempre que fizer alterações, a plataforma recalcula automaticamente as próximas sessões para manter sua preparação equilibrada.",
  },
  {
    pergunta: "Preciso entender métodos de estudo para usar a plataforma?",
    resposta:
      "Não. A metodologia já está incorporada ao sistema. Você apenas inicia a sessão e estuda. A ATLION toma as decisões por você.",
  },
  {
    pergunta: "Quanto tempo leva para montar meu planejamento?",
    resposta:
      "Poucos minutos. Depois disso, cada nova sessão é gerada automaticamente conforme sua evolução, sem necessidade de reorganizar cronogramas ou planilhas.",
  },
  {
    pergunta: "Posso usar no celular?",
    resposta: "Sim. A plataforma funciona em computador, tablet e celular, permitindo continuar seus estudos de qualquer lugar.",
  },
  {
    pergunta: "Meus dados são perdidos se eu trocar de dispositivo?",
    resposta: "Não. Todo o seu progresso fica sincronizado na nuvem. Basta entrar na sua conta para continuar exatamente de onde parou.",
  },
  {
    pergunta: "Qual é a maior diferença entre a ATLION e um planner de estudos?",
    resposta:
      "Um planner apenas organiza tarefas. A ATLION toma decisões continuamente. Ela analisa sua evolução, identifica o que precisa ser reforçado e recalcula automaticamente cada nova sessão para que você não precise decidir o próximo passo.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-2xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">FAQ</p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl">Ainda com dúvidas?</h2>
        <p className="mt-3 text-sm text-[#AAB4C3]">
          Não achou a resposta aqui? Manda um email pra{" "}
          <a href="mailto:contato@atlionestudos.com.br" className="text-[#F5F3EF] underline underline-offset-4">
            contato@atlionestudos.com.br
          </a>
          .
        </p>
      </ScrollReveal>

      <div className="mt-14 divide-y divide-white/[0.07] border-t border-white/[0.07]">
        {PERGUNTAS.map((item, i) => (
          <ScrollReveal key={item.pergunta} delayMs={i * 30}>
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
