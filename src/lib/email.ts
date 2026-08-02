import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// mesma identidade visual do template de auth em
// supabase/email-templates/confirm-signup.html — mantém os emails da
// aplicação consistentes com os que o Supabase Auth já dispara.
export function renderEmailHtml({ titulo, corpoHtml }: { titulo: string; corpoHtml: string }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo} — ATLION</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #fafaf8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafaf8; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e6df;">
            <tr>
              <td style="padding: 32px 40px 0 40px;">
                <span style="font-size: 14px; font-weight: 600; letter-spacing: 4px; color: #142440;">ATLION</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 40px 32px 40px;">
                <h1 style="margin: 0 0 16px 0; font-size: 22px; line-height: 1.3; font-weight: 600; color: #142440;">
                  ${titulo}
                </h1>
                ${corpoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 40px 32px 40px; border-top: 1px solid #f0efe9;">
                <p style="margin: 0; font-size: 12px; color: #b8c0cb;">
                  ATLION · Sistema de planejamento para concursos
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Nunca lança — erro de envio nunca deve quebrar o fluxo de quem chamou
// (seguranca.md seção 12: indisponibilidade de API externa não pode
// quebrar o fluxo do usuário). Quem chama decide se o `false` importa.
export async function enviarEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      replyTo: process.env.RESEND_REPLY_TO_EMAIL,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Falha ao enviar email:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Falha ao enviar email:", err instanceof Error ? err.message : err);
    return false;
  }
}
