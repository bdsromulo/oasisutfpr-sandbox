import { describe, expect, it } from "vitest";
import { nomeLegivel } from "../src/ui/textos";

describe("nomeLegivel", () => {
  it("baixa os conectivos do meio do nome", () => {
    expect(nomeLegivel("Análise E Projeto De Sistemas")).toBe("Análise e Projeto de Sistemas");
    expect(nomeLegivel("Terceiro Estrato - Trilhas Em Computação")).toBe("Terceiro Estrato - Trilhas em Computação");
    expect(nomeLegivel("Optativas Do Ciclo De Humanidades")).toBe("Optativas do Ciclo de Humanidades");
  });

  it("preserva a primeira e a última palavra", () => {
    expect(nomeLegivel("Laboratório De Física A")).toBe("Laboratório de Física A");
    expect(nomeLegivel("A Arte De Programar")).toBe("A Arte de Programar");
  });

  it("não mexe em texto todo em maiúscula nem em hífen", () => {
    expect(nomeLegivel("INTRODUÇÃO DE SISTEMAS")).toBe("INTRODUÇÃO DE SISTEMAS");
    expect(nomeLegivel("Interação Humano-Computador")).toBe("Interação Humano-Computador");
  });

  it("aceita vazio", () => {
    expect(nomeLegivel(undefined)).toBe("");
    expect(nomeLegivel("")).toBe("");
  });
});
