"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PASSOS = [
  { atraso: 800, texto: "Concurso identificado" },
  { atraso: 1600, texto: "Organizando disciplinas" },
  { atraso: 2400, texto: "Calculando rotina diária" },
  { atraso: 3200, texto: "Configurando Ativação Cognitiva" },
  { atraso: 4000, texto: "Gerando primeira sessão" },
];

const ATRASO_CONVERGENCIA = 4800;

// Etapa final do onboarding: não é formulário, é só a sensação de que o
// motor está trabalhando — mesma linguagem visual da landing (núcleo
// respirando + checklist), só que em sequência única, não em loop.
export function Preparando() {
  const [passosVisiveis, setPassosVisiveis] = useState(0);
  const [convergiu, setConvergiu] = useState(false);

  useEffect(() => {
    const timers = PASSOS.map((passo, i) =>
      setTimeout(() => setPassosVisiveis((v) => Math.max(v, i + 1)), passo.atraso)
    );
    const timerConvergencia = setTimeout(() => setConvergiu(true), ATRASO_CONVERGENCIA);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(timerConvergencia);
    };
  }, []);

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <motion.div
        animate={{ scale: convergiu ? [1.14, 1.18, 1.14] : [1, 1.06, 1] }}
        transition={{ duration: convergiu ? 2.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "0 0 40px 4px rgba(201,162,39,0.32)" }}
        className="h-16 w-16 shrink-0 rounded-full bg-gold"
      />

      <div className="mt-8 w-full max-w-xs">
        <AnimatePresence mode="wait">
          {!convergiu ? (
            <motion.div key="passos" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <h1 className="text-lg font-semibold text-foreground">Preparando sua metodologia...</h1>
              <p className="mt-1 text-sm text-foreground/50">Estamos organizando sua preparação.</p>

              <ul className="mt-6 space-y-2 text-left">
                {PASSOS.slice(0, passosVisiveis).map((passo) => (
                  <motion.li
                    key={passo.texto}
                    initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 text-sm text-foreground/70"
                  >
                    <span className="text-gold">✓</span>
                    {passo.texto}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="pronto"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col items-center gap-2"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 14 }}
                className="text-3xl text-gold"
              >
                ✓
              </motion.span>
              <p className="text-base font-medium text-foreground">Preparação criada com sucesso.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
