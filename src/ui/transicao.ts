import { flushSync } from "react-dom";

/**
 * Troca de tela com uma transição curta (View Transitions API). A tela antiga
 * esmaece para a nova em ~120ms (ver index.css), o que deixa claro que algo
 * mudou sem mover nada de lugar.
 *
 * Sem a API (Firefox antigo, Safari antigo) ou com "reduzir movimento" ligado
 * no sistema, a troca é direta. `flushSync` porque a API fotografa o DOM logo
 * depois do callback, e o React só aplicaria o estado no próximo quadro.
 */
export function comTransicao(trocar: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduzir) {
    trocar();
    return;
  }
  doc.startViewTransition(() => flushSync(trocar));
}
