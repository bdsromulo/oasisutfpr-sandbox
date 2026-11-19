import { afterEach, describe, expect, it, vi } from "vitest";
import { comTransicao } from "../src/ui/transicao";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDocumento(startViewTransition?: (cb: () => void) => unknown, reduzir = false) {
  vi.stubGlobal("document", { startViewTransition });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduzir }) });
}

describe("comTransicao", () => {
  it("usa a transição de visualização quando o navegador tem", () => {
    const start = vi.fn((cb: () => void) => cb());
    stubDocumento(start);
    const fn = vi.fn();
    comTransicao(fn);
    expect(start).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("troca direto quando o sistema pede menos movimento", () => {
    const start = vi.fn();
    stubDocumento(start, true);
    const fn = vi.fn();
    comTransicao(fn);
    expect(start).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("troca direto em navegador sem a API", () => {
    stubDocumento(undefined);
    const fn = vi.fn();
    comTransicao(fn);
    expect(fn).toHaveBeenCalledOnce();
  });
});
