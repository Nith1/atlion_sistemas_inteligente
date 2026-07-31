"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Fase = "vazio" | "surgindo" | "flutuando" | "congelado" | "dissolvendo" | "card";

const DURACOES: Record<Fase, number> = {
  vazio: 1000,
  surgindo: 1600,
  flutuando: 1800,
  congelado: 700,
  dissolvendo: 900,
  card: 3200,
};

const PROXIMA_FASE: Record<Fase, Fase> = {
  vazio: "surgindo",
  surgindo: "flutuando",
  flutuando: "congelado",
  congelado: "dissolvendo",
  dissolvendo: "card",
  card: "vazio",
};

const CHIPS_VISIVEIS: Fase[] = ["surgindo", "flutuando", "congelado", "dissolvendo"];

const DECISOES = [
  { texto: "Qual matéria estudar?", top: "4%", left: "4%", rotate: -6 },
  { texto: "O que já esqueci?", top: "2%", left: "55%", rotate: 2 },
  { texto: "Revisar ou aprender algo novo?", top: "18%", left: "2%", rotate: 3 },
  { texto: "Quanto tempo dedicar?", top: "36%", left: "40%", rotate: 4 },
  { texto: "Anki ou questões?", top: "50%", left: "48%", rotate: -3 },
  { texto: "Lei seca ou jurisprudência?", top: "64%", left: "4%", rotate: 5 },
  { texto: "Por onde recomeçar?", top: "78%", left: "38%", rotate: -4 },
];

export function DorVisual() {
  const [fase, setFase] = useState<Fase>("vazio");

  useEffect(() => {
    // roda o ciclo uma vez só e assenta em "card" (a decisão resolvida) —
    // sem isso o loop infinito fica competindo com a leitura do texto ao lado.
    if (fase === "card") return;
    const id = setTimeout(() => setFase((f) => PROXIMA_FASE[f]), DURACOES[fase]);
    return () => clearTimeout(id);
  }, [fase]);

  const chipsVisiveis = CHIPS_VISIVEIS.includes(fase);
  const flutuando = fase === "flutuando";

  return (
    <div className="relative h-[380px] w-full max-w-md overflow-hidden sm:h-[420px]">
      <AnimatePresence>
        {chipsVisiveis &&
          DECISOES.map((chip, i) => (
            <motion.span
              key={chip.texto}
              initial={{ opacity: 0, filter: "blur(6px)", y: 14, scale: 0.9, rotate: chip.rotate }}
              animate={
                flutuando
                  ? {
                      opacity: [1, 0.72, 1],
                      filter: ["blur(0px)", "blur(1.5px)", "blur(0px)"],
                      y: [0, -6, 0],
                      scale: 1,
                      rotate: chip.rotate,
                      transition: { duration: 2.4 + i * 0.22, repeat: Infinity, ease: "easeInOut" },
                    }
                  : {
                      opacity: 1,
                      filter: "blur(0px)",
                      y: 0,
                      scale: 1,
                      rotate: chip.rotate,
                      transition: { duration: 0.7, delay: i * 0.12 },
                    }
              }
              exit={{
                opacity: 0,
                filter: "blur(5px)",
                scale: 0.92,
                transition: { duration: 0.45, delay: i * 0.07 },
              }}
              className="absolute whitespace-nowrap rounded-full border border-white/10 px-4 py-2 text-sm text-[#AAB4C3]/70"
              style={{ top: chip.top, left: chip.left }}
            >
              {chip.texto}
            </motion.span>
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {fase === "card" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="rounded-2xl border border-white/6 bg-[#111D2D] px-8 py-7 text-center shadow-[0_0_90px_-20px_rgba(200,161,90,0.22)]">
              <p className="text-xs uppercase tracking-widest text-[#AAB4C3]/70">Sua próxima ação</p>
              <p className="mt-2 text-xl font-semibold text-[#F5F3EF]">Direito Administrativo</p>
              <motion.div
                animate={{ boxShadow: "0 0 0 3px rgba(200,161,90,0.2), 0 0 22px rgba(200,161,90,0.3)" }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-4 rounded-md bg-[#C8A15A] px-6 py-2 text-sm font-semibold text-[#08111D]"
              >
                Começar sessão
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
