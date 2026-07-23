import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  adicionarDisciplina,
  removerDisciplina,
  adicionarAssunto,
  adicionarAssuntosEmLote,
  removerAssunto,
  alternarEstudado,
  moverAssunto,
} from "./actions";

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
};

type Disciplina = {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
  assuntos: Assunto[];
};

export default async function PlanejamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo, ordem, assuntos(id, nome, ordem, ja_estudado)")
    .eq("user_id", user.id)
    .order("ordem", { ascending: true })
    .returns<Disciplina[]>();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Planejamento</h1>
        <Link href="/painel" className="text-sm text-foreground/60 underline underline-offset-4">
          Voltar
        </Link>
      </div>

      <div className="space-y-4">
        {(disciplinas ?? []).map((disciplina) => {
          const assuntos = [...disciplina.assuntos].sort((a, b) => a.ordem - b.ordem);
          return (
            <details key={disciplina.id} className="rounded-md border border-foreground/15 p-4" open>
              <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-foreground">
                  {disciplina.nome}{" "}
                  <span className="text-sm text-foreground/50">
                    · {DISCIPLINA_TIPOS.find((t) => t.value === disciplina.tipo)?.label} ·{" "}
                    {assuntos.length} assunto(s)
                  </span>
                </span>
                <form action={removerDisciplina.bind(null, disciplina.id)}>
                  <button type="submit" className="text-xs text-foreground/40 hover:text-red-600">
                    remover disciplina
                  </button>
                </form>
              </summary>

              <div className="mt-4 space-y-2">
                {assuntos.length === 0 && (
                  <p className="text-sm text-foreground/50">Nenhum assunto ainda.</p>
                )}

                {assuntos.length > 0 && (
                  <ul className="divide-y divide-foreground/10">
                    {assuntos.map((assunto, index) => (
                      <li
                        key={assunto.id}
                        className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
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
                          <form action={moverAssunto.bind(null, disciplina.id, assunto.id, "up")}>
                            <button
                              type="submit"
                              disabled={index === 0}
                              className="px-1 text-foreground/40 hover:text-foreground disabled:opacity-20"
                              aria-label={`Mover ${assunto.nome} pra cima`}
                            >
                              ↑
                            </button>
                          </form>
                          <form action={moverAssunto.bind(null, disciplina.id, assunto.id, "down")}>
                            <button
                              type="submit"
                              disabled={index === assuntos.length - 1}
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
                      </li>
                    ))}
                  </ul>
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

                <details className="pt-1">
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
                        "Cole o índice do livro ou o edital, um assunto por linha. Ex:\nDireitos fundamentais\nControle de constitucionalidade\nOrganização do Estado"
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
                <option key={tipo.value} value={tipo.value}>
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
    </main>
  );
}
