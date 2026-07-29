"use client";

import { useEffect, useState } from "react";
import { segundosDesdeComLimite } from "@/lib/tempo";

function formatarTempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

// Faz o componente re-renderizar a cada segundo enquanto `ativo`, sem guardar
// o valor do tempo em si — o tempo é sempre recalculado no render a partir de
// `iniciadaEm`, nunca fica um valor "congelado" em estado esperando ser
// sincronizado.
function useTique(ativo: boolean) {
  const [, forcarRender] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => forcarRender((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [ativo]);
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
  useTique(!!iniciadaEm);

  const segundos = tempoAcumuladoSegundos + (iniciadaEm ? segundosDesdeComLimite(iniciadaEm) : 0);
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

// Tempo acumulado num escopo qualquer (o dia inteiro, ou só a sessão atual):
// soma o que já foi concluído (fixo) + o que a etapa atual já acumulou + o
// tempo ao vivo dela, se estiver rodando. O escopo em si (dia vs. sessão) é
// decidido por quem chama, via `baseSegundos` — aqui só soma e exibe.
export function TempoAcumulado({
  label,
  baseSegundos,
  etapaAtualAcumulado,
  iniciadaEmAtual,
}: {
  label: string;
  baseSegundos: number;
  etapaAtualAcumulado: number;
  iniciadaEmAtual: string | null;
}) {
  useTique(!!iniciadaEmAtual);

  const segundosAtual = iniciadaEmAtual ? segundosDesdeComLimite(iniciadaEmAtual) : 0;

  return (
    <p className="text-xs text-foreground/40">
      {label}:{" "}
      <span className="font-mono">{formatarTempo(baseSegundos + etapaAtualAcumulado + segundosAtual)}</span>
    </p>
  );
}
