import { useEffect, useMemo, useRef, useState } from "react";
import { filtrarComandos, type Comando } from "./comandos";
import { IconSearch } from "./icons";

/**
 * Menu de comandos (Ctrl+K). Ir para uma tela ou achar uma disciplina sem
 * passar pela navegação: reconhecer em vez de lembrar onde cada coisa mora.
 *
 * Padrão de combobox: o foco fica sempre no campo, as setas movem o item ativo
 * (aria-activedescendant), Enter executa e Esc fecha. O clique fora também
 * fecha. Nada aqui anima além do fade do fundo.
 */
export function MenuComandos(props: { aberto: boolean; onFechar: () => void; comandos: Comando[] }) {
  // Montado só enquanto aberto: cada abertura começa com estado novo. Guardar o
  // termo fechado e zerar num efeito deixava o termo anterior aparecer por um
  // quadro ao reabrir, e o que se digitasse nesse quadro grudava nele.
  if (!props.aberto) return null;
  return <PainelComandos onFechar={props.onFechar} comandos={props.comandos} />;
}

function PainelComandos(props: { onFechar: () => void; comandos: Comando[] }) {
  const { onFechar } = props;
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);

  const resultados = useMemo(() => filtrarComandos(props.comandos, termo), [props.comandos, termo]);

  // mantém o item ativo visível ao navegar com as setas
  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  function executar(c: Comando | undefined) {
    if (!c) return;
    onFechar();
    c.executar();
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(resultados.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      executar(resultados[ativo]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onFechar();
    }
  }

  // agrupa mantendo a ordem do ranking dentro de cada grupo
  let grupoAnterior = "";

  return (
    <div
      className="fixed inset-0 z-[80] flex animate-in items-start justify-center bg-black/50 p-4 pt-[12vh] fade-in duration-100"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de comandos"
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <IconSearch className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setAtivo(0);
            }}
            onKeyDown={aoTeclar}
            role="combobox"
            aria-expanded="true"
            aria-controls="menu-comandos-lista"
            aria-activedescendant={resultados[ativo] ? `cmd-${resultados[ativo].id}` : undefined}
            aria-autocomplete="list"
            // o anel global de foco ficaria em volta do campo dentro da caixa;
            // aqui o foco é sempre do campo, então o anel não informa nada
            style={{ outline: "none" }}
            placeholder="Ir para uma tela ou buscar disciplina por nome ou código"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-500 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
          <kbd className="hidden shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 sm:inline dark:border-zinc-700 dark:text-zinc-400">
            Esc
          </kbd>
        </div>

        <ul id="menu-comandos-lista" ref={listaRef} role="listbox" className="overflow-y-auto p-1.5">
          {resultados.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nada encontrado para "{termo}".
            </li>
          )}
          {resultados.map((c, i) => {
            const cabecalho = c.grupo !== grupoAnterior ? c.grupo : null;
            grupoAnterior = c.grupo;
            return (
              <li key={c.id} role="presentation">
                {cabecalho && (
                  <div className="px-3 pt-2.5 pb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {cabecalho}
                  </div>
                )}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === ativo}
                  data-indice={i}
                  onMouseMove={() => i !== ativo && setAtivo(i)}
                  onClick={() => executar(c)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm sm:min-h-10 ${
                    i === ativo
                      ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{c.rotulo}</span>
                  {c.codigo && <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">{c.codigo}</span>}
                  {c.atalho && (
                    <kbd className="hidden shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 lg:inline dark:border-zinc-700 dark:text-zinc-400">
                      {c.atalho}
                    </kbd>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-4 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-500 sm:flex dark:border-zinc-800 dark:text-zinc-400">
          <span>
            <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> para escolher
          </span>
          <span>
            <kbd className="font-sans">Enter</kbd> para abrir
          </span>
        </div>
      </div>
    </div>
  );
}
