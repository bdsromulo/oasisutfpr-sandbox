// Localização do acervo de referência (dado pessoal, FORA do repositório).
//
// `OASIS_MATERIAL` aponta para a raiz do acervo, a pasta que contém os
// `Material Referência <curso> <matriz>/`. Sem ela, nada é inventado: os blocos
// que dependem de históricos reais são pulados, como em CI e em outra máquina.
//
// Ordem de precedência em cada teste: variável específica do teste (quando
// existe) > `OASIS_MATERIAL` > a cópia parcial legada `materiais-referencia/`.
import { existsSync, globSync } from "node:fs";
import { join } from "node:path";

/** Raiz do acervo, ou `undefined` quando `OASIS_MATERIAL` não está definida. */
export const RAIZ_MATERIAL: string | undefined = process.env.OASIS_MATERIAL || undefined;

/** Caminho de algo dentro do acervo, ou `undefined` sem `OASIS_MATERIAL`. */
export function noAcervo(...partes: string[]): string | undefined {
  return RAIZ_MATERIAL ? join(RAIZ_MATERIAL, ...partes) : undefined;
}

/**
 * Raiz da varredura de históricos: `OASIS_ACERVO` (override explícito) >
 * `OASIS_MATERIAL` > cópia legada `materiais-referencia`.
 */
export const RAIZ_VARREDURA: string =
  process.env.OASIS_ACERVO || RAIZ_MATERIAL || "materiais-referencia";

/** Todos os PDFs sob a raiz da varredura, em caminhos completos. Vazio se ela não existe. */
export function pdfsDoAcervo(): string[] {
  if (!existsSync(RAIZ_VARREDURA)) return [];
  return globSync("**/*.pdf", { cwd: RAIZ_VARREDURA }).map((relativo) =>
    join(RAIZ_VARREDURA, relativo),
  );
}
