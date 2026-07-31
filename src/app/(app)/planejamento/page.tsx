import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIORIDADES, type Prioridade } from "@/lib/disciplinas";
import { ASSUNTOS_SUGERIDOS } from "@/lib/assuntos-sugeridos";
import { InfoTip } from "@/components/ui/info-tip";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  adicionarDisciplina,
  removerDisciplina,
  atualizarPrioridadeDisciplina,
  atualizarLeiPrincipal,
  atualizarJurisprudenciaPrincipal,
  adicionarAssunto,
  adicionarAssuntosEmLote,
  alternarSugestaoAssunto,
  removerAssunto,
  removerTodosAssuntos,
  alternarEstudado,
  moverAssunto,
} from "./actions";
import { ConfirmButton } from "./confirm-button";

const DISCIPLINA_TIPOS: { value: string; label: string }[] = [
  { value: "juridica", label: "Jurídica" },
  { value: "exatas", label: "Exatas" },
  { value: "humanas", label: "Humanas" },
  { value: "informatica", label: "Informática" },
  { value: "idiomas", label: "Idiomas" },
  { value: "personalizada", label: "Personalizada" },
];

type Assunto = {
  id: string;
  nome: string;
  ordem: number;
  ja_estudado: boolean;
  parent_id: string | null;
};

type Disciplina = {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
  prioridade: Prioridade;
  lei_principal: string | null;
  jurisprudencia_principal: string | null;
  assuntos: Assunto[];
};

function LinhaAssunto({
  assunto,
  disciplinaId,
  podeSubir,
  podeDescer,
}: {
  assunto: Assunto;
  disciplinaId: string;
  podeSubir: boolean;
  podeDescer: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <form action={alternarEstudado.bind(null, assunto.id, !assunto.ja_estudado)}>
          <button
            type="submit"
            title="Marcar como estudado/não estudado"
            className={`rounded px-2 py-1 text-xs font-medium ${
              assunto.ja_estudado
                ? "bg-gold/20 text-foreground"
                : "bg-foreground/5 text-foreground/50"
            }`}
          >
            {assunto.ja_estudado ? "estudado" : "não estudado"}
          </button>
        </form>
        <span>{assunto.nome}</span>
      </div>
      <div className="flex items-center gap-1">
        <form action={moverAssunto.bind(null, disciplinaId, assunto.id, "up")}>
          <button
            type="submit"
            disabled={!podeSubir}
            className="px-1 text-foreground/40 hover:text-foreground disabled:opacity-20"
            aria-label={`Mover ${assunto.nome} pra cima`}
          >
            ↑
          </button>
        </form>
        <form action={moverAssunto.bind(null, disciplinaId, assunto.id, "down")}>
          <button
            type="submit"
            disabled={!podeDescer}
            className="px-1 text-foreground/40 hover:text-foreground disabled:opacity-20"
            aria-label={`Mover ${assunto.nome} pra baixo`}
          >
            ↓
          </button>
        </form>
        <form action={removerAssunto.bind(null, assunto.id)}>
          <button
            type="submit"
            className="px-1 text-foreground/40 hover:text-red-600"
            aria-label={`Remover ${assunto.nome}`}
          >
            remover
          </button>
        </form>
      </div>
    </div>
  );
}

function renderAssuntos(
  todos: Assunto[],
  disciplinaId: string,
  parentId: string | null,
  nivel: number
) {
  const filhos = todos
    .filter((a) => a.parent_id === parentId)
    .sort((a, b) => a.ordem - b.ordem);

  if (filhos.length === 0) return null;

  // Nível 0: cada assunto principal (e seus subtópicos) vira um cartão
  // separado, pra ficar visualmente claro onde um bloco termina e o outro
  // começa. Sub-níveis ficam recuados com uma linha vertical dentro do cartão.
  if (nivel === 0) {
    return (
      <div className="space-y-3">
        {filhos.map((assunto, index) => (
          <div key={assunto.id} className="rounded-md border border-foreground/10 bg-foreground/3 p-3">
            <LinhaAssunto
              assunto={assunto}
              disciplinaId={disciplinaId}
              podeSubir={index > 0}
              podeDescer={index < filhos.length - 1}
            />
            {renderAssuntos(todos, disciplinaId, assunto.id, nivel + 1)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="mt-2 space-y-2 border-l border-foreground/10 pl-4">
      {filhos.map((assunto, index) => (
        <li key={assunto.id}>
          <LinhaAssunto
            assunto={assunto}
            disciplinaId={disciplinaId}
            podeSubir={index > 0}
            podeDescer={index < filhos.length - 1}
          />
          {renderAssuntos(todos, disciplinaId, assunto.id, nivel + 1)}
        </li>
      ))}
    </ul>
  );
}

export default async function PlanejamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select(
      "id, nome, tipo, ordem, prioridade, lei_principal, jurisprudencia_principal, assuntos(id, nome, ordem, ja_estudado, parent_id)"
    )
    .eq("user_id", user.id)
    .order("ordem", { ascending: true })
    .returns<Disciplina[]>();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Planejamento</h1>
        <Link href="/painel" className="text-sm text-foreground/60 underline underline-offset-4">
          Voltar
        </Link>
      </div>

      <div className="space-y-4">
        {(disciplinas ?? []).map((disciplina) => {
          const totalAssuntos = disciplina.assuntos.length;
          const sugestoesBase = ASSUNTOS_SUGERIDOS[disciplina.nome] ?? [];
          return (
            <details key={disciplina.id} className="rounded-md border border-foreground/15 p-4" open>
              <summary className="flex cursor-pointer list-none flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">
                    {disciplina.nome}{" "}
                    <span className="text-sm text-foreground/50">
                      · {DISCIPLINA_TIPOS.find((t) => t.value === disciplina.tipo)?.label} ·{" "}
                      {totalAssuntos} assunto(s)
                    </span>
                  </span>
                  <form action={removerDisciplina.bind(null, disciplina.id)}>
                    <button type="submit" className="text-xs text-foreground/40 hover:text-red-600">
                      remover disciplina
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-foreground/40">Prioridade:</span>
                  <InfoTip texto="Prioridade alta faz o Motor de Aprendizagem escolher essa matéria com mais frequência nas sessões de estudo. Baixa não some do ciclo — só entra mais devagar." />
                  {PRIORIDADES.map((p) => (
                    <form key={p.valor} action={atualizarPrioridadeDisciplina.bind(null, disciplina.id, p.valor)}>
                      <SubmitButton
                        pendingText={p.label}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          disciplina.prioridade === p.valor
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-foreground/15 text-foreground/50 hover:border-foreground/30"
                        }`}
                      >
                        {p.label}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </summary>

              <div className="mt-4 space-y-2">
                {disciplina.tipo === "juridica" && (
                  <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-foreground/40">Lei principal:</span>
                    <InfoTip texto="Quando preenchida, a etapa de Lei Seca lê essa lei de forma contínua toda vez que essa disciplina entrar no ciclo — independente do assunto estudado no dia. Deixe em branco pra continuar perguntando a lei a cada assunto." />
                    <form
                      action={atualizarLeiPrincipal.bind(null, disciplina.id)}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <input
                        name="leiPrincipal"
                        type="text"
                        defaultValue={disciplina.lei_principal ?? ""}
                        placeholder="Ex: Constituição Federal"
                        className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs outline-none focus:border-gold"
                      />
                      <SubmitButton
                        pendingText="Salvando..."
                        className="shrink-0 rounded-md px-3 py-1 text-xs font-medium text-foreground/70 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/40"
                      >
                        Salvar
                      </SubmitButton>
                    </form>
                  </div>
                )}

                {disciplina.tipo === "juridica" && (
                  <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-foreground/40">Jurisprudência principal:</span>
                    <InfoTip texto="Quando preenchida, a etapa de Jurisprudência lê essa referência de forma contínua toda vez que essa disciplina entrar no ciclo — independente do assunto estudado no dia. Deixe em branco pra continuar perguntando a jurisprudência a cada assunto." />
                    <form
                      action={atualizarJurisprudenciaPrincipal.bind(null, disciplina.id)}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <input
                        name="jurisprudenciaPrincipal"
                        type="text"
                        defaultValue={disciplina.jurisprudencia_principal ?? ""}
                        placeholder="Ex: Súmulas do STJ e STF"
                        className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs outline-none focus:border-gold"
                      />
                      <SubmitButton
                        pendingText="Salvando..."
                        className="shrink-0 rounded-md px-3 py-1 text-xs font-medium text-foreground/70 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/40"
                      >
                        Salvar
                      </SubmitButton>
                    </form>
                  </div>
                )}

                {totalAssuntos === 0 && (
                  <p className="text-sm text-foreground/50">
                    Nenhum assunto ainda — cole o edital ou o índice do livro logo abaixo
                    {sugestoesBase.length > 0 ? ", ou escolha um dos assuntos sugeridos" : ""} pra
                    começar rápido.
                  </p>
                )}

                {totalAssuntos > 0 && (
                  <>
                    <div className="flex justify-end">
                      <form action={removerTodosAssuntos.bind(null, disciplina.id)}>
                        <ConfirmButton
                          mensagem={`Remover todos os ${totalAssuntos} assunto(s) de ${disciplina.nome}? Essa ação não pode ser desfeita.`}
                          className="text-xs text-foreground/40 hover:text-red-600"
                        >
                          remover todos os assuntos
                        </ConfirmButton>
                      </form>
                    </div>
                    {renderAssuntos(disciplina.assuntos, disciplina.id, null, 0)}
                  </>
                )}

                <form
                  action={adicionarAssunto.bind(null, disciplina.id)}
                  className="flex flex-col gap-2 pt-2 sm:flex-row"
                >
                  <input
                    name="nome"
                    type="text"
                    placeholder="Novo assunto"
                    required
                    className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
                  >
                    Adicionar assunto
                  </button>
                </form>

                {sugestoesBase.length > 0 && (
                  <details className="pt-1" open={totalAssuntos === 0}>
                    <summary className="cursor-pointer text-xs text-foreground/50 hover:text-foreground">
                      ver assuntos sugeridos
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sugestoesBase.map((nome) => {
                        const selecionado = disciplina.assuntos.some(
                          (a) => a.parent_id === null && a.nome.toLowerCase() === nome.toLowerCase()
                        );
                        return (
                          <form key={nome} action={alternarSugestaoAssunto.bind(null, disciplina.id, nome)}>
                            <button
                              type="submit"
                              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                selecionado
                                  ? "border-gold bg-gold/10 text-foreground"
                                  : "border-foreground/20 text-foreground/60 hover:border-foreground/40"
                              }`}
                            >
                              {selecionado && "✓ "}
                              {nome}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </details>
                )}

                <details className="pt-1" open={totalAssuntos === 0}>
                  <summary className="cursor-pointer text-xs text-foreground/50 hover:text-foreground">
                    colar vários assuntos de uma vez
                  </summary>
                  <form
                    action={adicionarAssuntosEmLote.bind(null, disciplina.id)}
                    className="mt-2 space-y-2"
                  >
                    <textarea
                      name="texto"
                      rows={5}
                      required
                      placeholder={
                        "Cole o índice do livro, um assunto por linha, ou o trecho do edital direto (com numeração 1, 1.1, 2...) — os subtópicos (1.1, 1.2) ficam aninhados dentro do assunto principal. Ex:\n1 Poder constituinte. 1.1 Fundamentos do poder constituinte. 2 Direitos fundamentais."
                      }
                      className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
                    >
                      Adicionar todos
                    </button>
                  </form>
                </details>
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-8 rounded-md border border-dashed border-foreground/20 p-4">
        <h2 className="text-sm font-medium text-foreground">Nova disciplina</h2>
        <form action={adicionarDisciplina} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            name="nome"
            type="text"
            placeholder="Nome da disciplina"
            required
            className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <div className="flex gap-2">
            <select
              name="tipo"
              defaultValue="personalizada"
              className="flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-2 text-sm outline-none focus:border-gold sm:flex-none"
            >
              {DISCIPLINA_TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value} className="bg-background text-foreground">
                  {tipo.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
