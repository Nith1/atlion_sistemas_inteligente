"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extrairTopicos } from "@/lib/assuntos-parser";
import { PRIORIDADES } from "@/lib/disciplinas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function adicionarDisciplina(formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim();
  const tipo = (formData.get("tipo") as string) || "personalizada";
  if (!nome) return;

  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("disciplinas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  await supabase.from("disciplinas").insert({
    user_id: user.id,
    nome,
    tipo,
    ordem: count ?? 0,
  });

  revalidatePath("/planejamento");
}

export async function removerDisciplina(disciplinaId: string) {
  const { supabase } = await requireUser();
  await supabase.from("disciplinas").delete().eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

const PRIORIDADES_VALIDAS = PRIORIDADES.map((p) => p.valor);

export async function atualizarPrioridadeDisciplina(disciplinaId: string, prioridade: string) {
  const { supabase } = await requireUser();
  if (!PRIORIDADES_VALIDAS.includes(prioridade as (typeof PRIORIDADES_VALIDAS)[number])) return;

  await supabase.from("disciplinas").update({ prioridade }).eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function adicionarLeiPrincipal(disciplinaId: string, formData: FormData) {
  const lei = (formData.get("leiPrincipal") as string)?.trim();
  if (!lei) return;

  const { supabase } = await requireUser();
  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("leis_principais")
    .eq("id", disciplinaId)
    .single();
  if (!disciplina) return;

  const atuais = disciplina.leis_principais ?? [];
  if (atuais.some((l: string) => l.toLowerCase() === lei.toLowerCase())) return;

  await supabase.from("disciplinas").update({ leis_principais: [...atuais, lei] }).eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function removerLeiPrincipal(disciplinaId: string, lei: string) {
  const { supabase } = await requireUser();
  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("leis_principais")
    .eq("id", disciplinaId)
    .single();
  if (!disciplina) return;

  await supabase
    .from("disciplinas")
    .update({ leis_principais: (disciplina.leis_principais ?? []).filter((l: string) => l !== lei) })
    .eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function adicionarJurisprudenciaPrincipal(disciplinaId: string, formData: FormData) {
  const jurisprudencia = (formData.get("jurisprudenciaPrincipal") as string)?.trim();
  if (!jurisprudencia) return;

  const { supabase } = await requireUser();
  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("jurisprudencias_principais")
    .eq("id", disciplinaId)
    .single();
  if (!disciplina) return;

  const atuais = disciplina.jurisprudencias_principais ?? [];
  if (atuais.some((j: string) => j.toLowerCase() === jurisprudencia.toLowerCase())) return;

  await supabase
    .from("disciplinas")
    .update({ jurisprudencias_principais: [...atuais, jurisprudencia] })
    .eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function removerJurisprudenciaPrincipal(disciplinaId: string, jurisprudencia: string) {
  const { supabase } = await requireUser();
  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("jurisprudencias_principais")
    .eq("id", disciplinaId)
    .single();
  if (!disciplina) return;

  await supabase
    .from("disciplinas")
    .update({
      jurisprudencias_principais: (disciplina.jurisprudencias_principais ?? []).filter(
        (j: string) => j !== jurisprudencia
      ),
    })
    .eq("id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function adicionarAssunto(disciplinaId: string, formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return;

  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("assuntos")
    .select("id", { count: "exact", head: true })
    .eq("disciplina_id", disciplinaId);

  await supabase.from("assuntos").insert({
    disciplina_id: disciplinaId,
    nome,
    ordem: count ?? 0,
  });

  revalidatePath("/planejamento");
}

export async function adicionarAssuntosEmLote(disciplinaId: string, formData: FormData) {
  const texto = (formData.get("texto") as string) ?? "";
  const topicos = extrairTopicos(texto);
  if (topicos.length === 0) return;

  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("assuntos")
    .select("id", { count: "exact", head: true })
    .eq("disciplina_id", disciplinaId);

  const base = count ?? 0;
  // pilha[i] guarda o id do último tópico visto no nível i+1, pra ligar cada
  // sub-assunto ao seu pai mais recente (ex: "1.1" vira filho do último "1").
  const pilha: string[] = [];

  const linhas = topicos.map((topico, indice) => {
    const id = randomUUID();
    const parentId = topico.nivel > 1 ? pilha[topico.nivel - 2] ?? null : null;
    pilha[topico.nivel - 1] = id;
    pilha.length = topico.nivel;

    return {
      id,
      disciplina_id: disciplinaId,
      nome: topico.nome,
      ordem: base + indice,
      parent_id: parentId,
    };
  });

  await supabase.from("assuntos").insert(linhas);
  revalidatePath("/planejamento");
}

// Clique num chip de assunto sugerido (ver src/lib/assuntos-sugeridos.ts):
// adiciona se ainda não existe, remove se já foi adicionado — mesmo toggle
// do onboarding, só que aqui cada clique já grava direto (Planejamento não
// tem um rascunho local antes de persistir).
export async function alternarSugestaoAssunto(disciplinaId: string, nome: string) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("assuntos")
    .select("id")
    .eq("disciplina_id", disciplinaId)
    .is("parent_id", null)
    .ilike("nome", nome)
    .maybeSingle();

  if (existente) {
    await supabase.from("assuntos").delete().eq("id", existente.id);
  } else {
    const { count } = await supabase
      .from("assuntos")
      .select("id", { count: "exact", head: true })
      .eq("disciplina_id", disciplinaId);

    await supabase.from("assuntos").insert({ disciplina_id: disciplinaId, nome, ordem: count ?? 0 });
  }

  revalidatePath("/planejamento");
}

export async function removerAssunto(assuntoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("assuntos").delete().eq("id", assuntoId);
  revalidatePath("/planejamento");
}

export async function removerTodosAssuntos(disciplinaId: string) {
  const { supabase } = await requireUser();
  await supabase.from("assuntos").delete().eq("disciplina_id", disciplinaId);
  revalidatePath("/planejamento");
}

export async function alternarEstudado(assuntoId: string, novoValor: boolean) {
  const { supabase } = await requireUser();
  await supabase
    .from("assuntos")
    .update({
      ja_estudado: novoValor,
      ultima_vez_estudado: novoValor ? new Date().toISOString() : null,
    })
    .eq("id", assuntoId);
  revalidatePath("/planejamento");
}

export async function moverAssunto(
  disciplinaId: string,
  assuntoId: string,
  direcao: "up" | "down"
) {
  const { supabase } = await requireUser();

  const { data: atualRow } = await supabase
    .from("assuntos")
    .select("parent_id")
    .eq("id", assuntoId)
    .single();

  if (!atualRow) return;

  // reordena só entre irmãos (mesmo pai), não entre a lista inteira da disciplina
  let query = supabase
    .from("assuntos")
    .select("id, ordem")
    .eq("disciplina_id", disciplinaId)
    .order("ordem", { ascending: true });

  query = atualRow.parent_id
    ? query.eq("parent_id", atualRow.parent_id)
    : query.is("parent_id", null);

  const { data: irmaos } = await query;

  if (!irmaos) return;
  const index = irmaos.findIndex((a) => a.id === assuntoId);
  const swapIndex = direcao === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= irmaos.length) return;

  const atual = irmaos[index];
  const vizinho = irmaos[swapIndex];

  await supabase.from("assuntos").update({ ordem: vizinho.ordem }).eq("id", atual.id);
  await supabase.from("assuntos").update({ ordem: atual.ordem }).eq("id", vizinho.id);

  revalidatePath("/planejamento");
}
