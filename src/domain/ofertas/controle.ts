import oferta20262Json from "../../../data/eng-controle/turmas/2026-2.json";
import oferta20261Json from "../../../data/eng-controle/turmas/2026-1.json";
import oferta20252Json from "../../../data/eng-controle/turmas/2025-2.json";
import type { OfertaSemestre } from "../tipos";

/**
 * Ofertas de Engenharia de Controle e Automação (978), num chunk próprio. Só baixa quando alguém
 * usa o curso (ou em segundo plano, depois da primeira tela), em vez de pesar
 * no JavaScript inicial de todo mundo. Ver `carregarOfertasDoCurso`.
 */
export const OFERTAS_CONTROLE: Record<string, OfertaSemestre> = {
  "2026-2": oferta20262Json as unknown as OfertaSemestre,
  "2026-1": oferta20261Json as unknown as OfertaSemestre,
  "2025-2": oferta20252Json as unknown as OfertaSemestre,
};
