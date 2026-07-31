"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { concluirOnboarding } from "./actions";
import { Preparando } from "./preparando";
import { CONCURSOS_SUGERIDOS } from "@/lib/concursos";
import { DISCIPLINAS_SUGERIDAS, inferirTipoDisciplina } from "@/lib/disciplinas";
import { extrairTopicos, type Topico } from "@/lib/assuntos-parser";
import { ASSUNTOS_SUGERIDOS } from "@/lib/assuntos-sugeridos";
import { JURISPRUDENCIA_SUGERIDA, LEIS_SUGERIDAS } from "@/lib/leis-sugeridas";

const HORAS_OPCOES = [
  { label: "1h", valor: 1 },
  { label: "2h", valor: 2 },
  { label: "3h", valor: 3 },
  { label: "4h", valor: 4 },
  { label: "5h+", valor: 5 },
];

const PLACEHOLDERS_DISCIPLINA = ["Ex: Português", "Ex: Direito Constitucional", "Ex: Direito Penal", "Ex: Informática"];

const CATEGORIA_LABEL: Record<string, string> = {
  juridica: "Jurídica",
  exatas: "Exatas",
  humanas: "Humanas",
  informatica: "Informática",
  idiomas: "Idiomas",
};

// achata as sugestões por categoria numa lista única, pro autocomplete de
// cada campo (que não sabe/precisa saber a categoria enquanto a pessoa digita)
const TODAS_SUGESTOES = Object.values(DISCIPLINAS_SUGERIDAS).flat();

type AtivacaoModo = "questoes" | "anki" | "questoes_anki";

const ATIVACAO_MODOS: { value: AtivacaoModo; label: string; descricao: string; Icone: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  {
    value: "questoes",
    label: "Questões",
    descricao: "Refaz questões dos assuntos já estudados.",
    Icone: IconeQuestoes,
  },
  {
    value: "anki",
    label: "Anki",
    descricao: "Revisa com cartões de memorização.",
    Icone: IconeAnki,
  },
  {
    value: "questoes_anki",
    label: "Questões + Anki",
    descricao: "As duas camadas de reforço juntas.",
    Icone: IconeCombo,
  },
];

type FormState = {
  concurso: string;
  temEdital: boolean | null;
  trabalha: boolean | null;
  horasLiquidasDia: number | null;
  disciplinas: string[];
  // chave = nome da disciplina (como digitado em form.disciplinas)
  assuntosPorDisciplina: Record<string, Topico[]>;
  // "cronograma à parte" — só relevante pra disciplinas jurídicas, opcional,
  // espelha lei_principal/jurisprudencia_principal de Planejamento
  leisPorDisciplina: Record<string, string>;
  jurisprudenciasPorDisciplina: Record<string, string>;
  cursoPreparatorio: string;
  ativacaoModo: AtivacaoModo;
};

const estadoInicial: FormState = {
  concurso: "",
  temEdital: null,
  trabalha: null,
  horasLiquidasDia: null,
  disciplinas: [""],
  assuntosPorDisciplina: {},
  leisPorDisciplina: {},
  jurisprudenciasPorDisciplina: {},
  cursoPreparatorio: "",
  ativacaoModo: "questoes",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [direcao, setDirecao] = useState(1);
  const [form, setForm] = useState<FormState>(estadoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function irPara(proxima: number) {
    setErro(null);
    setDirecao(proxima > etapa ? 1 : -1);
    setEtapa(proxima);
  }

  function iniciarPreparacao() {
    setErro(null);
    setDirecao(1);
    setEtapa(4);

    const inicio = Date.now();
    const DURACAO_MINIMA_MS = 5600;

    startTransition(async () => {
      const resultado = await concluirOnboarding({
        concurso: form.concurso,
        temEdital: form.temEdital ?? false,
        horasLiquidasDia: form.horasLiquidasDia,
        trabalha: form.trabalha ?? false,
        cursoPreparatorio: form.cursoPreparatorio,
        ativacaoModo: form.ativacaoModo,
        disciplinas: form.disciplinas
          .map((nome) => nome.trim())
          .filter(Boolean)
          .map((nome) => ({
            nome,
            tipo: inferirTipoDisciplina(nome),
            assuntos: form.assuntosPorDisciplina[nome] ?? [],
            leiPrincipal: form.leisPorDisciplina[nome]?.trim() || null,
            jurisprudenciaPrincipal: form.jurisprudenciasPorDisciplina[nome]?.trim() || null,
          })),
      });

      if (resultado?.error) {
        setErro(resultado.error);
        irPara(3);
        return;
      }

      const decorrido = Date.now() - inicio;
      const faltam = Math.max(0, DURACAO_MINIMA_MS - decorrido);
      setTimeout(() => router.push("/painel"), faltam);
    });
  }

  const podeContinuarEtapa1 =
    form.concurso.trim().length > 0 &&
    form.temEdital !== null &&
    form.trabalha !== null &&
    form.horasLiquidasDia !== null;

  const podeContinuarEtapa2 = form.disciplinas.some((d) => d.trim().length > 0);

  return (
    <div className="w-full max-w-md">
      {etapa < 4 && (
        <div className="mb-10 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= etapa ? "bg-gold" : "bg-foreground/15"}`} />
            ))}
          </div>
          <span className="text-xs text-foreground/40">Etapa {etapa} de 4</span>
        </div>
      )}

      <AnimatePresence mode="wait" custom={direcao}>
        <motion.div
          key={etapa}
          custom={direcao}
          initial="entra"
          animate="centro"
          exit="sai"
          variants={{
            entra: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
            centro: { opacity: 1, x: 0 },
            sai: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
          }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {etapa === 1 && (
            <Etapa1 form={form} setForm={setForm} podeContinuar={podeContinuarEtapa1} onContinuar={() => irPara(2)} />
          )}
          {etapa === 2 && (
            <Etapa2
              form={form}
              setForm={setForm}
              podeContinuar={podeContinuarEtapa2}
              onVoltar={() => irPara(1)}
              onContinuar={() => irPara(3)}
            />
          )}
          {etapa === 3 && (
            <Etapa3
              form={form}
              setForm={setForm}
              erro={erro}
              onVoltar={() => irPara(2)}
              onContinuar={iniciarPreparacao}
            />
          )}
          {etapa === 4 && <Preparando />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Etapa1({
  form,
  setForm,
  podeContinuar,
  onContinuar,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  podeContinuar: boolean;
  onContinuar: () => void;
}) {
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const termo = form.concurso.trim().toLowerCase();
  const sugestoes = termo.length > 0 ? CONCURSOS_SUGERIDOS.filter((c) => c.toLowerCase().includes(termo)).slice(0, 6) : [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Sobre sua preparação</h1>

      <div className="mt-6 space-y-6">
        <div className="relative">
          <label className="mb-2 block text-sm text-foreground/60">Qual concurso deseja prestar?</label>
          <input
            autoFocus
            type="text"
            value={form.concurso}
            onChange={(e) => {
              setForm({ ...form, concurso: e.target.value });
              setMostrarSugestoes(true);
            }}
            onFocus={() => setMostrarSugestoes(true)}
            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 120)}
            placeholder="Ex: PRF, Receita Federal, TRT..."
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
          {mostrarSugestoes && sugestoes.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-foreground/15 bg-background shadow-lg">
              {sugestoes.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm({ ...form, concurso: s });
                      setMostrarSugestoes(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-gold/10"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm text-foreground/60">Já existe edital publicado?</label>
          <SimNao valor={form.temEdital} onEscolher={(v) => setForm({ ...form, temEdital: v })} />
        </div>

        <div>
          <label className="mb-2 block text-sm text-foreground/60">Você trabalha atualmente?</label>
          <SimNao valor={form.trabalha} onEscolher={(v) => setForm({ ...form, trabalha: v })} />
        </div>

        <div>
          <label className="mb-2 block text-sm text-foreground/60">Quantas horas líquidas você possui por dia?</label>
          <div className="flex flex-wrap gap-2">
            {HORAS_OPCOES.map((h) => (
              <button
                key={h.valor}
                type="button"
                onClick={() => setForm({ ...form, horasLiquidasDia: h.valor })}
                className={`rounded-md border px-4 py-3 text-sm font-medium transition ${
                  form.horasLiquidasDia === h.valor
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-foreground/20 text-foreground/70 hover:border-foreground/40"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinuar}
        disabled={!podeContinuar}
        className="mt-8 w-full rounded-md bg-navy px-5 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-40"
      >
        Continuar
      </button>
    </div>
  );
}

function Etapa2({
  form,
  setForm,
  podeContinuar,
  onVoltar,
  onContinuar,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  podeContinuar: boolean;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const [sugestaoAberta, setSugestaoAberta] = useState<number | null>(null);
  const [mostrarPicker, setMostrarPicker] = useState(false);

  function atualizarDisciplina(indice: number, valor: string) {
    setForm((atual) => ({
      ...atual,
      disciplinas: atual.disciplinas.map((d, i) => (i === indice ? valor : d)),
    }));
  }

  function adicionarCampoDisciplina() {
    setForm((atual) => ({ ...atual, disciplinas: [...atual.disciplinas, ""] }));
  }

  function removerCampoDisciplina(indice: number) {
    setForm((atual) => ({
      ...atual,
      disciplinas: atual.disciplinas.length > 1 ? atual.disciplinas.filter((_, i) => i !== indice) : atual.disciplinas,
    }));
  }

  // usado tanto pelo clique numa sugestão do autocomplete quanto pelo
  // picker por categoria — clicar de novo numa já escolhida remove
  function alternarDisciplina(nome: string) {
    setForm((atual) => {
      const nomeLower = nome.toLowerCase();
      const jaTem = atual.disciplinas.some((d) => d.trim().toLowerCase() === nomeLower);
      if (jaTem) {
        const restante = atual.disciplinas.filter((d) => d.trim().toLowerCase() !== nomeLower);
        return { ...atual, disciplinas: restante.length > 0 ? restante : [""] };
      }
      const semVazias = atual.disciplinas.filter((d) => d.trim().length > 0);
      return { ...atual, disciplinas: [...semVazias, nome] };
    });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Seus estudos</h1>
      <p className="mt-1 text-sm text-foreground/60">Conte para a ATLION quais materiais você utilizará.</p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="mb-2 block text-sm text-foreground/60">Disciplinas</label>
          <div className="space-y-2">
            {form.disciplinas.map((disciplina, indice) => {
              const termo = disciplina.trim().toLowerCase();
              const sugestoes =
                termo.length > 0
                  ? TODAS_SUGESTOES.filter((s) => s.toLowerCase().includes(termo) && s.toLowerCase() !== termo).slice(0, 6)
                  : [];

              return (
                <div key={indice} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={disciplina}
                      onChange={(e) => {
                        atualizarDisciplina(indice, e.target.value);
                        setSugestaoAberta(indice);
                      }}
                      onFocus={() => setSugestaoAberta(indice)}
                      onBlur={() => setTimeout(() => setSugestaoAberta((atual) => (atual === indice ? null : atual)), 120)}
                      placeholder={PLACEHOLDERS_DISCIPLINA[indice % PLACEHOLDERS_DISCIPLINA.length]}
                      className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    {sugestaoAberta === indice && sugestoes.length > 0 && (
                      <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-foreground/15 bg-background shadow-lg">
                        {sugestoes.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                atualizarDisciplina(indice, s);
                                setSugestaoAberta(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-gold/10"
                            >
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {form.disciplinas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerCampoDisciplina(indice)}
                      aria-label="Remover disciplina"
                      className="shrink-0 rounded-md px-3 text-foreground/40 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button type="button" onClick={adicionarCampoDisciplina} className="text-sm text-gold hover:opacity-80">
              + Adicionar disciplina
            </button>
            <button
              type="button"
              onClick={() => setMostrarPicker(true)}
              className="text-sm text-foreground/60 underline underline-offset-4 hover:text-foreground"
            >
              Escolher da lista
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-foreground/60">
            Curso preparatório <span className="text-foreground/35">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.cursoPreparatorio}
            onChange={(e) => setForm({ ...form, cursoPreparatorio: e.target.value })}
            placeholder="Ex: Gran Cursos, Estratégia, CERS..."
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-foreground/60">Ativação Cognitiva</label>
          <div className="space-y-2">
            {ATIVACAO_MODOS.map((modo) => (
              <button
                type="button"
                key={modo.value}
                onClick={() => setForm({ ...form, ativacaoModo: modo.value })}
                className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition ${
                  form.ativacaoModo === modo.value
                    ? "border-gold bg-gold/5 shadow-[0_1px_12px_-2px_rgba(201,162,39,0.25)]"
                    : "border-foreground/20 hover:border-foreground/40"
                }`}
              >
                <modo.Icone className="mt-0.5 h-5 w-5 shrink-0 text-foreground/60" />
                <span>
                  <span className="block text-sm font-medium text-foreground">{modo.label}</span>
                  <span className="block text-xs text-foreground/50">{modo.descricao}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={onVoltar} className="text-sm text-foreground/60 hover:text-foreground">
          Voltar
        </button>
        <button
          type="button"
          onClick={onContinuar}
          disabled={!podeContinuar}
          className="rounded-md bg-navy px-6 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-40"
        >
          Continuar
        </button>
      </div>

      <AnimatePresence>
        {mostrarPicker && (
          <DisciplinaPicker
            selecionadas={form.disciplinas}
            onAlternar={alternarDisciplina}
            onFechar={() => setMostrarPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Etapa3({
  form,
  setForm,
  erro,
  onVoltar,
  onContinuar,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  erro: string | null;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const disciplinasValidas = form.disciplinas.map((d) => d.trim()).filter(Boolean);

  function definirAssuntos(nomeDisciplina: string, topicos: Topico[]) {
    setForm((atual) => ({
      ...atual,
      assuntosPorDisciplina: { ...atual.assuntosPorDisciplina, [nomeDisciplina]: topicos },
    }));
  }

  function definirLeiPrincipal(nomeDisciplina: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      leisPorDisciplina: { ...atual.leisPorDisciplina, [nomeDisciplina]: valor },
    }));
  }

  function definirJurisprudenciaPrincipal(nomeDisciplina: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      jurisprudenciasPorDisciplina: { ...atual.jurisprudenciasPorDisciplina, [nomeDisciplina]: valor },
    }));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Assuntos de cada disciplina</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Opcional — cole o edital ou o índice do material, ou pule e adicione depois em Planejamento.
      </p>

      <div className="mt-6 space-y-3">
        {disciplinasValidas.map((nome) => (
          <PainelAssuntosDisciplina
            key={nome}
            nomeDisciplina={nome}
            tipo={inferirTipoDisciplina(nome)}
            topicos={form.assuntosPorDisciplina[nome] ?? []}
            onMudar={(topicos) => definirAssuntos(nome, topicos)}
            leiPrincipal={form.leisPorDisciplina[nome] ?? ""}
            onMudarLeiPrincipal={(valor) => definirLeiPrincipal(nome, valor)}
            jurisprudenciaPrincipal={form.jurisprudenciasPorDisciplina[nome] ?? ""}
            onMudarJurisprudenciaPrincipal={(valor) => definirJurisprudenciaPrincipal(nome, valor)}
          />
        ))}
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={onVoltar} className="text-sm text-foreground/60 hover:text-foreground">
          Voltar
        </button>
        <button
          type="button"
          onClick={onContinuar}
          className="rounded-md bg-navy px-6 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function PainelAssuntosDisciplina({
  nomeDisciplina,
  tipo,
  topicos,
  onMudar,
  leiPrincipal,
  onMudarLeiPrincipal,
  jurisprudenciaPrincipal,
  onMudarJurisprudenciaPrincipal,
}: {
  nomeDisciplina: string;
  tipo: string;
  topicos: Topico[];
  onMudar: (topicos: Topico[]) => void;
  leiPrincipal: string;
  onMudarLeiPrincipal: (valor: string) => void;
  jurisprudenciaPrincipal: string;
  onMudarJurisprudenciaPrincipal: (valor: string) => void;
}) {
  const [nomeNovo, setNomeNovo] = useState("");
  const [textoLote, setTextoLote] = useState("");
  const [mostrarLote, setMostrarLote] = useState(false);
  const [sugestaoAberta, setSugestaoAberta] = useState(false);
  const [mostrarComuns, setMostrarComuns] = useState(false);

  const sugestoesBase = ASSUNTOS_SUGERIDOS[nomeDisciplina] ?? [];
  const termo = nomeNovo.trim().toLowerCase();
  const sugestoesFiltradas =
    termo.length > 0
      ? sugestoesBase.filter((s) => s.toLowerCase().includes(termo) && s.toLowerCase() !== termo).slice(0, 6)
      : [];

  // usado tanto pelo clique numa sugestão do autocomplete quanto pelos chips
  // de "assuntos comuns" — clicar de novo num já adicionado remove
  function alternarSugestao(nome: string) {
    const jaTem = topicos.some((t) => t.nome.toLowerCase() === nome.toLowerCase());
    onMudar(
      jaTem
        ? topicos.filter((t) => t.nome.toLowerCase() !== nome.toLowerCase())
        : [...topicos, { nivel: 1, nome }]
    );
  }

  function adicionarUm() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    if (!topicos.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      onMudar([...topicos, { nivel: 1, nome }]);
    }
    setNomeNovo("");
    setSugestaoAberta(false);
  }

  function adicionarLote() {
    const novos = extrairTopicos(textoLote);
    if (novos.length === 0) return;
    onMudar([...topicos, ...novos]);
    setTextoLote("");
    setMostrarLote(false);
  }

  // remove o tópico e seus sub-assuntos (os que vêm logo depois com nível
  // maior), senão sobrava sub-assunto órfão na lista
  function remover(indice: number) {
    const alvo = topicos[indice];
    let fim = indice + 1;
    while (fim < topicos.length && topicos[fim].nivel > alvo.nivel) fim++;
    onMudar([...topicos.slice(0, indice), ...topicos.slice(fim)]);
  }

  return (
    <details open className="rounded-md border border-foreground/15 p-4">
      <summary className="cursor-pointer list-none font-medium text-foreground">
        {nomeDisciplina}{" "}
        <span className="text-sm font-normal text-foreground/50">
          · {topicos.length} assunto{topicos.length === 1 ? "" : "s"}
        </span>
      </summary>

      {tipo === "juridica" && (
        <div className="mt-3 space-y-2 border-b border-foreground/10 pb-3">
          <div>
            <label className="mb-1 block text-xs text-foreground/50">
              Lei principal (opcional — só se quiser ler ela de forma contínua, não por assunto)
            </label>
            <input
              type="text"
              value={leiPrincipal}
              onChange={(e) => onMudarLeiPrincipal(e.target.value)}
              placeholder="Ex: Constituição Federal"
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
            {(LEIS_SUGERIDAS[nomeDisciplina] ?? []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {LEIS_SUGERIDAS[nomeDisciplina].map((nome) => {
                  const selecionada = leiPrincipal === nome;
                  return (
                    <button
                      type="button"
                      key={nome}
                      onClick={() => onMudarLeiPrincipal(selecionada ? "" : nome)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        selecionada
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-foreground/20 text-foreground/60 hover:border-foreground/40"
                      }`}
                    >
                      {selecionada && "✓ "}
                      {nome}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/50">Jurisprudência principal (opcional)</label>
            <input
              type="text"
              value={jurisprudenciaPrincipal}
              onChange={(e) => onMudarJurisprudenciaPrincipal(e.target.value)}
              placeholder="Ex: Súmulas do STJ e STF"
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {JURISPRUDENCIA_SUGERIDA.map((nome) => {
                const selecionada = jurisprudenciaPrincipal === nome;
                return (
                  <button
                    type="button"
                    key={nome}
                    onClick={() => onMudarJurisprudenciaPrincipal(selecionada ? "" : nome)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      selecionada
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-foreground/20 text-foreground/60 hover:border-foreground/40"
                    }`}
                  >
                    {selecionada && "✓ "}
                    {nome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {topicos.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {topicos.map((topico, indice) => (
            <div
              key={indice}
              style={{ marginLeft: (topico.nivel - 1) * 16 }}
              className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 bg-foreground/3 px-3 py-1.5 text-sm"
            >
              <span className="text-foreground">{topico.nome}</span>
              <button
                type="button"
                onClick={() => remover(indice)}
                aria-label={`Remover ${topico.nome}`}
                className="shrink-0 text-foreground/40 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={nomeNovo}
            onChange={(e) => {
              setNomeNovo(e.target.value);
              setSugestaoAberta(true);
            }}
            onFocus={() => setSugestaoAberta(true)}
            onBlur={() => setTimeout(() => setSugestaoAberta(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarUm();
              }
            }}
            placeholder="Novo assunto"
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
          {sugestaoAberta && sugestoesFiltradas.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-foreground/15 bg-background shadow-lg">
              {sugestoesFiltradas.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      alternarSugestao(s);
                      setNomeNovo("");
                      setSugestaoAberta(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-gold/10"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={adicionarUm}
          className="shrink-0 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Adicionar
        </button>
      </div>

      {sugestoesBase.length > 0 && (
        <div className="mt-2">
          {mostrarComuns ? (
            <div className="flex flex-wrap gap-1.5">
              {sugestoesBase.map((nome) => {
                const selecionado = topicos.some((t) => t.nome.toLowerCase() === nome.toLowerCase());
                return (
                  <button
                    type="button"
                    key={nome}
                    onClick={() => alternarSugestao(nome)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      selecionado
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-foreground/20 text-foreground/60 hover:border-foreground/40"
                    }`}
                  >
                    {selecionado && "✓ "}
                    {nome}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarComuns(true)}
              className="text-xs text-foreground/50 hover:text-foreground"
            >
              ver assuntos comuns dessa disciplina
            </button>
          )}
        </div>
      )}

      <div className="mt-2">
        {mostrarLote ? (
          <div className="space-y-2">
            <textarea
              value={textoLote}
              onChange={(e) => setTextoLote(e.target.value)}
              rows={4}
              placeholder={
                "Cole o índice do livro, um assunto por linha, ou o trecho do edital direto (com numeração 1, 1.1, 2...) — os subtópicos ficam aninhados dentro do assunto principal."
              }
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={adicionarLote}
                className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
              >
                Adicionar todos
              </button>
              <button
                type="button"
                onClick={() => setMostrarLote(false)}
                className="text-sm text-foreground/50 hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarLote(true)}
            className="text-xs text-foreground/50 hover:text-foreground"
          >
            colar vários assuntos de uma vez
          </button>
        )}
      </div>
    </details>
  );
}

function DisciplinaPicker({
  selecionadas,
  onAlternar,
  onFechar,
}: {
  selecionadas: string[];
  onAlternar: (nome: string) => void;
  onFechar: () => void;
}) {
  const selecionadasLower = new Set(selecionadas.map((d) => d.trim().toLowerCase()).filter(Boolean));
  const totalSelecionadas = selecionadasLower.size;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      onClick={onFechar}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-foreground/10 bg-background p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Escolher disciplinas</h2>
          <button type="button" onClick={onFechar} className="text-sm text-foreground/50 hover:text-foreground">
            Fechar
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/50">Clique pra adicionar ou remover. Dá pra digitar as suas também.</p>

        <div className="mt-5 space-y-5">
          {Object.entries(DISCIPLINAS_SUGERIDAS)
            .filter(([, nomes]) => nomes.length > 0)
            .map(([tipo, nomes]) => (
              <div key={tipo}>
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  {CATEGORIA_LABEL[tipo] ?? tipo}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nomes.map((nome) => {
                    const selecionada = selecionadasLower.has(nome.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={nome}
                        onClick={() => onAlternar(nome)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          selecionada
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-foreground/20 text-foreground/70 hover:border-foreground/40"
                        }`}
                      >
                        {selecionada && "✓ "}
                        {nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        <button
          type="button"
          onClick={onFechar}
          className="mt-6 w-full rounded-md bg-navy px-5 py-3 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Concluído{totalSelecionadas > 0 ? ` (${totalSelecionadas})` : ""}
        </button>
      </motion.div>
    </motion.div>
  );
}

function SimNao({ valor, onEscolher }: { valor: boolean | null; onEscolher: (valor: boolean) => void }) {
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
            valor === opcao.value ? "border-gold bg-gold/10" : "border-foreground/20 hover:border-foreground/40"
          }`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

function IconeQuestoes(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 11l2.5 2.5L16 8" />
    </svg>
  );
}

function IconeAnki(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="7" width="14" height="10" rx="2" />
      <path d="M8 4h11a2 2 0 0 1 2 2v9" />
    </svg>
  );
}

function IconeCombo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l8 4-8 4-8-4 8-4Z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 17l8 4 8-4" />
    </svg>
  );
}
