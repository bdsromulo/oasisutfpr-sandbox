import { describe, expect, it } from "vitest";
import { atalhoAbreMenu, filtrarComandos, normalizarBusca, type Comando } from "../src/ui/comandos";

const nada = () => {};

const COMANDOS: Comando[] = [
  { id: "ir:situacao", grupo: "Ir para", rotulo: "Minha Situação", termos: ["progresso", "painel"], executar: nada },
  { id: "ir:grade", grupo: "Ir para", rotulo: "Minha grade", termos: ["horário"], executar: nada },
  { id: "ir:simulador", grupo: "Ir para", rotulo: "Simulador de Formatura", executar: nada },
  { id: "disc:ICSF13", grupo: "Disciplinas", rotulo: "Análise e Projeto de Sistemas", codigo: "ICSF13", executar: nada },
  { id: "disc:ICSB30", grupo: "Disciplinas", rotulo: "Sistemas Operacionais", codigo: "ICSB30", executar: nada },
];

describe("normalizarBusca", () => {
  it("ignora acento, caixa e espaço nas pontas", () => {
    expect(normalizarBusca("  Situação ")).toBe("situacao");
    expect(normalizarBusca("ANÁLISE")).toBe("analise");
  });
});

describe("filtrarComandos", () => {
  it("sem termo mostra só os comandos que não são disciplina", () => {
    const r = filtrarComandos(COMANDOS, "");
    expect(r.map((c) => c.id)).toEqual(["ir:situacao", "ir:grade", "ir:simulador"]);
  });

  it("acha pelo nome sem acento", () => {
    expect(filtrarComandos(COMANDOS, "situacao").map((c) => c.id)).toEqual(["ir:situacao"]);
  });

  it("acha disciplina pelo código, em qualquer caixa", () => {
    expect(filtrarComandos(COMANDOS, "icsf1").map((c) => c.id)).toEqual(["disc:ICSF13"]);
  });

  it("acha por termo extra que não está no rótulo", () => {
    expect(filtrarComandos(COMANDOS, "horario").map((c) => c.id)).toEqual(["ir:grade"]);
  });

  it("põe primeiro o que começa com o termo", () => {
    // "sistemas" aparece no meio de Análise e Projeto de Sistemas e no início
    // de Sistemas Operacionais; o início vem antes.
    expect(filtrarComandos(COMANDOS, "sistemas").map((c) => c.id)).toEqual(["disc:ICSB30", "disc:ICSF13"]);
  });

  it("exige todas as palavras do termo", () => {
    expect(filtrarComandos(COMANDOS, "projeto sist").map((c) => c.id)).toEqual(["disc:ICSF13"]);
    expect(filtrarComandos(COMANDOS, "projeto redes")).toEqual([]);
  });

  it("respeita o limite", () => {
    expect(filtrarComandos(COMANDOS, "s", 2)).toHaveLength(2);
  });
});

describe("atalhoAbreMenu", () => {
  const ev = (over: Partial<KeyboardEvent>) =>
    ({ key: "k", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...over }) as KeyboardEvent;

  it("abre com Ctrl+K e Cmd+K", () => {
    expect(atalhoAbreMenu(ev({ ctrlKey: true }))).toBe(true);
    expect(atalhoAbreMenu(ev({ metaKey: true }))).toBe(true);
    expect(atalhoAbreMenu(ev({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("não abre com K sozinho nem com outras combinações", () => {
    expect(atalhoAbreMenu(ev({}))).toBe(false);
    expect(atalhoAbreMenu(ev({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(atalhoAbreMenu(ev({ ctrlKey: true, key: "j" }))).toBe(false);
  });
});
