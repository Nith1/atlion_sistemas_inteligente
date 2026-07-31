"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { type Topico } from "@/lib/assuntos-parser";
import { garantirSessaoEmAndamento } from "../(app)/sessao/actions";

export type DisciplinaInput = {
  nome: string;
  tipo: string;
  assuntos: Topico[];
  leiPrincipal: string | null;
  jurisprudenciaPrincipal: string | null;
};

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
    const { data: disciplinasInseridas, error: disciplinasError } = await supabase
      .from("disciplinas")
      .insert(
        payload.disciplinas.map((disciplina, indice) => ({
          user_id: user.id,
          nome: disciplina.nome,
          tipo: disciplina.tipo,
          ordem: indice,
          lei_principal: disciplina.leiPrincipal,
          jurisprudencia_principal: disciplina.jurisprudenciaPrincipal,
        }))
      )
      .select("id, nome");

    if (disciplinasError) {
      return { error: disciplinasError.message };
    }

    // liga cada tópico ao pai mais recente do nível anterior, igual ao
    // "colar em lote" de Planejamento — mesma lógica, só que aqui roda pra
    // todas as disciplinas de uma vez, no fim do onboarding
    const linhasDeAssuntos = (disciplinasInseridas ?? []).flatMap((disciplina) => {
      const topicos = payload.disciplinas.find((d) => d.nome === disciplina.nome)?.assuntos ?? [];
      const pilha: string[] = [];

      return topicos.map((topico, indice) => {
        const id = randomUUID();
        const parentId = topico.nivel > 1 ? pilha[topico.nivel - 2] ?? null : null;
        pilha[topico.nivel - 1] = id;
        pilha.length = topico.nivel;

        return {
          id,
          disciplina_id: disciplina.id,
          nome: topico.nome,
          ordem: indice,
          parent_id: parentId,
        };
      });
    });

    if (linhasDeAssuntos.length > 0) {
      const { error: assuntosError } = await supabase.from("assuntos").insert(linhasDeAssuntos);
      if (assuntosError) {
        return { error: assuntosError.message };
      }
    }
  }

  // já deixa a primeira sessão pronta — é isso que o primeiro Dashboard mostra
  await garantirSessaoEmAndamento(supabase, user.id);

  return { success: true };
}
