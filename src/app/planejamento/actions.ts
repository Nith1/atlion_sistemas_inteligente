"use server";

import { randomUUID } from "node:crypto";
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

// Padrão de início de tópico de edital: "1 ", "1.1 ", "4. " etc. seguido de
// maiúscula — exigir maiúscula evita separar em falso em citações tipo "art. 37".
const INICIO_TOPICO = /\d+(?:\.\d+)*\.?\s+[A-ZÀ-Ú]/;

// Quebra um bloco de texto (já sem quebras de linha internas) em tópicos
// separados, a cada ocorrência de ". N " / ". N.N " / ". N. " etc.
function explodirTopicosDeEdital(texto: string): string[] {
  const partes = texto.split(new RegExp(`(?<=\\.)\\s+(?=${INICIO_TOPICO.source})`));
  return partes.length > 1 ? partes : [texto];
}

type Topico = { nivel: number; nome: string };

// A profundidade da numeração ("1" → nível 1, "1.1" → nível 2, "1.1.1" → nível
// 3...) vira profundidade de sub-assunto.
function extrairTopicos(texto: string): Topico[] {
  // Editais colados (principalmente copiados de PDF) costumam ter quebra de
  // linha no meio da frase — é assim que a camada de texto do PDF reflui,
  // não tem relação com onde um tópico termina. Se o texto tem várias
  // ocorrências de numeração de tópico, tratamos tudo como um parágrafo só
  // (juntando as linhas) e separamos pela numeração, não pela quebra de linha.
  const ocorrenciasDeTopico = (texto.match(new RegExp(INICIO_TOPICO, "g")) ?? []).length;

  const blocos =
    ocorrenciasDeTopico >= 2
      ? explodirTopicosDeEdital(
          texto
            .replace(/\s*\n\s*/g, " ")
            .replace(/^[A-ZÀ-Ú][A-ZÀ-Ú\s()/-]{2,}:\s*/, "")
        )
      : texto.split("\n");

  return blocos
    .map((trecho) => {
      const bruto = trecho.trim();
      const numeracao = bruto.match(/^(\d+(?:\.\d+)*)\.?\s+/);
      const nivel = numeracao ? numeracao[1].split(".").length : 1;
      return { nivel, nome: limparLinha(bruto) };
    })
    .filter((topico) => topico.nome.length > 0);
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
