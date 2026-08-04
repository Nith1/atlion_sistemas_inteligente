"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useInfoTipContext } from "./info-tip-provider";

const CHAVE_VISTO = (id: string) => `atlion-infotip-visto-${id}`;
const LARGURA_TOOLTIP = 224; // igual ao w-56 usado abaixo
const MARGEM_TELA = 16;
const GAP_BOTAO = 8;

// Tooltip próprio em vez do atributo `title` nativo — `title` só aparece no
// hover do mouse e não funciona em telas de toque (mobile/tablet), onde não
// existe "passar por cima". Aqui funciona por toque/clique nos dois casos.
//
// `id` + `autoAbrir`: pra orientações importantes demais pra depender da
// pessoa notar a bolinha "?" sozinha (ex: metodologia da sessão de estudo)
// — abre sozinho na primeira vez que aparece pra esse navegador, e nunca
// mais depois disso (guardado no localStorage, não precisa de tabela nova).
// Continua funcionando por clique normalmente em qualquer caso.
//
// Coordenação: se estiver dentro de um InfoTipProvider (ver
// info-tip-provider.tsx), nunca mais de um InfoTip fica aberto ao mesmo
// tempo em toda a árvore — evita dois balões se sobrepondo quando há mais
// de um `autoAbrir` na mesma tela (ex: Ativação Cognitiva).
export function InfoTip({ texto, id, autoAbrir }: { texto: string; id?: string; autoAbrir?: boolean }) {
  const meuId = useId();
  const chave = id ?? meuId;

  const contexto = useInfoTipContext();
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = contexto ? contexto.idAberto === chave : abertoLocal;

  // null = ainda não medido nessa abertura — fica invisível até calcular,
  // pra nunca piscar na posição errada (ver useLayoutEffect abaixo).
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  function definirAberto(valor: boolean) {
    if (!valor) setPosicao(null);
    if (contexto) contexto.setIdAberto(valor ? chave : null);
    else setAbertoLocal(valor);
  }

  useLayoutEffect(() => {
    if (!autoAbrir || !id) return;
    // Dentro de um InfoTipProvider, quem decide a ordem/momento de abrir é o
    // provider (evita a corrida quando há mais de um autoAbrir na mesma
    // tela — ver info-tip-provider.tsx). Sem provider, autoabre direto.
    if (contexto) {
      contexto.registrarAutoAbrir(id);
      return;
    }
    if (window.localStorage.getItem(CHAVE_VISTO(id))) return;
    window.localStorage.setItem(CHAVE_VISTO(id), "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbertoLocal(true);
  }, [autoAbrir, id, contexto]);

  // Posiciona com coordenadas de tela (position: fixed), calculadas na mão,
  // em vez de "centralizado por CSS" — perto de qualquer borda isso estoura
  // o viewport, muito comum no mobile. Usa a altura REAL do balão já
  // renderizado (tooltipRef), não uma estimativa: um texto longo (ex: etapa
  // de Estudo) fica bem mais alto que um curto, e uma estimativa fixa erra
  // a decisão de abrir pra cima ou pra baixo exatamente nesses casos.
  useLayoutEffect(() => {
    if (!aberto || !containerRef.current || !tooltipRef.current) return;

    const rectBotao = containerRef.current.getBoundingClientRect();
    const alturaTooltip = tooltipRef.current.getBoundingClientRect().height;

    // clientWidth (não innerWidth) — innerWidth inclui o espaço da barra de
    // rolagem vertical, então usar ele deixa "sobrar" exatamente essa
    // largura de barra pra fora da área visível de verdade.
    const larguraVisivel = document.documentElement.clientWidth;

    const centroBotao = rectBotao.left + rectBotao.width / 2;
    const left = Math.min(
      Math.max(centroBotao - LARGURA_TOOLTIP / 2, MARGEM_TELA),
      larguraVisivel - LARGURA_TOOLTIP - MARGEM_TELA
    );

    const cabeAcima = rectBotao.top - alturaTooltip - GAP_BOTAO - MARGEM_TELA > 0;
    const top = cabeAcima ? rectBotao.top - alturaTooltip - GAP_BOTAO : rectBotao.bottom + GAP_BOTAO;

    setPosicao({ top, left });
  }, [aberto, texto]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          definirAberto(!aberto);
        }}
        onBlur={() => definirAberto(false)}
        aria-label="Mais informações"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-foreground/30 text-[10px] leading-none text-foreground/50 hover:border-foreground/50 hover:text-foreground"
      >
        ?
      </button>
      {aberto && (
        <span
          ref={tooltipRef}
          role="tooltip"
          style={
            posicao
              ? { position: "fixed", top: posicao.top, left: posicao.left }
              : { position: "fixed", top: 0, left: 0, visibility: "hidden" }
          }
          className="z-50 w-56 rounded-md border border-foreground/15 bg-background px-3 py-2 text-xs font-normal normal-case leading-relaxed text-foreground shadow-lg"
        >
          {texto}
        </span>
      )}
    </span>
  );
}
