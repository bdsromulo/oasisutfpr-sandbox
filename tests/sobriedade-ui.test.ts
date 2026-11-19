import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Contratos do redesign de sobriedade (TASK-67). Varre o código das telas atrás
// dos vícios visuais que a fase 1 tirou, para que não voltem por copiar e colar.

const RAIZ_UI = fileURLToPath(new URL("../src/ui", import.meta.url));

function arquivosUi(dir = RAIZ_UI): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosUi(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

function fonte(caminho: string) {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
}

/** Linhas de código, sem as de comentário: um comentário pode citar o vício. */
function linhasDeCodigo(caminho: string) {
  return readFileSync(caminho, "utf8")
    .split("\n")
    .map((linha, i) => ({ linha, n: i + 1 }))
    .filter(({ linha }) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(linha));
}

function ocorrencias(padrao: RegExp) {
  const achados: string[] = [];
  for (const arq of arquivosUi()) {
    for (const { linha, n } of linhasDeCodigo(arq)) {
      if (padrao.test(linha)) achados.push(`${arq.slice(RAIZ_UI.length)}:${n}`);
    }
  }
  return achados;
}

describe("sobriedade da interface", () => {
  it("não usa emoji nem símbolo de texto no lugar de ícone", () => {
    // As estrelas das avaliações ficam: ali são a própria nota.
    expect(ocorrencias(/(?![★☆])[⌀-⏿☀-➿\u{1F300}-\u{1FAFF}]/u)).toEqual([]);
  });

  it("não volta a usar degradê, desfoque de fundo nem transition-all", () => {
    expect(ocorrencias(/bg-gradient-|bg-linear-|backdrop-blur|transition-all\b/)).toEqual([]);
  });

  it("não aumenta nem clareia elementos no hover ou na seleção", () => {
    // Movimento decorativo: o destaque é por anel ou cor, não por escala.
    expect(ocorrencias(/(?<![\w-])scale-(\d|\[)|brightness-\d/)).toEqual([]);
  });

  it("dá ao cartão base cantos xl e nenhuma sombra", () => {
    const comp = fonte("src/ui/componentes.tsx");
    const card = comp.slice(comp.indexOf("export function Card("), comp.indexOf("export function AbasSegmentadas"));
    expect(card).toContain("rounded-xl");
    expect(card).not.toMatch(/rounded-2xl|shadow-/);
  });

  it("não volta a usar os pesos 800 e 900", () => {
    expect(ocorrencias(/\bfont-(black|extrabold)\b/)).toEqual([]);
  });

  it("pinta as matérias da grade em tons baixos e sem o amarelo da ação principal", () => {
    const grade = fonte("src/ui/telas/Grade.tsx");
    const cores = grade.slice(grade.indexOf("const CORES = ["), grade.indexOf("];", grade.indexOf("const CORES = [")));
    expect(cores).not.toMatch(/bg-\w+-400\b/);
    expect(cores).not.toMatch(/amber|yellow|utfpr/);
  });

  it("remove turma pela própria grade com a opção de desfazer", () => {
    const grade = fonte("src/ui/telas/Grade.tsx");
    // O × de cada célula passava direto para setSelecao, sem o aviso de desfazer.
    expect(grade).not.toMatch(/setSelecao\(selecao\.filter\(\(s\) => s\.codDisciplina !== codIdentificador\)\)/);
    expect(grade).toContain("removerDisciplina(codIdentificador)");
  });

  it("dá fundo neutro aos avisos flutuantes e deixa a cor no ícone", () => {
    const pilha = fonte("src/ui/toasts/PilhaToasts.tsx");
    expect(pilha).not.toMatch(/bg-(emerald|amber|red)-50\b/);
  });
});

describe("choque na prévia da grade", () => {
  it("não acusa choque da turma sob o mouse com a própria matéria já escolhida", async () => {
    const { haChoqueNaCasa } = await import("../src/ui/MiniGrade");
    expect(haChoqueNaCasa([{ codigoSelecao: "MAT7AL" }], "MAT7AL")).toBe(false);
  });

  it("acusa choque com outra matéria e entre duas turmas na mesma casa", async () => {
    const { haChoqueNaCasa } = await import("../src/ui/MiniGrade");
    expect(haChoqueNaCasa([{ codigoSelecao: "MAT7AL" }], "ICSG20")).toBe(true);
    expect(haChoqueNaCasa([{ codigoSelecao: "A" }, { codigoSelecao: "B" }], undefined)).toBe(true);
    expect(haChoqueNaCasa([{ codigoSelecao: "A" }], undefined)).toBe(false);
    expect(haChoqueNaCasa([], "A")).toBe(false);
  });
});
