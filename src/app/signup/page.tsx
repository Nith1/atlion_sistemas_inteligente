import { redirect } from "next/navigation";

// Cadastro público fechado — pré-lançamento. Entrada só por convite
// individual ou pela lista de espera. Mantido como redirect (em vez de
// apagar a rota) pra não quebrar links antigos/indexados.
export default function SignupPage() {
  redirect("/#lista-de-espera");
}
