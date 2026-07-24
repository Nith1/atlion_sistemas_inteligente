"use client";

import { useState } from "react";

type Etapa = { nome: string; tempo?: string };

type Cenario = {
  id: string;
  botao: string;
  mensagem: string;
  pipeline: Etapa[];
};

const CENARIOS: Cenario[] = [
  {
    id: "padrao",
    botao: "Tudo em dia",
    mensagem: "Nenhum sinal de dificuldade. A ATLION segue pro próximo conteúdo.",
    pipeline: [
      { nome: "Estudo", tempo: "50 min" },
      { nome: "Questões", tempo: "20 min" },
    ],
  },
  {
    id: "errou",
    botao: "Errei uma questão",
    mensagem: "O motor detectou dificuldade. Sua próxima sessão foi recalculada.",
    pipeline: [
      { nome: "Ativação Cognitiva", tempo: "15 min" },
      { nome: "Estudo", tempo: "20 min" },
      { nome: "Questões", tempo: "10 min" },
    ],
  },
  {
    id: "sumiu",
    botao: "Fiquei dias sem estudar",
    mensagem: "Você ficou alguns dias sem estudar. A preparação foi recalculada automaticamente.",
    pipeline: [
      { nome: "Ativação Cognitiva", tempo: "25 min" },
      { nome: "Revisão" },
      { nome: "Conteúdo novo" },
    ],
  },
  {
    id: "terminou",
    botao: "Terminei uma disciplina",
    mensagem: "Essa disciplina deu lugar a outra que estava esperando há mais tempo.",
    pipeline: [
      { nome: "Direito Administrativo" },
      { nome: "Ativação Cognitiva", tempo: "15 min" },
      { nome: "Estudo", tempo: "40 min" },
    ],
  },
];

export function Simulador() {
  const [ativoId, setAtivoId] = useState(CENARIOS[0].id);
  const cenario = CENARIOS.find((c) => c.id === ativoId) ?? CENARIOS[0];

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {CENARIOS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAtivoId(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              ativoId === c.id
                ? "bg-[#C8A15A] text-[#08111D]"
                : "border border-white/10 text-[#AAB4C3] hover:border-white/30 hover:text-[#F5F3EF]"
            }`}
          >
            {c.botao}
          </button>
        ))}
      </div>

      <div
        key={cenario.id}
        className="mt-8 rounded-2xl border border-white/6 bg-[#111D2D] p-8 [animation:simulatorSwap_0.4s_ease-out] sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8A15A]">Próxima sessão</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {cenario.pipeline.map((etapa, i) => (
            <div key={etapa.nome} className="flex items-center gap-3">
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#F5F3EF]">
                {etapa.nome}
                {etapa.tempo ? ` · ${etapa.tempo}` : ""}
              </span>
              {i < cenario.pipeline.length - 1 && <span className="text-[#AAB4C3]/40">→</span>}
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-[#AAB4C3]">{cenario.mensagem}</p>
      </div>
    </div>
  );
}
