import Link from "next/link";
import { TERMOS_VERSAO } from "@/lib/termos";

export const metadata = {
  title: "Termos de Uso — ATLION",
};

export default function TermosDeUsoPage() {
  const atualizadoEm = TERMOS_VERSAO;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Termos de Uso</h1>
      <p className="mt-2 text-sm text-foreground/50">Última atualização: {atualizadoEm}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Quem somos</h2>
          <p className="mt-2">
            A ATLION é um sistema de planejamento de estudos para concursos públicos. Neste
            momento a ATLION está em fase inicial (pré-lançamento), operada por pessoa física,
            ainda sem CNPJ próprio constituído. Assim que a pessoa jurídica for formalizada, este
            documento será atualizado com a razão social e o CNPJ correspondentes. Até lá, o canal
            oficial de contato e responsabilização é{" "}
            <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
              contato@atlionestudos.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Aceite destes termos</h2>
          <p className="mt-2">
            Ao criar uma conta ou usar a plataforma ATLION, você declara que leu, entendeu e
            concorda com estes Termos de Uso e com a nossa{" "}
            <Link href="/politica-de-privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>
            . Se você não concordar com qualquer parte destes termos, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. O que é a ATLION</h2>
          <p className="mt-2">
            A ATLION organiza automaticamente a preparação do usuário para concursos públicos:
            decide o que estudar, quando revisar e como estruturar cada sessão de estudo, com base
            em uma metodologia própria. A ATLION não é um curso, não fornece videoaulas nem material
            de conteúdo — o usuário continua estudando pelo material que já possui (curso, livro,
            PDF, videoaula), e a plataforma organiza essa preparação em torno disso.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Cadastro e acesso</h2>
          <p className="mt-2">
            Durante o período de pré-lançamento, o acesso à ATLION é restrito: só é possível criar
            conta mediante convite individual ou após confirmação de pagamento processado pela
            plataforma parceira Kiwify (quando essa modalidade estiver disponível). Você é
            responsável por manter a confidencialidade da sua senha e por todas as atividades
            realizadas na sua conta. Avise imediatamente pelo email de contato caso suspeite de uso
            não autorizado da sua conta.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Uso aceitável</h2>
          <p className="mt-2">Ao usar a ATLION, você concorda em não:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Compartilhar sua conta com terceiros ou revender acesso;</li>
            <li>Tentar acessar dados de outros usuários ou burlar mecanismos de segurança;</li>
            <li>Usar a plataforma para qualquer finalidade ilegal ou não autorizada;</li>
            <li>Fazer engenharia reversa, copiar ou reproduzir a metodologia e o sistema da ATLION.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Planos e pagamento</h2>
          <p className="mt-2">
            Quando a ATLION passar a cobrar por acesso, o pagamento será processado através da
            plataforma parceira <strong>Kiwify</strong>, responsável pelo checkout e pela cobrança.
            Ao contratar um plano pago, você também está sujeito aos termos da Kiwify para aquela
            transação.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Cancelamento e reembolso</h2>
          <p className="mt-2">
            Conforme o artigo 49 do Código de Defesa do Consumidor, você tem direito de se
            arrepender da compra em até <strong>7 (sete) dias corridos</strong> a partir da data do
            pagamento, com reembolso integral, sem necessidade de justificativa. O pedido pode ser
            feito diretamente pelo canal de reembolso da Kiwify (reembolso.kiwify.com.br,
            informando o email usado na compra) ou pelo nosso email de contato. Fora desse prazo, a
            possibilidade de reembolso fica a critério da ATLION, sendo tratada caso a caso.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Propriedade intelectual</h2>
          <p className="mt-2">
            A marca ATLION, a metodologia de planejamento adaptativo, o sistema, o design e todo o
            conteúdo da plataforma são de propriedade da ATLION e protegidos por lei. Nada nestes
            termos concede a você qualquer direito sobre esses elementos além do uso pessoal da
            plataforma enquanto sua conta estiver ativa.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Isenção de garantia de resultado</h2>
          <p className="mt-2">
            A ATLION é uma ferramenta de organização e planejamento de estudos. Ela não garante
            aprovação em concurso público, nota mínima ou qualquer resultado específico — o
            desempenho depende de fatores fora do nosso controle, incluindo o empenho do próprio
            usuário. A plataforma é fornecida &quot;como está&quot;, sem garantias além das previstas em lei.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">10. Encerramento de conta</h2>
          <p className="mt-2">
            Você pode encerrar sua conta a qualquer momento em Configurações, dentro da própria
            plataforma — isso apaga permanentemente seus dados de uso. A ATLION pode suspender ou
            encerrar contas que violem estes termos, mediante aviso prévio quando possível.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">11. Alterações nestes termos</h2>
          <p className="mt-2">
            Podemos atualizar estes Termos de Uso conforme a ATLION evolui (por exemplo, ao abrir
            CNPJ ou lançar novos planos). Mudanças relevantes serão comunicadas por email ou aviso
            na plataforma. O uso continuado após a atualização representa concordância com os novos
            termos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">12. Legislação aplicável</h2>
          <p className="mt-2">
            Estes termos são regidos pelas leis da República Federativa do Brasil, incluindo o
            Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">13. Contato</h2>
          <p className="mt-2">
            Dúvidas sobre estes termos podem ser enviadas para{" "}
            <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
              contato@atlionestudos.com.br
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
