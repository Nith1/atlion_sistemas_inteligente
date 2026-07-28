# Email templates

Templates institucionais pra substituir o padrão genérico do Supabase
Auth. Preview: `/atlion-email-preview` (gerado à parte, não faz parte
do build).

## Como aplicar

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Escolher o template:
   - **Confirm signup** → colar `confirm-signup.html`
   - **Reset Password** → colar `reset-password.html`
3. Salvar. Não precisa mexer em "Subject" a menos que queira — sugestões:
   - Confirm signup: `Confirme seu email — ATLION`
   - Reset Password: `Redefinir sua senha — ATLION`

## Por que o link é montado assim

Os dois templates linkam direto pra rota própria do app
(`/auth/confirm`), não pro endpoint hospedado do Supabase — é o mesmo
padrão que `signUp()` já usa via `emailRedirectTo`. A rota em
`src/app/auth/confirm/route.ts` lê `token_hash` e `type` da URL e
chama `verifyOtp` ela mesma, depois redireciona pra `next` (padrão
`/onboarding`, ou explícito via `?next=`).

Por isso o `type` no link **tem que bater** com o contexto do
template: `signup` no de confirmação, `recovery` no de redefinição de
senha. Se um dia mudar pra outro fluxo (magic link, convite, troca de
email), o `type` muda junto.
