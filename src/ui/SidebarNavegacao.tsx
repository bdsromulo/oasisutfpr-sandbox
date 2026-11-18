import { useState } from "react";
import {
  IconBookOpen,
  IconGraduationCap,
  IconHandshake,
  IconLock,
  IconUser,
} from "./icons";

export type AbaPrincipal = "situacao" | "planejamento" | "simulador" | "match";

interface SidebarNavegacaoProps {
  abaAtiva: AbaPrincipal;
  onSelecionarAba: (aba: AbaPrincipal) => void;
  temPerfil: boolean;
  qtdTurmasSelecao: number;
}

/** Mensagem única para tudo que depende do Histórico Escolar. */
export const EXIGE_HISTORICO =
  "Requer o seu Histórico Escolar. Importe o PDF nas Configurações para liberar.";

export function SidebarNavegacao({
  abaAtiva,
  onSelecionarAba,
  temPerfil,
  qtdTurmasSelecao,
}: SidebarNavegacaoProps) {
  const [colapsado, setColapsado] = useState(false);

  type ItemNav = {
    id: AbaPrincipal;
    rotulo: string;
    subrotulo?: string;
    bloqueado: boolean;
    motivoBloqueio?: string;
    /** rótulo da barra inferior do celular, onde cabem ~10 caracteres */
    rotuloCurto: string;
    icone: React.ReactNode;
    badge?: string | number;
  };

  const itens: ItemNav[] = [
    {
      id: "situacao",
      rotulo: "Minha Situação",
      rotuloCurto: "Situação",
      subrotulo: "Resumo, Catálogo e Trilhas",
      // O painel de progresso exige histórico, mas Catálogo e Fluxograma são
      // úteis no Modo Livre. A App abre diretamente o Catálogo nesse caso.
      bloqueado: false,
      icone: <IconUser className="h-5 w-5 shrink-0" />,
    },
    {
      id: "planejamento",
      rotulo: "Planejamento",
      rotuloCurto: "Planejar",
      subrotulo: "Grade & Matérias Abertas",
      bloqueado: false,
      icone: <IconBookOpen className="h-5 w-5 shrink-0" />,
      badge: qtdTurmasSelecao > 0 ? qtdTurmasSelecao : undefined,
    },
    {
      // a projeção parte das horas já cumpridas: sem histórico ela apenas
      // reprojetaria o curso inteiro do zero, o que não informa nada
      id: "simulador",
      rotulo: "Simulador de Formatura",
      rotuloCurto: "Formatura",
      subrotulo: "Previsão & Linha do Tempo",
      bloqueado: !temPerfil,
      motivoBloqueio: EXIGE_HISTORICO,
      icone: !temPerfil ? <IconLock className="h-5 w-5 shrink-0" /> : <IconGraduationCap className="h-5 w-5 shrink-0" />,
    },
    {
      id: "match",
      rotulo: "Oásis Match",
      rotuloCurto: "Match",
      subrotulo: "Grade com Amigos",
      bloqueado: false,
      icone: <IconHandshake className="h-5 w-5 shrink-0" />,
      badge: "P2P",
    },
  ];

  return (
    <>
      {/* Desktop: lista simples, sem cartão em volta. O item ativo se distingue
          pelo fundo "levantado" e pelo ícone na cor de acento, e o resto fica
          quieto para não competir com o conteúdo. */}
      <aside
        aria-label="Navegação principal"
        className={`sticky top-6 hidden shrink-0 self-start lg:block ${colapsado ? "w-14" : "w-56"}`}
      >
        <nav className="flex flex-col gap-0.5">
          {itens.map((item) => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.bloqueado}
                aria-current={ativo ? "page" : undefined}
                onClick={() => {
                  if (!item.bloqueado) onSelecionarAba(item.id);
                }}
                title={
                  item.bloqueado
                    ? item.motivoBloqueio ??
                      "Carregue seu histórico escolar em PDF nas configurações para acessar esta funcionalidade."
                    : colapsado
                      ? item.rotulo
                      : undefined
                }
                className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  item.bloqueado
                    ? "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                    : ativo
                      ? "cursor-pointer bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800"
                      : "cursor-pointer text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                } ${colapsado ? "justify-center !px-0" : ""}`}
              >
                <span className={`shrink-0 ${ativo ? "text-utfpr-600 dark:text-utfpr-400" : ""}`}>
                  {item.icone}
                </span>
                {!colapsado && (
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-semibold">{item.rotulo}</span>
                      {item.badge !== undefined && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-zinc-200 dark:text-zinc-400 dark:ring-zinc-700">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {item.subrotulo && (
                      <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {item.subrotulo}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setColapsado(!colapsado)}
          className={`mt-3 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs text-zinc-500 transition-colors hover:bg-zinc-200/50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${
            colapsado ? "w-full justify-center !px-0" : ""
          }`}
          title={colapsado ? "Expandir menu" : "Recolher menu"}
          aria-label={colapsado ? "Expandir menu" : "Recolher menu"}
        >
          <span aria-hidden="true">{colapsado ? "»" : "«"}</span>
          {!colapsado && <span>Recolher</span>}
        </button>
      </aside>

      {/* Celular: barra de abas fixa no rodapé, onde o polegar alcança e onde
          todo aplicativo de celular coloca a navegação principal. Antes era uma
          grade 2x2 no topo da página, que empurrava o conteúdo meia tela para
          baixo e sumia ao rolar. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {itens.map((item) => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.bloqueado}
                aria-current={ativo ? "page" : undefined}
                title={item.bloqueado ? item.motivoBloqueio : item.rotulo}
                onClick={() => {
                  if (!item.bloqueado) onSelecionarAba(item.id);
                }}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 text-[11px] font-medium ${
                  item.bloqueado
                    ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                    : ativo
                      ? "cursor-pointer text-zinc-950 dark:text-white"
                      : "cursor-pointer text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {/* Ativo: pílula atrás do ícone, como nas barras de aba nativas
                    do Android. Marca o lugar sem faixa colorida nem brilho. */}
                <span
                  className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    ativo ? "bg-utfpr-500/25 text-zinc-950 dark:bg-utfpr-500/20 dark:text-utfpr-300" : ""
                  }`}
                >
                  {item.icone}
                  {typeof item.badge === "number" && (
                    <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-zinc-900 px-1 text-center text-[10px] font-semibold leading-4 text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.rotuloCurto}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
