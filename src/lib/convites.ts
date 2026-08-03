import { enviarEmail, renderEmailHtml } from "@/lib/email";

// Extraído de src/app/admin/convites/actions.ts — usado tanto pelo convite
// manual (admin) quanto pelo convite disparado automaticamente pelo webhook
// da Kiwify em src/app/api/webhooks/kiwify/route.ts.
export async function enviarEmailConvite(email: string, token: string) {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/convite/${token}`;

  await enviarEmail({
    to: email,
    subject: "Você foi convidado pra ATLION",
    html: renderEmailHtml({
      titulo: "Você foi convidado",
      corpoHtml: `
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4a5568;">
          Alguém da ATLION liberou seu acesso antecipado. É só clicar no
          botão abaixo, criar sua senha e começar.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius: 8px; background-color: #c9a227;">
              <a
                href="${link}"
                style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #142440; text-decoration: none;"
              >
                Ativar meu acesso
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #9aa5b1;">
          Se o botão não funcionar, copie e cole este link no navegador:<br />
          <a href="${link}" style="color: #142440; word-break: break-all;">${link}</a>
        </p>
      `,
    }),
  });

  return link;
}
