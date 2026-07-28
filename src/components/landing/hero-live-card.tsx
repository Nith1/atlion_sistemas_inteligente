"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Fase = "parado" | "notificando" | "recalculando" | "pronto";

const DURACOES: Record<Fase, number> = {
  parado: 2200,
  notificando: 1300,
  recalculando: 1800,
  pronto: 3200,
};

const PROXIMA_FASE: Record<Fase, Fase> = {
  parado: "notificando",
  notificando: "recalculando",
  recalculando: "pronto",
  pronto: "parado",
};

const PIPELINE = [
  { nome: "Ativação Cognitiva", tempo: "30 minutos" },
  { nome: "Direito Constitucional", tempo: "20 minutos" },
  { nome: "Questões", tempo: "15 minutos" },
];

function Pontinhos() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-[#C8A15A]"
          style={{ animation: "dotPulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

export function HeroLiveCard() {
  const [saudacao, setSaudacao] = useState("Olá");
  const [fase, setFase] = useState<Fase>("parado");

  useEffect(() => {
    // A hora de "agora" só pode ser lida depois de montar no client — se
    // calculada direto no render, o horário do servidor (onde a página foi
    // renderizada) pode divergir do horário do visitante e quebrar a
    // hidratação.
    const hora = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setFase((f) => PROXIMA_FASE[f]), DURACOES[fase]);
    return () => clearTimeout(id);
  }, [fase]);

  const pronto = fase === "pronto";
  const recalculando = fase === "recalculando";

  return (
    <div className="relative w-full max-w-lg">
      <AnimatePresence>
        {fase === "notificando" && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="absolute -top-3 right-4 z-10 whitespace-nowrap rounded-full border border-white/10 bg-[#1a2a3f] px-3 py-1.5 text-xs text-[#F5F3EF] shadow-lg"
          >
            2 questões erradas detectadas
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-white/6 bg-[#111D2D]/90 p-6 text-left shadow-[0_0_100px_-25px_rgba(200,161,90,0.2)] backdrop-blur-xl sm:p-9">
        <p className="text-sm text-[#AAB4C3]">{saudacao}.</p>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {recalculando ? (
              <motion.p
                key="recalculando"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#C8A15A]"
              >
                Motor de Aprendizagem recalculando
                <Pontinhos />
              </motion.p>
            ) : pronto ? (
              <motion.p
                key="pronto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#C8A15A]"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                >
                  ✓
                </motion.span>
                Sessão otimizada.
              </motion.p>
            ) : (
              <motion.p
                key="padrao"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium uppercase tracking-widest text-[#AAB4C3]/70"
              >
                Sua próxima ação
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {pronto ? (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="mt-3 space-y-2"
            >
              {PIPELINE.map((etapa) => (
                <div
                  key={etapa.nome}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/3 px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-[#F5F3EF]">{etapa.nome}</span>
                  <span className="shrink-0 text-xs text-[#AAB4C3]">{etapa.tempo}</span>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="unico"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <p className="mt-2 text-xl font-semibold text-[#F5F3EF] sm:text-3xl">Direito Constitucional</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#AAB4C3]">
                <span>Ativação Cognitiva</span>
                <span className="h-1 w-1 rounded-full bg-[#AAB4C3]/40" />
                <span>25 minutos</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            boxShadow: pronto
              ? "0 0 0 3px rgba(200,161,90,0.25), 0 0 28px rgba(200,161,90,0.35)"
              : "0 0 0 0px rgba(200,161,90,0)",
          }}
          transition={{ duration: 0.6 }}
          className="mt-7 rounded-md bg-[#C8A15A] py-2.5 text-center text-sm font-semibold text-[#08111D] sm:py-3"
        >
          Começar sessão
        </motion.div>
      </div>
    </div>
  );
}
