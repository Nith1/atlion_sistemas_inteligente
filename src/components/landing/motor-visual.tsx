"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Fase = "nucleo" | "chegando" | "processando" | "convergindo" | "sessao" | "pausa";

const DURACOES: Record<Fase, number> = {
  nucleo: 1500,
  chegando: 4000,
  processando: 2000,
  convergindo: 2000,
  sessao: 2000,
  pausa: 500,
};

const PROXIMA_FASE: Record<Fase, Fase> = {
  nucleo: "chegando",
  chegando: "processando",
  processando: "convergindo",
  convergindo: "sessao",
  sessao: "pausa",
  pausa: "nucleo",
};

const NOS = ["Desempenho", "Questões", "Revisões", "Tempo sem revisar", "Memória", "Evolução"];

const TEXTOS_PROCESSANDO = ["Analisando...", "Calculando prioridades...", "Recalculando preparação..."];

const PIPELINE = [
  { nome: "Ativação Cognitiva", tempo: "25 min" },
  { nome: "Direito Constitucional", tempo: "20 min" },
  { nome: "Questões", tempo: "15 min" },
];

const RAIO = 34; // % do container
const INTERVALO_NO = 0.6; // segundos entre a chegada de cada dado

function posicaoNo(indice: number) {
  // começa em -60° (não -90°) pra nenhum dado ficar exatamente acima/abaixo
  // do núcleo, deixando o eixo vertical livre pro rótulo de status.
  const anguloGraus = -60 + indice * 60;
  const anguloRad = (anguloGraus * Math.PI) / 180;
  return {
    top: `${50 + RAIO * Math.sin(anguloRad)}%`,
    left: `${50 + RAIO * Math.cos(anguloRad)}%`,
    angulo: anguloGraus,
  };
}

export function MotorVisual() {
  const [fase, setFase] = useState<Fase>("nucleo");
  const [textoIndex, setTextoIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setFase((f) => PROXIMA_FASE[f]), DURACOES[fase]);
    return () => clearTimeout(id);
  }, [fase]);

  useEffect(() => {
    if (fase !== "processando") {
      // reinicia o texto pro início do ciclo seguinte — sem isso, a segunda
      // vez que a fase "processando" aparece começaria do meio da lista de
      // textos, em vez de "Analisando..." de novo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTextoIndex(0);
      return;
    }
    const id = setInterval(() => setTextoIndex((v) => Math.min(v + 1, TEXTOS_PROCESSANDO.length - 1)), 650);
    return () => clearInterval(id);
  }, [fase]);

  const nosVisiveis = fase === "chegando" || fase === "processando";
  const processando = fase === "processando";
  const pronto = fase === "convergindo" || fase === "sessao" || fase === "pausa";
  const mostrarCard = fase === "sessao" || fase === "pausa";
  const nucleoGrande = fase === "convergindo" || fase === "sessao" || fase === "pausa";

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-10 sm:flex-row sm:items-center sm:justify-center">
      <div className="flex shrink-0 flex-col items-center">
      <div className="relative aspect-square w-72 sm:w-75">
        {/* linhas conectando cada dado ao núcleo */}
        <AnimatePresence>
          {nosVisiveis &&
            NOS.map((_, i) => {
              const { angulo } = posicaoNo(i);
              return (
                <motion.div
                  key={`linha-${i}`}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: `${RAIO}%`, opacity: 0.5 }}
                  exit={{ width: 0, opacity: 0, transition: { duration: 0.5 } }}
                  transition={{ delay: i * INTERVALO_NO + 0.15, duration: 0.5, ease: "easeOut" }}
                  className="absolute top-1/2 left-1/2 h-px origin-left bg-gradient-to-r from-[#C8A15A]/70 to-[#C8A15A]/0"
                  style={{ rotate: `${angulo}deg` }}
                />
              );
            })}
        </AnimatePresence>

        {/* núcleo */}
        <motion.div
          animate={{
            scale: nucleoGrande ? [1.12, 1.16, 1.12] : [1, 1.06, 1],
            boxShadow: processando
              ? "0 0 50px 6px rgba(200,161,90,0.45)"
              : "0 0 34px 2px rgba(200,161,90,0.28)",
          }}
          transition={{
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 0.8 },
          }}
          className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C8A15A]"
        />

        {/* dados orbitando */}
        <AnimatePresence>
          {nosVisiveis &&
            NOS.map((nome, i) => {
              const { top, left } = posicaoNo(i);
              return (
                <motion.span
                  key={nome}
                  initial={{ opacity: 0, filter: "blur(6px)", scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    filter: "blur(0px)",
                    scale: 1,
                    borderColor: "rgba(200,161,90,0.4)",
                  }}
                  exit={{ opacity: 0, filter: "blur(4px)", scale: 0.8, transition: { duration: 0.4 } }}
                  transition={{
                    opacity: { delay: i * INTERVALO_NO, duration: 0.5 },
                    filter: { delay: i * INTERVALO_NO, duration: 0.5 },
                    scale: { delay: i * INTERVALO_NO, duration: 0.5 },
                    borderColor: { delay: i * INTERVALO_NO + 0.5, duration: 0.4 },
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#111D2D] px-2.5 py-1 text-[11px] text-[#F5F3EF] sm:px-3 sm:py-1.5 sm:text-xs"
                  style={{ top, left }}
                >
                  {nome}
                </motion.span>
              );
            })}
        </AnimatePresence>

      </div>

        {/* texto de status abaixo do núcleo */}
        <div className="mt-6 w-max max-w-[220px] text-center">
          <AnimatePresence mode="wait">
            {pronto ? (
              <motion.p
                key="pronto"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: fase === "convergindo" ? 0.9 : 0, duration: 0.5, type: "spring" }}
                className="flex items-center justify-center gap-2 text-xs font-medium text-[#F5F3EF]"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: fase === "convergindo" ? 0.9 : 0, type: "spring", stiffness: 300, damping: 14 }}
                  className="text-[#C8A15A]"
                >
                  ✓
                </motion.span>
                Próxima sessão pronta.
              </motion.p>
            ) : processando ? (
              <motion.p
                key={`proc-${textoIndex}`}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
                className="text-xs font-medium uppercase tracking-widest text-[#C8A15A]"
              >
                {TEXTOS_PROCESSANDO[textoIndex]}
              </motion.p>
            ) : (
              <motion.p
                key="label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium uppercase tracking-widest text-[#AAB4C3]/70"
              >
                Motor de Aprendizagem
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {mostrarCard && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.97 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-[220px] rounded-2xl border border-white/6 bg-[#111D2D] p-5 shadow-[0_0_70px_-25px_rgba(200,161,90,0.25)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C8A15A]">Próxima sessão</p>
            <div className="mt-3 space-y-2">
              {PIPELINE.map((etapa) => (
                <div key={etapa.nome} className="rounded-md border border-white/10 bg-white/3 px-3 py-2">
                  <p className="text-xs font-medium text-[#F5F3EF]">{etapa.nome}</p>
                  <p className="text-[10px] text-[#AAB4C3]">{etapa.tempo}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
