"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function limparLinha(linha: string): string {
  return linha
    .trim()
    .replace(/^[-•*]\s+/, "")
    .replace(/^\d+(\.\d+)*\.?\s+/, "")
    .replace(/\.\s*$/, "")
    .trim();
}

// Editais (padrão Cebraspe e similares) costumam vir num parágrafo só, com os
// tópicos numerados em sequência (ex: "1 Poder constituinte. 1.1 Fundamentos...
// 1.2 Poder constituinte originário e derivado. 2 Direitos fundamentais..."),
// às vezes com um ponto extra depois do número ("4. Ética no setor público.").
// Quebra cada trecho num assunto separado, exigindo que o texto do tópico
// comece com maiúscula — evita separar em falso em citações como "art. 37".
function explodirTopicosDeEdital(linha: string): string[] {
  const partes = linha
    // remove um cabeçalho de matéria em maiúsculas antes dos dois-pontos (ex: "DIREITO CONSTITUCIONAL: ")
    .replace(/^[A-ZÀ-Ú][A-ZÀ-Ú\s()/-]{2,}:\s*/, "")
    .split(/(?<=\.)\s+(?=\d+(?:\.\d+)*\.?\s+[A-ZÀ-Ú])/);

  return partes.length > 1 ? partes : [linha];
}

function extrairAssuntos(texto: string): string[] {
  return texto
    .split("\n")
    .flatMap(explodirTopicosDeEdital)
    .map(limparLinha)
    .filter((nome) => nome.length > 0);
}

export async function adicionarAssuntosEmLote(disciplinaId: string, formData: FormData) {
  const texto = (formData.get("texto") as string) ?? "";
  const nomes = extrairAssuntos(texto);

  if (nomes.length === 0) return;

  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("assuntos")
    .select("id", { count: "exact", head: true })
    .eq("disciplina_id", disciplinaId);

  const base = count ?? 0;
  await supabase.from("assuntos").insert(
    nomes.map((nome, indice) => ({
      disciplina_id: disciplinaId,
      nome,
      ordem: base + indice,
    }))
  );

  revalidatePath("/planejamento");
}

export async function removerAssunto(assuntoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("assuntos").delete().eq("id", assuntoId);
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
  const { data: assuntos } = await supabase
    .from("assuntos")
    .select("id, ordem")
    .eq("disciplina_id", disciplinaId)
    .order("ordem", { ascending: true });

  if (!assuntos) return;
  const index = assuntos.findIndex((a) => a.id === assuntoId);
  const swapIndex = direcao === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= assuntos.length) return;

  const atual = assuntos[index];
  const vizinho = assuntos[swapIndex];

  await supabase.from("assuntos").update({ ordem: vizinho.ordem }).eq("id", atual.id);
  await supabase.from("assuntos").update({ ordem: atual.ordem }).eq("id", vizinho.id);

  revalidatePath("/planejamento");
}
