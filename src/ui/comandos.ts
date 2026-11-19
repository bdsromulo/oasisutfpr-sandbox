// Lógica do menu de comandos (Ctrl+K), separada da tela para ser testável.
//
// O menu junta dois tipos de item: ir para uma tela e achar uma disciplina pelo
// nome ou código. Sem termo, só as telas aparecem; uma lista de 60 disciplinas
// logo de cara seria ruído. A busca é tolerante a acento e caixa, como a do
// Catálogo, e exige todas as palavras digitadas.

export interface Comando {
  id: string;
  /** título da seção onde o item aparece ("Ir para", "Disciplinas", ...) */
  grupo: string;
  rotulo: string;
  /** código da disciplina, mostrado à direita e pesquisável */
  codigo?: string;
  /** sinônimos que não aparecem no rótulo ("horário" acha "Minha grade") */
  termos?: string[];
  /** atalho exibido como dica, só no desktop */
  atalho?: string;
  executar: () => void;
}

export function normalizarBusca(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const GRUPO_DISCIPLINAS = "Disciplinas";

/**
 * Pontua um comando contra as palavras do termo. Menor é melhor; null fica de
 * fora. Código que começa com o termo vence, depois rótulo que começa com ele,
 * depois palavra do rótulo que começa com ele, por fim qualquer ocorrência.
 */
function pontuar(c: Comando, palavras: string[]): number | null {
  const rotulo = normalizarBusca(c.rotulo);
  const codigo = normalizarBusca(c.codigo ?? "");
  const extra = (c.termos ?? []).map(normalizarBusca).join(" ");
  const tudo = `${rotulo} ${codigo} ${extra}`;
  if (!palavras.every((p) => tudo.includes(p))) return null;

  const primeira = palavras[0];
  if (codigo && codigo.startsWith(primeira)) return 0;
  if (rotulo.startsWith(primeira)) return 1;
  if (rotulo.split(/\s+/).some((w) => w.startsWith(primeira))) return 2;
  return 3;
}

export function filtrarComandos(comandos: Comando[], termo: string, limite = 50): Comando[] {
  const palavras = normalizarBusca(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) {
    return comandos.filter((c) => c.grupo !== GRUPO_DISCIPLINAS).slice(0, limite);
  }
  return comandos
    .map((c, i) => ({ c, i, p: pontuar(c, palavras) }))
    .filter((x): x is { c: Comando; i: number; p: number } => x.p !== null)
    // estável: empate mantém a ordem em que os comandos foram declarados
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .slice(0, limite)
    .map((x) => x.c);
}

/** Ctrl+K no Windows e Linux, Cmd+K no Mac. Sem Alt, para não roubar atalho do sistema. */
export function atalhoAbreMenu(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k";
}

export { GRUPO_DISCIPLINAS };
