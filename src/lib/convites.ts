import { enviarEmail, renderEmailHtml, escapeHtml } from "@/lib/email";

// Extraído de src/app/admin/convites/actions.ts — usado tanto pelo convite
// manual (admin) quanto pelo convite disparado automaticamente pelo webhook
// da Kiwify em src/app/api/webhooks/kiwify/route.ts.
//
// mensagemPersonalizada: texto livre digitado pelo admin em /admin/convites
// (opcional, só no convite manual — o webhook da Kiwify nunca passa isso).
// Nunca persiste no banco: só existe no momento do envio. Um reenvio
// (renovarConvite) não reaproveita a mensagem original, manda o template
// genérico. Sempre escapar antes de virar HTML — é texto de admin, mas
// ainda assim tratado como entrada não confiável (seguranca.md §7 XSS).
export async function enviarEmailConvite(
  email: string,
  token: string,
  mensagemPersonalizada?: string
) {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/convite/${token}`;

  const blocoMensagem = mensagemPersonalizada
    ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px 0;">
          <tr>
            <td style="padding: 14px 16px; border-left: 3px solid #c9a227; background-color: #fafaf8; font-size: 14px; line-height: 1.6; color: #142440;">
              ${escapeHtml(mensagemPersonalizada).replace(/\n/g, "<br />")}
            </td>
          </tr>
        </table>
      `
    : "";

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
        ${blocoMensagem}
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
        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #9aa5b1;">
          Depois de ativar, dá pra instalar a ATLION como app no seu celular:
          no Android/Chrome a opção aparece sozinha, no iPhone é só tocar em
          Compartilhar e depois em "Adicionar à Tela de Início".
        </p>
      `,
    }),
  });

  return link;
}
