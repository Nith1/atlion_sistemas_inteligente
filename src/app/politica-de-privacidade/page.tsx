import Link from "next/link";
import { TERMOS_VERSAO } from "@/lib/termos";

export const metadata = {
  title: "Política de Privacidade — ATLION",
};

export default function PoliticaDePrivacidadePage() {
  const atualizadoEm = TERMOS_VERSAO;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-foreground/50">Última atualização: {atualizadoEm}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <p>
            Esta política explica quais dados a ATLION coleta, para quê, e quais direitos você tem
            sobre eles, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
            LGPD). A ATLION ainda está em fase inicial, operada por pessoa física — o canal oficial
            pra qualquer assunto de privacidade é{" "}
            <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
              contato@atlionestudos.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Quais dados coletamos</h2>
          <p className="mt-2">Coletamos só o que é necessário pra plataforma funcionar:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Cadastro:</strong> email e senha (a senha é armazenada de forma criptografada, nunca em texto puro).</li>
            <li><strong>Lista de espera:</strong> email e WhatsApp de quem se inscreve pra ser avisado do lançamento.</li>
            <li>
              <strong>Onboarding:</strong> concurso pretendido, se já existe edital, horas líquidas
              de estudo por dia, se você trabalha, curso preparatório utilizado, e o modo de
              Ativação Cognitiva escolhido (questões, Anki, ou os dois).
            </li>
            <li><strong>Plano de estudos:</strong> disciplinas e assuntos que você cadastra, com seu progresso.</li>
            <li>
              <strong>Uso da plataforma:</strong> sessões de estudo, tempo gasto por etapa,
              questões respondidas (acertos e erros) e anotações que você registra sobre seus erros.
            </li>
            <li>
              <strong>Dados técnicos:</strong> informações de acesso necessárias pra segurança da
              conta (ex: controle de tentativas de login, pra evitar ataques de força bruta).
            </li>
          </ul>
          <p className="mt-2">
            Não coletamos dados sensíveis (saúde, biometria, origem racial etc.) nem pedimos CPF ou
            dados de pagamento diretamente — quando a ATLION passar a cobrar, o pagamento é
            processado pela Kiwify, que tem sua própria política de privacidade pra esses dados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Para que usamos seus dados</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Criar e manter sua conta, e autenticar seu acesso com segurança;</li>
            <li>Gerar automaticamente seu plano de estudos e as sessões adaptativas (é a função central da plataforma);</li>
            <li>Mostrar suas estatísticas de desempenho e seu Caderno de Erros;</li>
            <li>Avisar você por email sobre a sua conta, a lista de espera e o lançamento da plataforma;</li>
            <li>Prevenir fraude, abuso e uso indevido da plataforma;</li>
            <li>Cumprir obrigações legais, quando aplicável.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Com quem compartilhamos</h2>
          <p className="mt-2">
            Não vendemos seus dados. Compartilhamos o mínimo necessário com prestadores de serviço
            que ajudam a operar a plataforma, todos sob obrigação de proteger esses dados:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase:</strong> hospedagem do banco de dados e autenticação da conta;</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação web;</li>
            <li><strong>Resend:</strong> envio de emails (confirmação de cadastro, redefinição de senha, avisos da lista de espera);</li>
            <li><strong>Kiwify:</strong> processamento de pagamento, quando você contrata um plano pago.</li>
          </ul>
          <p className="mt-2">
            Esses provedores podem processar dados em servidores fora do Brasil, sempre sob
            salvaguardas contratuais de proteção de dados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Por quanto tempo guardamos</h2>
          <p className="mt-2">
            Guardamos seus dados enquanto sua conta estiver ativa. Se você encerrar a conta (em
            Configurações, dentro da plataforma), seus dados de uso são apagados permanentemente.
            Dados que precisamos manter por obrigação legal (ex: registros fiscais de pagamento,
            quando existirem) seguem o prazo exigido em lei.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Seus direitos</h2>
          <p className="mt-2">Conforme a LGPD, você pode a qualquer momento:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Confirmar se tratamos dados seus e acessar quais são;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar a exclusão dos seus dados (ou fazer isso você mesmo, em Configurações → Cancelar conta);</li>
            <li>Solicitar a portabilidade dos seus dados a outro fornecedor;</li>
            <li>Revogar o consentimento dado, quando aplicável;</li>
            <li>Saber com quem compartilhamos seus dados.</li>
          </ul>
          <p className="mt-2">
            Pra exercer qualquer um desses direitos, escreva pra{" "}
            <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
              contato@atlionestudos.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Segurança</h2>
          <p className="mt-2">
            Usamos práticas de segurança em camadas pra proteger seus dados: autenticação segura,
            controle de acesso por linha (cada usuário só acessa seus próprios dados), limite de
            tentativas em login e cadastro, e criptografia de senha. Nenhum sistema é 100% imune a
            incidentes, mas trabalhamos ativamente pra minimizar esse risco.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Cookies</h2>
          <p className="mt-2">
            Usamos apenas cookies essenciais, necessários pra manter sua sessão de login segura.
            Não usamos cookies de rastreamento publicitário.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Alterações nesta política</h2>
          <p className="mt-2">
            Podemos atualizar esta política conforme a ATLION evolui. Mudanças relevantes serão
            comunicadas por email ou aviso na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Contato</h2>
          <p className="mt-2">
            Dúvidas sobre esta política ou sobre seus dados:{" "}
            <a href="mailto:contato@atlionestudos.com.br" className="underline underline-offset-4">
              contato@atlionestudos.com.br
            </a>
            . Veja também os{" "}
            <Link href="/termos-de-uso" className="underline underline-offset-4">
              Termos de Uso
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
