"use server";

import { createClient } from "@/lib/supabase/server";
import { garantirSessaoEmAndamento } from "../(app)/sessao/actions";

export type DisciplinaInput = { nome: string; tipo: string };

export type OnboardingPayload = {
  concurso: string;
  temEdital: boolean;
  horasLiquidasDia: number | null;
  trabalha: boolean;
  cursoPreparatorio: string;
  ativacaoModo: "questoes" | "anki" | "questoes_anki";
  disciplinas: DisciplinaInput[];
};

export async function concluirOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      concurso: payload.concurso,
      tem_edital: payload.temEdital,
      horas_liquidas_dia: payload.horasLiquidasDia,
      trabalha: payload.trabalha,
      curso_preparatorio: payload.cursoPreparatorio || null,
      ativacao_modo: payload.ativacaoModo,
      onboarding_completo: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  if (payload.disciplinas.length > 0) {
    const { error: disciplinasError } = await supabase.from("disciplinas").insert(
      payload.disciplinas.map((disciplina, indice) => ({
        user_id: user.id,
        nome: disciplina.nome,
        tipo: disciplina.tipo,
        ordem: indice,
      }))
    );

    if (disciplinasError) {
      return { error: disciplinasError.message };
    }
  }

  // já deixa a primeira sessão pronta — é isso que o primeiro Dashboard mostra
  await garantirSessaoEmAndamento(supabase, user.id);

  return { success: true };
}
