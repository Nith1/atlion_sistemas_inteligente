import type { SessaoLocalState } from "./tipos";

function chave(sessaoId: string): string {
  return `atlion:sessao:${sessaoId}`;
}

// Guardado contra SSR (window não existe no servidor) e contra JSON
// corrompido/de um formato antigo — nos dois casos trata como "não existe"
// e deixa quem chamou cair de volta pro bundle fresco do servidor, em vez
// de quebrar a sessão.
export function carregarEstado(sessaoId: string): SessaoLocalState | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chave(sessaoId));
    if (!bruto) return null;
    const estado = JSON.parse(bruto) as SessaoLocalState;
    if (estado?.versao !== 1 || estado.sessaoId !== sessaoId) return null;
    return estado;
  } catch {
    return null;
  }
}

export function salvarEstado(estado: SessaoLocalState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chave(estado.sessaoId), JSON.stringify(estado));
  } catch {
    // aparelho sem espaço ou com localStorage bloqueado — a sessão continua
    // funcionando, só sem a rede de segurança local; não é motivo pra
    // interromper o estudo.
  }
}

export function limparEstado(sessaoId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chave(sessaoId));
  } catch {
    // idem salvarEstado
  }
}
