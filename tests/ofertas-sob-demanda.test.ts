import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// O setup global já carregou todas as ofertas; aqui cada teste importa uma
// instância nova do módulo para ver o estado de antes do download.
async function moduloNovo() {
  vi.resetModules();
  return import("../src/domain/dadosCurso");
}

describe("ofertas de turma sob demanda", () => {
  it("começa com as mesmas chaves de semestre da oferta real, todas vazias", async () => {
    const m = await moduloNovo();
    expect(Object.keys(m.BSI.ofertas)).toEqual(["2026-2", "2026-1", "2025-2"]);
    expect(Object.values(m.BSI.ofertas).every((o) => o.disciplinas.length === 0)).toBe(true);
    expect(m.ofertasProntas(m.BSI)).toBe(false);
  });

  it("não muda a lista de semestres quando os dados chegam", async () => {
    // Se a lista mudasse, o semestre salvo do aluno cairia no padrão durante o
    // carregamento, e a grade dele seria gravada no semestre errado.
    const m = await moduloNovo();
    const antes = m.semestresDoCurso(m.ENG_CONTROLE);
    await m.carregarOfertasDoCurso(m.ENG_CONTROLE);
    expect(m.semestresDoCurso(m.ENG_CONTROLE)).toEqual(antes);
  });

  it("carrega o curso e as outras matrizes do mesmo curso, e só elas", async () => {
    const m = await moduloNovo();
    await m.carregarOfertasDoCurso(m.BSI);
    expect(m.ofertasProntas(m.BSI)).toBe(true);
    expect(m.ofertasProntas(m.BSI_806)).toBe(true);
    expect(m.ofertasProntas(m.ENG_COMP)).toBe(false);
    expect(m.BSI.ofertas["2026-2"].disciplinas.length).toBeGreaterThan(0);
    expect(m.BSI.ofertas["2026-2"]).toBe(m.BSI_806.ofertas["2026-2"]);
  });

  it("reaproveita o download em andamento", async () => {
    const m = await moduloNovo();
    const a = m.carregarOfertasDoCurso(m.ENG_COMP);
    const b = m.carregarOfertasDoCurso(m.ENG_COMP_962);
    expect(a).toBe(b);
    await a;
    expect(m.ofertasProntas(m.ENG_COMP_962)).toBe(true);
  });

  it("cada chunk traz exatamente os semestres declarados em SEMESTRES_COM_OFERTA", async () => {
    // Na virada de semestre, esquecer de declarar a chave nova faria a lista
    // de períodos mudar quando o chunk chega (ver REPOSITORIO.md §4).
    const m = await moduloNovo();
    await m.carregarTodasOfertas();
    for (const c of m.CURSOS) {
      expect([...Object.keys(c.ofertas)].sort(), c.id).toEqual([...m.SEMESTRES_COM_OFERTA].sort());
      expect(Object.values(c.ofertas).every((o) => o.disciplinas.length > 0), c.id).toBe(true);
    }
  });

  it("deixa os JSON de turmas fora do módulo inicial", () => {
    const fonte = readFileSync(new URL("../src/domain/dadosCurso.ts", import.meta.url), "utf8");
    expect(fonte).not.toMatch(/from "\.\.\/\.\.\/data\/.*turmas/);
  });
});
