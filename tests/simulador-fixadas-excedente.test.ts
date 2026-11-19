import { describe, expect, it } from "vitest";
import matrizJson from "../data/matriz-981.json";
import turmas20252 from "../data/turmas/2025-2.json";
import turmas20261 from "../data/turmas/2026-1.json";
import turmas20262 from "../data/turmas/2026-2.json";
import { inferirSazonalidade, simularFormatura } from "../src/domain/motor/simuladorFormatura";
import { criarMapaIdentidade } from "../src/domain/motor/identidade";
import type { Matriz, OfertaSemestre, PerfilAluno, ResumoConjunto } from "../src/domain/tipos";

/**
 * Horas acima do mínimo de uma categoria não são problema: o que o aluno pede
 * entra no plano, e o simulador só avisa quanto passa. Caso real: Humanidades
 * com 90h feitas (faltam 45h) e Planejamento de Carreira (60h, só ofertado em
 * semestre par) pedido pelo aluno. O preenchimento automático fechava a
 * categoria antes, em 2027.1, e a matéria pedida era recusada.
 */
const matriz = matrizJson as unknown as Matriz;
const ofertas = [turmas20262, turmas20261, turmas20252] as unknown as OfertaSemestre[];

const conjunto = (cod: string, nome: string, exigido: number, cursado: number): ResumoConjunto => ({
  conjunto: cod,
  nome,
  chObrigatoria: exigido,
  chCursadaAprovada: cursado,
  chFaltante: Math.max(0, exigido - cursado),
  chValidada: cursado >= exigido ? exigido : 0,
});

/** Perfil sintético, sem dado pessoal: só Humanidades está quase fechada. */
function perfil(): PerfilAluno {
  return {
    nome: "FULANO DE TAL",
    matricula: "0000000",
    curso: "BSI",
    matriz: 981,
    periodo: 6,
    coefAbsoluto: 0.8,
    coefNormalizado: 0.75,
    ingresso: "2023/1",
    cursadas: [],
    // fim de curso: só o TCC, o estágio e o ENADE faltam das obrigatórias
    aprovadas: new Set<string>(
      matriz.disciplinas
        .filter((d) => d.conjunto === null && !d.codigo.startsWith("ENADE"))
        .filter((d) => !["ICSX30", "ICSX40", "ICSX41", "ICSS30"].includes(d.codigo))
        .map((d) => d.codigo),
    ),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [conjunto("1161", "Optativas Do Ciclo De Humanidades", 135, 90)],
    eletivas: { chCursadaAprovada: 105, chFaltante: 0, chValidada: 105, chTotal: 105 },
    extensao: { chTotal: 330, chCursada: 330, chFaltante: 0 },
    resumoGeral: {
      obrigatorias: { total: 2005, aprovada: 0, faltante: 2005 },
      optativas: { total: 840, aprovada: 0, faltante: 840 },
      eletivas: { total: 105, aprovada: 105, faltante: 0 },
    },
    avisos: [],
  };
}

const simular = (opcoes: Partial<Parameters<typeof simularFormatura>[3]> = {}) =>
  simularFormatura(perfil(), matriz, ofertas, { ritmo: 6, semestreInicial: "2027-1", ...opcoes });

const codigosDe = (r: ReturnType<typeof simular>, categoria: string) =>
  r.semestres.flatMap((s) => s.disciplinas).filter((d) => d.categoria === categoria).map((d) => d.codigo);

const humanidades = (r: ReturnType<typeof simular>) => r.requisitos.find((q) => q.id === "humanidades")!;

describe("fixada em categoria que as outras pedidas já fecharam", () => {
  const horasDe = (codigo: string) => matriz.disciplinas.find((d) => d.codigo === codigo)!.horas.total;

  it("a matéria pedida entra e nenhuma outra de Humanidades a acompanha", () => {
    const r = simular({ disciplinasFixadas: ["FCH7PC"] });
    expect(codigosDe(r, "humanidades")).toEqual(["FCH7PC"]);
    expect(r.exclusoesImpossiveis.filter((x) => x.alvo === "FCH7PC")).toEqual([]);
  });

  it("o excedente (60h entregues para 45h faltantes) vira aviso e dado do requisito", () => {
    const r = simular({ disciplinasFixadas: ["FCH7PC"] });
    expect(humanidades(r).excedente).toBe(15);
    expect(r.avisos.some((a) => a.includes("Ciclo de Humanidades") && a.includes("15h a mais"))).toBe(true);
  });

  it("duas fixadas entram mesmo que uma bastasse (caso Presença Africana + Planejamento de Carreira)", () => {
    // Presença Africana (FCH7XC) fecha as 45h sozinha; o Planejamento de Carreira
    // era recusado com "a categoria dela fecha sem ela"
    const r = simular({ disciplinasFixadas: ["FCH7XC", "FCH7PC"] });
    expect(codigosDe(r, "humanidades").sort()).toEqual(["FCH7PC", "FCH7XC"]);
    expect(r.exclusoesImpossiveis.filter((x) => x.tipo === "disciplina-fixada")).toEqual([]);
    expect(humanidades(r).excedente).toBe(horasDe("FCH7XC") + horasDe("FCH7PC") - 45);
  });

  it("a fixada presa a um semestre também entra com a categoria fechada", () => {
    const r = simular({
      disciplinasFixadas: ["FCH7XC"],
      fixacoesPorSemestre: { "2027-2": ["FCH7PC"] },
    });
    expect(codigosDe(r, "humanidades").sort()).toEqual(["FCH7PC", "FCH7XC"]);
  });

  it("sem fixar nada o plano cursa só o necessário: uma matéria para as 45h que faltam", () => {
    const r = simular();
    expect(codigosDe(r, "humanidades")).toHaveLength(1);
    // a matéria escolhida pode passar de 45h; o aviso diz quanto, e só isso
    expect(humanidades(r).excedente).toBeLessThan(45);
  });
});

describe("veto por semestre", () => {
  it("a matéria vetada sai daquele semestre e segue disponível ao motor", () => {
    const base = simular();
    const alvo = base.semestres
      .find((s) => s.semestre === "2027-1")!
      .disciplinas.find((d) => d.categoria !== "obrigatorias" && d.codigo !== "ELETIVA")!;
    const r = simular({ vetosPorSemestre: { "2027-1": [alvo.codigo] } });
    const em2027_1 = r.semestres.find((s) => s.semestre === "2027-1")!.disciplinas.map((d) => d.codigo);
    expect(em2027_1).not.toContain(alvo.codigo);
    expect(r.exclusoesImpossiveis).toEqual([]);
  });
});
