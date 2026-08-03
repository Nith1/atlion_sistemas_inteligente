"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Cronometro, TempoAcumulado } from "./cronometro";
import { SubmitButton } from "@/components/ui/submit-button";
import { InfoTip } from "@/components/ui/info-tip";
import { ETAPA_LABELS, MINUTOS_SUGERIDOS, SUGERIDO_LABEL } from "@/lib/etapas";
import { LIMITE_CRONOMETRO_SEGUNDOS } from "@/lib/tempo";
import { carregarEstado, limparEstado, salvarEstado } from "@/lib/sessao-offline/armazenamento";
import { criarControladorFila, enfileirar } from "@/lib/sessao-offline/fila";
import { despacharMutacao } from "@/lib/sessao-offline/despachar";
import { useStatusOnline } from "@/lib/sessao-offline/usar-status-online";
import type { MutacaoSemId, SessaoBundle, SessaoLocalState } from "@/lib/sessao-offline/tipos";

// Ordem de prioridade pra buscar questões fora da plataforma (a ATLION não
// é banco de questões — isso orienta onde/como procurar): novas do cargo →
// novas de cargos semelhantes → já erradas → todas de novo, do início.
const FILTRO_QUESTOES_TEXTO =
  "Filtre primeiro por cargo e, se já souber, por banca. Sempre questões novas. Quando acabarem as novas do seu cargo, passe pra novas de cargos semelhantes, mantendo o filtro de banca. Só quando essas também acabarem, filtre pelas que você errou. E quando essas também acabarem, aí sim pode repetir todas as questões de novo, do início.";

// Anki como caderno de erros: toda questão errada (ou nova demais / chutada)
// vira flashcard — não é um banco de revisão espaçada genérico, é
// especificamente onde os erros vão parar.
const ANKI_CADERNO_ERROS_TEXTO =
  "O Anki funciona como seu caderno de erros: depois de responder as questões (numa plataforma à parte — a ATLION só registra o resultado), crie um flashcard pra cada uma que você errou, mais as totalmente novas ou que você chutou.";

// Sugestão de quantidade de questões por assunto na Ativação Cognitiva: uma
// faixa de 10 a 15 questões no total da revisão, dividida entre os assuntos
// da janela (1 assunto = 10 a 15; 2 assuntos = ~5 a 8 cada; e assim por
// diante).
function sugestaoQuestoesPorAssunto(totalAssuntos: number): string {
  const minimo = Math.max(1, Math.floor(10 / totalAssuntos));
  const maximo = Math.max(minimo, Math.ceil(15 / totalAssuntos));
  return minimo === maximo ? `${minimo} questões` : `${minimo} a ${maximo} questões`;
}

const CONSOLIDACAO_INSTRUCAO: Record<string, string> = {
  exercicios: "Resolva exercícios sobre esse assunto no seu material.",
  laboratorio: "Pratique em laboratório/simulador esse assunto.",
};

const ATIVACAO_MODO_LABEL: Record<string, string> = {
  questoes: "Refaça algumas questões desses assuntos.",
  anki: "Revise esses assuntos no Anki.",
  questoes_anki: "Refaça questões e revise no Anki esses assuntos.",
};

// Roda em todo mount deste componente — trava por sessaoId, então é seguro
// como singleton mesmo se o componente remontar.
const controladorFila = criarControladorFila(despacharMutacao);

function estadoDeBundle(bundle: SessaoBundle): SessaoLocalState {
  return {
    versao: 1,
    sessaoId: bundle.sessaoId,
    etapas: bundle.etapas,
    assuntoSelecionado: bundle.assuntoSelecionado,
    progressoLeiSecaDisciplina: bundle.progressoLeiSecaDisciplina,
    progressoJurisprudenciaDisciplina: bundle.progressoJurisprudenciaDisciplina,
    fila: [],
    atualizadoEm: new Date().toISOString(),
  };
}

export function SessaoRuntime({ bundle }: { bundle: SessaoBundle }) {
  const router = useRouter();
  const online = useStatusOnline();

  // Inicializa uma única vez — de propósito NÃO re-sincroniza com o prop
  // `bundle` se ele mudar (revalidatePath, chamado por toda Server Action,
  // pode reenviar um bundle novo junto da resposta; se resincronizássemos
  // aqui perderíamos o avanço otimista local sempre que uma mutação
  // sincronizasse). Só confia no estado salvo se ele tiver algo pendente de
  // sincronizar — senão o bundle fresco do servidor já é a verdade.
  const [estado, setEstado] = useState<SessaoLocalState>(() => {
    const salvo = carregarEstado(bundle.sessaoId);
    return salvo && salvo.fila.length > 0 ? salvo : estadoDeBundle(bundle);
  });

  // Mantido em sincronia manualmente em todo lugar que chama setEstado
  // (nunca durante o render) — é o que dá aos callbacks (flush, listeners
  // de online/visibilitychange) acesso ao estado mais recente sem closure
  // velha, sem precisar de um efeito só pra copiar `estado` pra cá.
  const estadoRef = useRef(estado);

  function despacharFila() {
    controladorFila.flush(
      bundle.sessaoId,
      () => estadoRef.current,
      (mutacaoSincronizada, novoEstado) => {
        estadoRef.current = novoEstado;
        setEstado(novoEstado);
        salvarEstado(novoEstado);
        if (
          mutacaoSincronizada.tipo === "concluirQuestoes" ||
          mutacaoSincronizada.tipo === "concluirQuestoesConsolidacao" ||
          mutacaoSincronizada.tipo === "concluirQuestoesValidacao"
        ) {
          limparEstado(bundle.sessaoId);
          // Não sabe daqui se coube mais uma sessão hoje (ver
          // tentarEncadearProximaSessao em sessao/actions.ts). router.push
          // pra essa mesma URL seria um no-op (já estamos em /sessao) — quem
          // busca o estado novo do servidor é router.refresh(): re-executa
          // SessaoPage, que ou já encontra a próxima sessão pronta (o
          // key={sessaoId} em page.tsx remonta este componente com o bundle
          // novo) ou redireciona sozinho pro Painel se não tiver mais nada.
          router.refresh();
        }
      }
    );
  }

  function enfileirarEEmSincronizar(mutacao: MutacaoSemId) {
    const novoEstado = enfileirar(estadoRef.current, mutacao);
    estadoRef.current = novoEstado;
    setEstado(novoEstado);
    salvarEstado(novoEstado);
    despacharFila();
  }

  useEffect(() => {
    despacharFila();

    function aoVoltarOnline() {
      despacharFila();
    }
    function aoMudarVisibilidade() {
      if (document.visibilityState === "visible") despacharFila();
    }

    window.addEventListener("online", aoVoltarOnline);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      window.removeEventListener("online", aoVoltarOnline);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const etapaAtual = estado.etapas.find((e) => !e.concluida);
  const etapaIndex = etapaAtual ? estado.etapas.findIndex((e) => e.id === etapaAtual.id) : -1;

  const acumuladoEtapaAtual = etapaAtual
    ? Math.min(etapaAtual.tempoAcumuladoSegundos, LIMITE_CRONOMETRO_SEGUNDOS)
    : 0;

  // "Nesta sessão": soma o que já foi concluído localmente — cresce em
  // tempo real conforme etapas avançam offline, igual ao que
  // revalidatePath faria online.
  const tempoBaseSessaoSegundos = useMemo(
    () =>
      estado.etapas.reduce(
        (soma, e) => soma + (e.concluida ? Math.min(e.tempoGastoSegundos ?? 0, LIMITE_CRONOMETRO_SEGUNDOS) : 0),
        0
      ),
    [estado.etapas]
  );

  // "Hoje": parte do total já confirmado no servidor no momento do load
  // (bundle.tempoBaseHojeSegundos, que cobre outras sessões do dia também)
  // + o que essa sessão concluiu localmente desde então e ainda não tava
  // contado nesse total.
  const tempoBaseHojeSegundos = useMemo(() => {
    const jaContabilizadas = new Set(bundle.etapas.filter((e) => e.concluida).map((e) => e.id));
    const extra = estado.etapas.reduce(
      (soma, e) =>
        soma + (e.concluida && !jaContabilizadas.has(e.id) ? Math.min(e.tempoGastoSegundos ?? 0, LIMITE_CRONOMETRO_SEGUNDOS) : 0),
      0
    );
    return bundle.tempoBaseHojeSegundos + extra;
  }, [estado.etapas, bundle]);

  async function aoConcluirAtivacaoCognitiva(formData: FormData) {
    if (!etapaAtual) return;
    const assuntoIds = formData.getAll("assuntoId") as string[];
    enfileirarEEmSincronizar({
      tipo: "concluirAtivacaoCognitiva",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      assuntoIds,
      certas: formData.has("certas") ? Math.max(0, Number(formData.get("certas") ?? 0)) : null,
      erradas: formData.has("erradas") ? Math.max(0, Number(formData.get("erradas") ?? 0)) : null,
      anki: formData.has("anki") ? formData.get("anki") === "on" : null,
    });
  }

  async function aoConcluirEstudo() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({
      tipo: "concluirEstudo",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      assuntoId: estado.assuntoSelecionado?.id ?? null,
    });
  }

  async function aoContinuarEstudoDepois(formData: FormData) {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({
      tipo: "continuarEstudoDepois",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      assuntoId: estado.assuntoSelecionado?.id ?? null,
      progresso: ((formData.get("progresso") as string) ?? "").trim(),
    });
  }

  async function aoConcluirDescanso() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({ tipo: "concluirDescanso", etapaId: etapaAtual.id, sessaoId: bundle.sessaoId });
  }

  async function aoConcluirLeiSeca(formData: FormData) {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({
      tipo: "concluirLeiSeca",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
      assuntoId: etapaAtual.assuntoId,
      usaLeiPrincipal: bundle.leisPrincipais.length > 0,
      progresso: ((formData.get("progresso") as string) ?? "").trim(),
      leiReferencia: ((formData.get("leiReferencia") as string) ?? "").trim(),
      reiniciar: formData.get("reiniciar") === "on",
    });
  }

  async function aoConcluirJurisprudencia(formData: FormData) {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({
      tipo: "concluirJurisprudencia",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
      assuntoId: etapaAtual.assuntoId,
      usaJurisprudenciaPrincipal: bundle.jurisprudenciasPrincipais.length > 0,
      referencia: ((formData.get("referencia") as string) ?? "").trim(),
      progresso: ((formData.get("progresso") as string) ?? "").trim(),
      reiniciar: formData.get("reiniciar") === "on",
    });
  }

  async function aoConcluirConsolidacao() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({ tipo: "concluirConsolidacao", etapaId: etapaAtual.id, sessaoId: bundle.sessaoId });
  }

  async function aoConcluirQuestoes(formData: FormData) {
    if (!etapaAtual) return;
    const erradas = Math.max(0, Number(formData.get("erradas") ?? 0));
    enfileirarEEmSincronizar({
      tipo: "concluirQuestoes",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
      assuntoId: etapaAtual.assuntoId,
      certas: Math.max(0, Number(formData.get("certas") ?? 0)),
      erradas,
      anotacao: erradas > 0 ? ((formData.get("anotacao") as string) ?? "").trim() : "",
    });
  }

  async function aoConcluirRevisaoErros() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({
      tipo: "concluirRevisaoErros",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
    });
  }

  async function aoConcluirQuestoesConsolidacao(formData: FormData) {
    if (!etapaAtual) return;
    const respostas = bundle.assuntosRevisaoGlobal
      .filter((assunto) => assunto.peso !== "baixa")
      .map((assunto) => ({
        assuntoId: assunto.id,
        certas: Math.max(0, Number(formData.get(`certas_${assunto.id}`) ?? 0)),
        erradas: Math.max(0, Number(formData.get(`erradas_${assunto.id}`) ?? 0)),
      }));
    enfileirarEEmSincronizar({
      tipo: "concluirQuestoesConsolidacao",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
      respostas,
      anotacao: ((formData.get("anotacao") as string) ?? "").trim(),
      anki: formData.has("anki") ? formData.get("anki") === "on" : null,
    });
  }

  async function aoConcluirQuestoesValidacao(formData: FormData) {
    if (!etapaAtual) return;
    const respostas = bundle.assuntosRevisaoGlobal.map((assunto) => ({
      assuntoId: assunto.id,
      certas: Math.max(0, Number(formData.get(`certas_${assunto.id}`) ?? 0)),
      erradas: Math.max(0, Number(formData.get(`erradas_${assunto.id}`) ?? 0)),
    }));
    enfileirarEEmSincronizar({
      tipo: "concluirQuestoesValidacao",
      etapaId: etapaAtual.id,
      sessaoId: bundle.sessaoId,
      disciplinaId: bundle.disciplinaId,
      respostas,
      anotacao: ((formData.get("anotacao") as string) ?? "").trim(),
      anki: formData.has("anki") ? formData.get("anki") === "on" : null,
    });
  }

  async function aoPausar() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({ tipo: "pausarEtapa", etapaId: etapaAtual.id });
  }

  async function aoRetomar() {
    if (!etapaAtual) return;
    enfileirarEEmSincronizar({ tipo: "retomarEtapa", etapaId: etapaAtual.id });
  }

  async function aoVoltar() {
    enfileirarEEmSincronizar({ tipo: "voltarEtapa", sessaoId: bundle.sessaoId });
  }

  if (!etapaAtual) {
    // Última etapa (Questões) já foi concluída localmente — mostra na hora,
    // mesmo que ainda não tenha sincronizado (ver decisão de produto: fim
    // de sessão offline não espera a internet voltar pra confirmar).
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">Sessão concluída</h1>
          <p className="mt-2 text-sm text-foreground/60">
            {online
              ? "Registrando..."
              : "Assim que a internet voltar, isso é registrado automaticamente."}
          </p>
        </div>
      </div>
    );
  }

  let conteudo: React.ReactNode = null;

  if (etapaAtual.tipo === "ativacao_cognitiva") {
    const candidatos = bundle.candidatosAtivacao;
    const modo = bundle.ativacaoModo;
    const mostrarQuestoes = modo === "questoes" || modo === "questoes_anki";
    const mostrarAnki = modo === "anki" || modo === "questoes_anki";

    const camposDesempenho = (
      <div className="mt-4 space-y-3">
        {mostrarQuestoes && (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground/50">Questões</span>
              <InfoTip
                texto={`${FILTRO_QUESTOES_TEXTO} Reserve de 15 a 20 minutos pra essa etapa.`}
                id="ativacao-filtro-questoes"
                autoAbrir
              />
            </div>
            <div className="mt-1 flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-foreground/50">Acertos</label>
                <input
                  name="certas"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-foreground/50">Erros</label>
                <input
                  name="erradas"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>
        )}
        {mostrarAnki && (
          <div>
            <label className="flex items-center gap-2 text-sm text-foreground/70">
              <input name="anki" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
              Revisei no Anki hoje
            </label>
            <div className="mt-1 flex items-center gap-1.5 pl-6">
              <InfoTip
                texto={`${ANKI_CADERNO_ERROS_TEXTO} Aqui na Ativação Cognitiva, responda questões e o máximo de flashcards que conseguir dessa disciplina — o ideal é dar conta de todos, mas nem sempre cabe tudo nos 15 a 20 minutos, e tá tudo bem.`}
                id="ativacao-anki"
                autoAbrir
              />
              <span className="text-xs text-foreground/50">Como usar o Anki aqui</span>
            </div>
          </div>
        )}
      </div>
    );

    conteudo =
      candidatos.length > 0 ? (
        <form action={aoConcluirAtivacaoCognitiva}>
          <p className="text-sm text-foreground/70">{ATIVACAO_MODO_LABEL[modo]}</p>
          <ul className="mt-4 space-y-2">
            {candidatos.map((assunto) => (
              <li
                key={assunto.id}
                className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 bg-foreground/3 px-3 py-2 text-sm"
              >
                <span>
                  <input type="hidden" name="assuntoId" value={assunto.id} />
                  {assunto.nome}
                </span>
                {mostrarQuestoes && (
                  <span className="shrink-0 text-xs text-foreground/40">
                    {sugestaoQuestoesPorAssunto(candidatos.length)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {camposDesempenho}
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluí a revisão
          </SubmitButton>
        </form>
      ) : (
        <form action={aoConcluirAtivacaoCognitiva}>
          <p className="text-base font-medium text-foreground">Primeira vez em {bundle.disciplinaNome}.</p>
          <p className="mt-2 text-sm text-foreground/60">
            Ainda não há nada estudado aqui pra revisar — vamos direto pro conteúdo novo.
          </p>
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Começar
          </SubmitButton>
        </form>
      );
  }

  if (etapaAtual.tipo === "estudo") {
    const proximoAssunto = estado.assuntoSelecionado;

    conteudo = proximoAssunto ? (
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-foreground/60">Estude esse assunto no seu material (curso, livro, videoaula):</p>
          <InfoTip
            texto="Grife apenas o essencial, de forma bem pontual. Quando essa matéria voltar pro ciclo e você for revisar, vai reler só os grifos — não o conteúdo inteiro —, o que torna a revisão bem mais rápida. É por isso, inclusive, que vale a pena manter um único material por disciplina do início ao fim: trocar de material no meio quebra essa continuidade. Além dos grifos, você também pode fazer anotações pontuais direto no material, quando achar necessário."
            id="estudo-grifos"
            autoAbrir
          />
        </div>
        <p className="mt-2 text-xl font-semibold text-foreground">{proximoAssunto.nome}</p>
        {proximoAssunto.progressoEstudo && (
          <p className="mt-3 text-sm text-foreground/60">
            Você parou em: <span className="font-medium text-foreground">{proximoAssunto.progressoEstudo}</span>.
            Continue a partir daí.
          </p>
        )}

        <form action={aoConcluirEstudo}>
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Terminei esse assunto
          </SubmitButton>
        </form>

        <div className="mt-3 rounded-md border border-foreground/10 bg-foreground/3 p-3">
          <p className="text-xs text-foreground/60">
            Não deu tempo de terminar {proximoAssunto.nome}? Sem problema — ele continua aqui e volta a
            aparecer no Estudo na próxima vez que {bundle.disciplinaNome} entrar no ciclo.
          </p>
          <form action={aoContinuarEstudoDepois} className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              name="progresso"
              type="text"
              placeholder="Onde você parou (opcional)"
              className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <SubmitButton
              pendingText="Salvando..."
              className="shrink-0 rounded-md px-4 py-2 text-sm font-medium text-foreground/70 ring-1 ring-foreground/20 hover:text-foreground hover:ring-foreground/40"
            >
              Ainda não terminei
            </SubmitButton>
          </form>
        </div>
      </div>
    ) : (
      <form action={aoConcluirEstudo}>
        <p className="text-sm text-foreground/60">
          Você já estudou todos os assuntos cadastrados dessa disciplina — hora de reforçar o
          que já viu.
        </p>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Continuar
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "descanso") {
    conteudo = (
      <form action={aoConcluirDescanso}>
        <p className="text-sm text-foreground/60">
          Levante, beba água, descanse a vista. Volte em alguns minutos pra continuar.
        </p>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Continuar
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "lei_seca") {
    if (bundle.leisPrincipais.length > 0) {
      conteudo = (
        <form action={aoConcluirLeiSeca}>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-foreground/60">Leia:</p>
            <InfoTip texto="Se for grifar, grife só palavras-chave — nada além disso." id="lei-seca-grifo" autoAbrir />
          </div>
          <div className="mt-1 space-y-0.5">
            {bundle.leisPrincipais.map((lei) => (
              <p key={lei} className="text-xl font-semibold text-foreground">
                {lei}
              </p>
            ))}
          </div>

          <p className="mt-3 text-sm text-foreground/60">
            {estado.progressoLeiSecaDisciplina ? (
              <>
                Você parou em:{" "}
                <span className="font-medium text-foreground">{estado.progressoLeiSecaDisciplina}</span>. Continue a
                partir daí.
              </>
            ) : (
              "Primeira leitura — comece do início."
            )}
          </p>

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Até onde você leu agora</label>
            <input
              name="progresso"
              type="text"
              placeholder="Ex: Art. 42"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
            <input name="reiniciar" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
            Terminei de ler tudo — recomeçar do início
          </label>

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    } else {
      const assunto = estado.assuntoSelecionado;

      conteudo = (
        <form action={aoConcluirLeiSeca}>
          {assunto && <p className="text-xl font-semibold text-foreground">{assunto.nome}</p>}
          <div className="mt-1 flex items-center gap-1.5">
            <InfoTip texto="Se for grifar, grife só palavras-chave — nada além disso." id="lei-seca-grifo" autoAbrir />
            <span className="text-xs text-foreground/50">Como grifar a lei</span>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Qual lei</label>
            <input
              name="leiReferencia"
              type="text"
              defaultValue={assunto?.leiReferencia ?? ""}
              placeholder="Ex: Lei nº 8.112/1990"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          {assunto?.progressoLeiSeca && (
            <p className="mt-3 text-sm text-foreground/60">
              Você parou em: <span className="font-medium text-foreground">{assunto.progressoLeiSeca}</span>. Leia a
              partir daí.
            </p>
          )}

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Até onde você leu agora</label>
            <input
              name="progresso"
              type="text"
              placeholder="Ex: Art. 42"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    }
  }

  if (etapaAtual.tipo === "jurisprudencia") {
    if (bundle.jurisprudenciasPrincipais.length > 0) {
      conteudo = (
        <form action={aoConcluirJurisprudencia}>
          <p className="text-sm text-foreground/60">Revise:</p>
          <div className="mt-1 space-y-0.5">
            {bundle.jurisprudenciasPrincipais.map((jurisprudencia) => (
              <p key={jurisprudencia} className="text-xl font-semibold text-foreground">
                {jurisprudencia}
              </p>
            ))}
          </div>

          <p className="mt-3 text-sm text-foreground/60">
            {estado.progressoJurisprudenciaDisciplina ? (
              <>
                Você parou em:{" "}
                <span className="font-medium text-foreground">{estado.progressoJurisprudenciaDisciplina}</span>.
                Continue a partir daí.
              </>
            ) : (
              "Primeira revisão — comece do início."
            )}
          </p>

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Até onde você revisou agora</label>
            <input
              name="progresso"
              type="text"
              placeholder="Ex: Súmulas do STJ até 2023"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
            <input name="reiniciar" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
            Terminei de revisar tudo — recomeçar do início
          </label>

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    } else {
      const assunto = estado.assuntoSelecionado;

      conteudo = (
        <form action={aoConcluirJurisprudencia}>
          {assunto && <p className="text-xl font-semibold text-foreground">{assunto.nome}</p>}

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Qual jurisprudência/tema</label>
            <input
              name="referencia"
              type="text"
              defaultValue={assunto?.jurisprudenciaReferencia ?? ""}
              placeholder="Ex: STF, controle de constitucionalidade"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          {assunto?.progressoJurisprudencia && (
            <p className="mt-3 text-sm text-foreground/60">
              Você parou em:{" "}
              <span className="font-medium text-foreground">{assunto.progressoJurisprudencia}</span>. Continue a
              partir daí.
            </p>
          )}

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Até onde você revisou agora</label>
            <input
              name="progresso"
              type="text"
              placeholder="Ex: Súmulas do STJ até 2023"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    }
  }

  if (etapaAtual.tipo === "exercicios" || etapaAtual.tipo === "laboratorio") {
    const assunto = estado.assuntoSelecionado;

    conteudo = (
      <form action={aoConcluirConsolidacao}>
        <p className="text-sm text-foreground/60">{CONSOLIDACAO_INSTRUCAO[etapaAtual.tipo]}</p>
        {assunto && <p className="mt-2 text-xl font-semibold text-foreground">{assunto.nome}</p>}
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "revisao_erros") {
    const erros = bundle.errosPendentesConsolidacao;

    conteudo = (
      <form action={aoConcluirRevisaoErros}>
        {erros.length > 0 ? (
          <>
            <p className="text-sm text-foreground/60">Erros pendentes de revisão nessa disciplina:</p>
            <ul className="mt-4 space-y-2">
              {erros.map((erro) => (
                <li
                  key={erro.assuntoId ?? "sem-assunto"}
                  className="rounded-md border border-foreground/10 bg-foreground/3 px-3 py-2 text-sm"
                >
                  <p className="text-foreground">
                    {erro.assuntoNome ?? "Sem assunto"} · {erro.quantidade}{" "}
                    {erro.quantidade === 1 ? "erro" : "erros"}
                  </p>
                  {erro.anotacao && <p className="mt-1 text-xs text-foreground/60">{erro.anotacao}</p>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-foreground/60">Nenhum erro pendente — bom trabalho.</p>
        )}
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "questoes" && (bundle.sessaoTipo === "consolidacao" || bundle.sessaoTipo === "validacao")) {
    const ehValidacao = bundle.sessaoTipo === "validacao";
    const assuntos = bundle.assuntosRevisaoGlobal;
    const comInput = ehValidacao ? assuntos : assuntos.filter((a) => a.peso === "alta" || a.peso === "media");
    const somenteLeitura = ehValidacao ? [] : assuntos.filter((a) => a.peso === "baixa");
    const mostrarAnki = bundle.ativacaoModo === "anki" || bundle.ativacaoModo === "questoes_anki";

    conteudo = (
      <form action={ehValidacao ? aoConcluirQuestoesValidacao : aoConcluirQuestoesConsolidacao}>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-foreground/60">
            {ehValidacao
              ? "Simulado da disciplina — resolva questões cobrindo todos os assuntos e registre o resultado:"
              : "Revisão global da disciplina — resolva questões e registre o resultado por assunto:"}
          </p>
          <InfoTip texto={FILTRO_QUESTOES_TEXTO} id="questoes-filtro-revisao" autoAbrir />
        </div>

        {bundle.leisPrincipais.length > 0 && (
          <div className="mt-4 rounded-md border border-foreground/10 bg-foreground/3 p-3">
            <p className="text-xs text-foreground/50">Lei{bundle.leisPrincipais.length > 1 ? "s" : ""}</p>
            <div className="space-y-0.5">
              {bundle.leisPrincipais.map((lei) => (
                <p key={lei} className="text-sm font-medium text-foreground">
                  {lei}
                </p>
              ))}
            </div>
            {bundle.progressoLeiSecaDisciplina && (
              <p className="mt-1 text-xs text-foreground/60">
                Você parou em: {bundle.progressoLeiSecaDisciplina}
              </p>
            )}
          </div>
        )}

        {bundle.jurisprudenciasPrincipais.length > 0 && (
          <div className="mt-4 rounded-md border border-foreground/10 bg-foreground/3 p-3">
            <p className="text-xs text-foreground/50">
              Jurisprudência{bundle.jurisprudenciasPrincipais.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-0.5">
              {bundle.jurisprudenciasPrincipais.map((jurisprudencia) => (
                <p key={jurisprudencia} className="text-sm font-medium text-foreground">
                  {jurisprudencia}
                </p>
              ))}
            </div>
            {bundle.progressoJurisprudenciaDisciplina && (
              <p className="mt-1 text-xs text-foreground/60">
                Você parou em: {bundle.progressoJurisprudenciaDisciplina}
              </p>
            )}
          </div>
        )}

        {comInput.length > 0 ? (
          <div className="mt-4 space-y-4">
            {comInput.map((assunto) => (
              <div key={assunto.id} className="rounded-md border border-foreground/10 bg-foreground/3 p-3">
                <p className="text-sm font-medium text-foreground">
                  {assunto.nome}
                  {ehValidacao && assunto.pesoPercentual != null && (
                    <span className="ml-2 text-xs font-normal text-foreground/50">
                      {assunto.pesoPercentual}% sugerido
                    </span>
                  )}
                </p>
                {bundle.leisPrincipais.length === 0 && assunto.leiReferencia && (
                  <p className="mt-1 text-xs text-foreground/60">Lei: {assunto.leiReferencia}</p>
                )}
                {bundle.leisPrincipais.length === 0 && assunto.progressoLeiSeca && (
                  <p className="mt-1 text-xs text-foreground/60">
                    Você parou em: <span className="text-foreground/80">{assunto.progressoLeiSeca}</span>
                  </p>
                )}
                {bundle.jurisprudenciasPrincipais.length === 0 && assunto.jurisprudenciaReferencia && (
                  <p className="mt-1 text-xs text-foreground/60">
                    Jurisprudência: {assunto.jurisprudenciaReferencia}
                  </p>
                )}
                {bundle.jurisprudenciasPrincipais.length === 0 && assunto.progressoJurisprudencia && (
                  <p className="mt-1 text-xs text-foreground/60">
                    Você parou em: <span className="text-foreground/80">{assunto.progressoJurisprudencia}</span>
                  </p>
                )}
                <input type="hidden" name="assuntoId" value={assunto.id} />
                <div className="mt-2 flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-foreground/50">Acertos</label>
                    <input
                      name={`certas_${assunto.id}`}
                      type="number"
                      min={0}
                      defaultValue={0}
                      className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-foreground/50">Erros</label>
                    <input
                      name={`erradas_${assunto.id}`}
                      type="number"
                      min={0}
                      defaultValue={0}
                      className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-foreground/60">
            Nenhum assunto pra revisar nessa disciplina ainda.
          </p>
        )}

        {somenteLeitura.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-foreground/50">Também vale revisar quando puder:</p>
            <ul className="mt-2 space-y-1">
              {somenteLeitura.map((assunto) => (
                <li key={assunto.id} className="text-sm text-foreground/60">
                  {assunto.nome}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Se errou algo, o que vale revisar depois</label>
          <textarea
            name="anotacao"
            rows={5}
            placeholder="Ex: confundi prazo de recurso com o de prescrição"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        {mostrarAnki && (
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
            <input name="anki" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
            Revisei no Anki hoje
          </label>
        )}

        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir sessão
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "questoes" && bundle.sessaoTipo === "normal") {
    const assunto = estado.assuntoSelecionado;
    const mostrarAnkiCadernoErros =
      bundle.ativacaoModo === "anki" || bundle.ativacaoModo === "questoes_anki";

    conteudo = (
      <form action={aoConcluirQuestoes}>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-foreground/60">
            Resolva questões {assunto ? "sobre" : "dessa disciplina"}{" "}
            {assunto && <span className="font-medium text-foreground">{assunto.nome}</span>} no seu material e
            registre o resultado:
          </p>
          <InfoTip
            texto={`${FILTRO_QUESTOES_TEXTO} Reserve cerca de 20 minutos pra essa etapa. Sugestão de quantidade: no mínimo 15 questões — o ideal é passar de 20.`}
            id="questoes-filtro"
            autoAbrir
          />
        </div>
        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-foreground/50">Acertos</label>
            <input
              name="certas"
              type="number"
              min={0}
              defaultValue={0}
              required
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-foreground/50">Erros</label>
            <input
              name="erradas"
              type="number"
              min={0}
              defaultValue={0}
              required
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-1.5">
            <label className="block text-xs text-foreground/50">Se errou algo, o que vale revisar depois</label>
            {mostrarAnkiCadernoErros && (
              <InfoTip texto={ANKI_CADERNO_ERROS_TEXTO} id="questoes-anki-caderno" autoAbrir />
            )}
          </div>
          <textarea
            name="anotacao"
            rows={5}
            placeholder="Ex: confundi prazo de recurso com o de prescrição"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir sessão
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-3 h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-gold transition-all"
            style={{ width: `${((etapaIndex + 1) / estado.etapas.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3">
          <TempoAcumulado
            label="Tempo estudado hoje"
            baseSegundos={tempoBaseHojeSegundos}
            etapaAtualAcumulado={acumuladoEtapaAtual}
            iniciadaEmAtual={etapaAtual.iniciadaEm}
          />
          <TempoAcumulado
            label="Nesta sessão"
            baseSegundos={tempoBaseSessaoSegundos}
            etapaAtualAcumulado={acumuladoEtapaAtual}
            iniciadaEmAtual={etapaAtual.iniciadaEm}
          />
          {!online && <span className="text-xs text-foreground/40">sem conexão · salvando neste aparelho</span>}
          {online && estado.fila.length > 0 && <span className="text-xs text-foreground/40">sincronizando...</span>}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{bundle.disciplinaNome}</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">
              {etapaAtual.tipo === "questoes" && bundle.sessaoTipo === "consolidacao"
                ? "Revisão e Questões"
                : etapaAtual.tipo === "questoes" && bundle.sessaoTipo === "validacao"
                  ? "Simulado da Disciplina"
                  : (ETAPA_LABELS[etapaAtual.tipo] ?? etapaAtual.tipo)}
            </h1>
            <p className="mt-1 text-xs text-foreground/40">
              etapa {etapaIndex + 1} de {estado.etapas.length}
            </p>
            {etapaIndex > 0 && (
              <form action={aoVoltar} className="mt-1">
                <SubmitButton
                  pendingText="Voltando..."
                  className="text-xs text-foreground/40 underline underline-offset-4 hover:text-foreground"
                >
                  ← Voltar etapa anterior
                </SubmitButton>
              </form>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Cronometro
              tempoAcumuladoSegundos={acumuladoEtapaAtual}
              iniciadaEm={etapaAtual.iniciadaEm}
              sugeridoMinutos={
                etapaAtual.minutosAjustados ??
                (etapaAtual.tipo === "questoes" &&
                (bundle.sessaoTipo === "consolidacao" || bundle.sessaoTipo === "validacao")
                  ? Math.round(30 * bundle.ajusteTempo)
                  : MINUTOS_SUGERIDOS[etapaAtual.tipo] !== undefined
                    ? Math.round(MINUTOS_SUGERIDOS[etapaAtual.tipo] * bundle.ajusteTempo)
                    : undefined)
              }
              sugeridoLabel={
                bundle.ajusteTempo === 1 && etapaAtual.minutosAjustados === null
                  ? SUGERIDO_LABEL[etapaAtual.tipo]
                  : undefined
              }
            />
            {etapaAtual.iniciadaEm ? (
              <form action={aoPausar}>
                <SubmitButton
                  pendingText="Pausando..."
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="3" y="2" width="3" height="10" />
                    <rect x="8" y="2" width="3" height="10" />
                  </svg>
                  Pausar
                </SubmitButton>
              </form>
            ) : (
              <form action={aoRetomar}>
                <SubmitButton
                  pendingText="Retomando..."
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-gold/10 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-gold/40 hover:bg-gold/20"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M3 2 L12 7 L3 12 Z" />
                  </svg>
                  Continuar de onde parei
                </SubmitButton>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6">{conteudo}</div>
      </div>
    </div>
  );
}
