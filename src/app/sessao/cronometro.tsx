"use client";

import { useEffect, useState } from "react";

function formatarTempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function segundosDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

// Cronômetro da etapa atual — conta sozinho a partir de quando a etapa
// começou (guardado no banco), sem precisar o usuário apertar play.
export function Cronometro({
  iniciadaEm,
  sugeridoMinutos,
}: {
  iniciadaEm: string;
  sugeridoMinutos?: number;
}) {
  const [segundos, setSegundos] = useState(() => segundosDesde(iniciadaEm));

  useEffect(() => {
    const id = setInterval(() => setSegundos(segundosDesde(iniciadaEm)), 1000);
    return () => clearInterval(id);
  }, [iniciadaEm]);

  const passouSugerido = sugeridoMinutos !== undefined && segundos >= sugeridoMinutos * 60;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm ${passouSugerido ? "text-gold" : "text-foreground/70"}`}>
        {formatarTempo(segundos)}
      </span>
      {sugeridoMinutos !== undefined && (
        <span className="text-xs text-foreground/40">sugestão: {sugeridoMinutos} min</span>
      )}
    </div>
  );
}

// Tempo total estudado hoje: soma o que já foi concluído (fixo) + o tempo ao
// vivo da etapa em andamento, se houver.
export function TempoTotalHoje({
  baseSegundos,
  iniciadaEmAtual,
}: {
  baseSegundos: number;
  iniciadaEmAtual: string | null;
}) {
  const [segundosAtual, setSegundosAtual] = useState(() =>
    iniciadaEmAtual ? segundosDesde(iniciadaEmAtual) : 0
  );

  useEffect(() => {
    if (!iniciadaEmAtual) return;
    const id = setInterval(() => setSegundosAtual(segundosDesde(iniciadaEmAtual)), 1000);
    return () => clearInterval(id);
  }, [iniciadaEmAtual]);

  return (
    <p className="text-xs text-foreground/40">
      Tempo estudado hoje: <span className="font-mono">{formatarTempo(baseSegundos + segundosAtual)}</span>
    </p>
  );
}
