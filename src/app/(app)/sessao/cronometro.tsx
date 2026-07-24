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

// Cronômetro da etapa atual — soma o que já foi acumulado (antes de uma
// eventual pausa) com o tempo ao vivo desde que voltou a contar. Se
// `iniciadaEm` for null, a etapa está pausada e o tempo fica parado.
export function Cronometro({
  tempoAcumuladoSegundos,
  iniciadaEm,
  sugeridoMinutos,
  sugeridoLabel,
}: {
  tempoAcumuladoSegundos: number;
  iniciadaEm: string | null;
  sugeridoMinutos?: number;
  sugeridoLabel?: string;
}) {
  const [segundos, setSegundos] = useState(
    () => tempoAcumuladoSegundos + (iniciadaEm ? segundosDesde(iniciadaEm) : 0)
  );

  useEffect(() => {
    if (!iniciadaEm) {
      setSegundos(tempoAcumuladoSegundos);
      return;
    }
    setSegundos(tempoAcumuladoSegundos + segundosDesde(iniciadaEm));
    const id = setInterval(() => {
      setSegundos(tempoAcumuladoSegundos + segundosDesde(iniciadaEm));
    }, 1000);
    return () => clearInterval(id);
  }, [iniciadaEm, tempoAcumuladoSegundos]);

  const passouSugerido = sugeridoMinutos !== undefined && segundos >= sugeridoMinutos * 60;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm ${passouSugerido ? "text-gold" : "text-foreground/70"}`}>
        {formatarTempo(segundos)}
      </span>
      {!iniciadaEm && <span className="text-xs text-foreground/40">pausado</span>}
      {sugeridoMinutos !== undefined && (
        <span className="text-xs text-foreground/40">sugestão: {sugeridoLabel ?? `${sugeridoMinutos} min`}</span>
      )}
    </div>
  );
}

// Tempo total estudado hoje: soma o que já foi concluído (fixo) + o que a
// etapa atual já acumulou + o tempo ao vivo dela, se estiver rodando.
export function TempoTotalHoje({
  baseSegundos,
  etapaAtualAcumulado,
  iniciadaEmAtual,
}: {
  baseSegundos: number;
  etapaAtualAcumulado: number;
  iniciadaEmAtual: string | null;
}) {
  const [segundosAtual, setSegundosAtual] = useState(() =>
    iniciadaEmAtual ? segundosDesde(iniciadaEmAtual) : 0
  );

  useEffect(() => {
    if (!iniciadaEmAtual) {
      setSegundosAtual(0);
      return;
    }
    setSegundosAtual(segundosDesde(iniciadaEmAtual));
    const id = setInterval(() => setSegundosAtual(segundosDesde(iniciadaEmAtual)), 1000);
    return () => clearInterval(id);
  }, [iniciadaEmAtual]);

  return (
    <p className="text-xs text-foreground/40">
      Tempo estudado hoje:{" "}
      <span className="font-mono">{formatarTempo(baseSegundos + etapaAtualAcumulado + segundosAtual)}</span>
    </p>
  );
}
