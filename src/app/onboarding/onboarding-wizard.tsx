"use client";

import { useState, useTransition } from "react";
import { concluirOnboarding, type DisciplinaInput } from "./actions";

const DISCIPLINA_TIPOS: { value: string; label: string }[] = [
  { value: "juridica", label: "Jurídica" },
  { value: "exatas", label: "Exatas" },
  { value: "humanas", label: "Humanas" },
  { value: "informatica", label: "Informática" },
  { value: "idiomas", label: "Idiomas" },
  { value: "personalizada", label: "Personalizada" },
];

const ATIVACAO_MODOS: { value: "questoes" | "anki" | "questoes_anki"; label: string; descricao: string }[] = [
  { value: "questoes", label: "Questões", descricao: "Modo padrão da plataforma." },
  { value: "anki", label: "Anki", descricao: "Só reforço via cartões de memorização." },
  { value: "questoes_anki", label: "Questões + Anki", descricao: "As duas camadas de reforço juntas." },
];

type FormState = {
  concurso: string;
  temEdital: boolean | null;
  horasLiquidasDia: string;
  trabalha: boolean | null;
  disciplinas: DisciplinaInput[];
  cursoPreparatorio: string;
  ativacaoModo: "questoes" | "anki" | "questoes_anki";
};

const estadoInicial: FormState = {
  concurso: "",
  temEdital: null,
  horasLiquidasDia: "",
  trabalha: null,
  disciplinas: [],
  cursoPreparatorio: "",
  ativacaoModo: "questoes",
};

const TOTAL_ETAPAS = 7;

export function OnboardingWizard() {
  const [etapa, setEtapa] = useState(1);
  const [form, setForm] = useState<FormState>(estadoInicial);
  const [novaDisciplina, setNovaDisciplina] = useState("");
  const [novoTipo, setNovoTipo] = useState(DISCIPLINA_TIPOS[0].value);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function avancar() {
    setErro(null);
    setEtapa((atual) => Math.min(atual + 1, TOTAL_ETAPAS));
  }

  function voltar() {
    setErro(null);
    setEtapa((atual) => Math.max(atual - 1, 1));
  }

  function adicionarDisciplina() {
    const nome = novaDisciplina.trim();
    if (!nome) return;
    setForm((atual) => ({
      ...atual,
      disciplinas: [...atual.disciplinas, { nome, tipo: novoTipo }],
    }));
    setNovaDisciplina("");
  }

  function removerDisciplina(indice: number) {
    setForm((atual) => ({
      ...atual,
      disciplinas: atual.disciplinas.filter((_, i) => i !== indice),
    }));
  }

  function concluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await concluirOnboarding({
        concurso: form.concurso,
        temEdital: form.temEdital ?? false,
        horasLiquidasDia: form.horasLiquidasDia ? Number(form.horasLiquidasDia) : null,
        trabalha: form.trabalha ?? false,
        cursoPreparatorio: form.cursoPreparatorio,
        ativacaoModo: form.ativacaoModo,
        disciplinas: form.disciplinas,
      });
      if (resultado?.error) {
        setErro(resultado.error);
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-10 h-1 w-full rounded-full bg-foreground/10">
        <div
          className="h-1 rounded-full bg-gold transition-all"
          style={{ width: `${(etapa / TOTAL_ETAPAS) * 100}%` }}
        />
      </div>

      {etapa === 1 && (
        <Step
          titulo="Qual concurso você deseja prestar?"
          onContinuar={avancar}
          podeContinuar={form.concurso.trim().length > 0}
        >
          <input
            autoFocus
            type="text"
            value={form.concurso}
            onChange={(e) => setForm({ ...form, concurso: e.target.value })}
            placeholder="Ex: Auditor Fiscal, PRF, Escrevente TJ..."
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </Step>
      )}

      {etapa === 2 && (
        <Step
          titulo="Já existe edital publicado?"
          onContinuar={avancar}
          onVoltar={voltar}
          podeContinuar={form.temEdital !== null}
        >
          <SimNao valor={form.temEdital} onEscolher={(v) => setForm({ ...form, temEdital: v })} />
        </Step>
      )}

      {etapa === 3 && (
        <Step
          titulo="Quantas horas líquidas você tem por dia?"
          onContinuar={avancar}
          onVoltar={voltar}
          podeContinuar={form.horasLiquidasDia.trim().length > 0}
        >
          <input
            autoFocus
            type="number"
            min={0}
            step={0.5}
            value={form.horasLiquidasDia}
            onChange={(e) => setForm({ ...form, horasLiquidasDia: e.target.value })}
            placeholder="Ex: 3"
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </Step>
      )}

      {etapa === 4 && (
        <Step
          titulo="Você trabalha atualmente?"
          onContinuar={avancar}
          onVoltar={voltar}
          podeContinuar={form.trabalha !== null}
        >
          <SimNao valor={form.trabalha} onEscolher={(v) => setForm({ ...form, trabalha: v })} />
        </Step>
      )}

      {etapa === 5 && (
        <Step
          titulo="Quais disciplinas você pretende estudar?"
          subtitulo="Só o nome por agora — depois, no Planejamento, você cola o edital ou o índice do livro e a gente organiza os assuntos de cada uma."
          onContinuar={avancar}
          onVoltar={voltar}
          podeContinuar={form.disciplinas.length > 0}
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={novaDisciplina}
                onChange={(e) => setNovaDisciplina(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarDisciplina();
                  }
                }}
                placeholder="Nome da disciplina"
                className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
              />
              <div className="flex gap-2">
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-2 text-sm outline-none focus:border-gold sm:flex-none"
                >
                  {DISCIPLINA_TIPOS.map((tipo) => (
                    <option key={tipo.value} value={tipo.value} className="bg-background text-foreground">
                      {tipo.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={adicionarDisciplina}
                  className="shrink-0 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {form.disciplinas.length > 0 && (
              <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
                {form.disciplinas.map((disciplina, indice) => (
                  <li key={indice} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {disciplina.nome}{" "}
                      <span className="text-foreground/50">
                        · {DISCIPLINA_TIPOS.find((t) => t.value === disciplina.tipo)?.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removerDisciplina(indice)}
                      className="text-foreground/50 hover:text-red-600"
                      aria-label={`Remover ${disciplina.nome}`}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Step>
      )}

      {etapa === 6 && (
        <Step
          titulo="Qual curso preparatório você utiliza?"
          subtitulo="Opcional — pode deixar em branco."
          onContinuar={avancar}
          onVoltar={voltar}
          podeContinuar
        >
          <input
            autoFocus
            type="text"
            value={form.cursoPreparatorio}
            onChange={(e) => setForm({ ...form, cursoPreparatorio: e.target.value })}
            placeholder="Ex: Gran Cursos, Estratégia..."
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </Step>
      )}

      {etapa === 7 && (
        <Step
          titulo="Como você quer fazer a Ativação Cognitiva?"
          subtitulo="É o reforço dos assuntos já estudados, antes de aprender algo novo."
          onContinuar={concluir}
          onVoltar={voltar}
          podeContinuar
          textoContinuar={pending ? "Gerando seu planejamento..." : "Concluir"}
          desabilitarContinuar={pending}
        >
          <div className="space-y-2">
            {ATIVACAO_MODOS.map((modo) => (
              <button
                type="button"
                key={modo.value}
                onClick={() => setForm({ ...form, ativacaoModo: modo.value })}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  form.ativacaoModo === modo.value
                    ? "border-gold bg-gold/10"
                    : "border-foreground/20 hover:border-foreground/40"
                }`}
              >
                <span className="font-medium">{modo.label}</span>
                <span className="block text-foreground/60">{modo.descricao}</span>
              </button>
            ))}
          </div>
          {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}
        </Step>
      )}
    </div>
  );
}

function Step({
  titulo,
  subtitulo,
  children,
  onContinuar,
  onVoltar,
  podeContinuar,
  textoContinuar = "Continuar",
  desabilitarContinuar = false,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  onContinuar: () => void;
  onVoltar?: () => void;
  podeContinuar: boolean;
  textoContinuar?: string;
  desabilitarContinuar?: boolean;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-foreground/60">{subtitulo}</p>}
      <div className="mt-6">{children}</div>
      <div className="mt-8 flex items-center justify-between">
        {onVoltar ? (
          <button
            type="button"
            onClick={onVoltar}
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            Voltar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onContinuar}
          disabled={!podeContinuar || desabilitarContinuar}
          className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-40"
        >
          {textoContinuar}
        </button>
      </div>
    </div>
  );
}

function SimNao({
  valor,
  onEscolher,
}: {
  valor: boolean | null;
  onEscolher: (valor: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      {[
        { label: "Sim", value: true },
        { label: "Não", value: false },
      ].map((opcao) => (
        <button
          type="button"
          key={opcao.label}
          onClick={() => onEscolher(opcao.value)}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition ${
            valor === opcao.value
              ? "border-gold bg-gold/10"
              : "border-foreground/20 hover:border-foreground/40"
          }`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
