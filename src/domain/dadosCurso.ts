import type { Matriz, OfertaSemestre } from "./tipos";
import {
  chaveSemestre,
  ofertaReferenciaDoSemestre,
  SEMESTRE_PLANEJAMENTO,
} from "./semestres";
import matriz981Json from "../../data/matriz-981.json";
import matriz806Json from "../../data/matriz-806.json";
import matriz844Json from "../../data/eng-comp/matriz-844.json";
import matriz962Json from "../../data/eng-comp/matriz-962.json";
import matriz968Json from "../../data/eng-eletronica/matriz-968.json";
import matriz978Json from "../../data/eng-controle/matriz-978.json";
import matriz973Json from "../../data/eng-mecatronica/matriz-973.json";
import matriz823Json from "../../data/eng-mecatronica/matriz-823.json";

/**
 * Reúne, por curso, a matriz e as ofertas de turma que a interface consome.
 *
 * Sem isto o App importava a matriz 981 e as turmas de BSI direto, no topo do
 * arquivo — o que amarrava toda a tela de Planejamento a um curso só.
 *
 * As matrizes vêm no bundle inicial (o check-in precisa delas para detectar o
 * curso). As ofertas de turma, que são a maior parte dos dados, chegam por
 * curso e sob demanda: ver `carregarOfertasDoCurso`. Até lá cada semestre do
 * curso aponta para uma oferta vazia, com as MESMAS chaves de semestre da
 * oferta real, para que a lista de períodos não mude quando os dados chegam.
 */

export interface DadosCurso {
  id: string;
  rotulo: string;
  rotuloCurto: string;
  matriz: Matriz;
  /** ofertas por semestre, da mais recente para a mais antiga */
  ofertas: Record<string, OfertaSemestre>;
  /**
   * Semestre aberto por padrão ao entrar no curso.
   *
   * É o de planejamento, não o corrente: quem abre o Oásis está montando a
   * grade do período que vem: a matrícula do corrente já passou, e a oferta
   * dele serve de consulta.
   */
  semestrePadrao: string;
  /**
   * Semestres sem PDF de Turmas Abertas publicado, que a plataforma projeta
   * sobre a oferta real de mesma paridade.
   *
   * Eles NÃO entram em `ofertas`: `oferta.semestre` significa "de onde estas
   * turmas vieram", e reescrevê-lo faria o Oásis afirmar que tem um quadro
   * oficial de 2027.1 que a UTFPR ainda não publicou — justamente o que a
   * etiqueta de provisoriedade precisa poder negar. A resolução acontece em
   * `ofertaDoSemestre`, em tempo de leitura.
   */
  semestresProjetados: string[];
}

/** Semestres com oferta versionada em `data/`, iguais para todos os cursos. */
export const SEMESTRES_COM_OFERTA = ["2026-2", "2026-1", "2025-2"];

/**
 * Grupos de oferta: matrizes do mesmo curso leem a mesma lista de Turmas
 * Abertas, então compartilham o chunk e os mesmos objetos de oferta.
 */
type GrupoOferta = "bsi" | "eng-comp" | "eletronica" | "controle" | "mecatronica";

const NOME_DO_GRUPO: Record<GrupoOferta, string> = {
  bsi: "SISTEMAS DE INFORMAÇÃO",
  "eng-comp": "ENG DE COMPUTAÇÃO",
  eletronica: "ENG ELETRÔNICA",
  controle: "ENG CONTROLE E AUTOMAÇÃO",
  mecatronica: "ENG MECATRÔNICA",
};

const CARREGADORES: Record<GrupoOferta, () => Promise<Record<string, OfertaSemestre>>> = {
  bsi: () => import("./ofertas/bsi").then((m) => m.OFERTAS_BSI),
  "eng-comp": () => import("./ofertas/engComp").then((m) => m.OFERTAS_ENG_COMP),
  eletronica: () => import("./ofertas/eletronica").then((m) => m.OFERTAS_ELETRONICA),
  controle: () => import("./ofertas/controle").then((m) => m.OFERTAS_CONTROLE),
  mecatronica: () => import("./ofertasMecatronicaHistoricas").then((m) => m.OFERTAS_MECATRONICA_HISTORICAS),
};

/** Oferta vazia que segura o lugar de cada semestre até o chunk chegar. */
function ofertasEmCarregamento(grupo: GrupoOferta): Record<string, OfertaSemestre> {
  return Object.fromEntries(
    SEMESTRES_COM_OFERTA.map((semestre) => [
      semestre,
      {
        curso: NOME_DO_GRUPO[grupo],
        semestre,
        fonte: "Turmas em carregamento",
        disciplinas: [],
      } satisfies OfertaSemestre,
    ]),
  );
}

const grupoDoCurso = new Map<string, GrupoOferta>();
const prontos = new Set<GrupoOferta>();
const emAndamento = new Map<GrupoOferta, Promise<void>>();

function curso(dados: Omit<DadosCurso, "ofertas" | "semestrePadrao" | "semestresProjetados">, grupo: GrupoOferta): DadosCurso {
  grupoDoCurso.set(dados.id, grupo);
  return {
    ...dados,
    ofertas: ofertasEmCarregamento(grupo),
    semestrePadrao: SEMESTRE_PLANEJAMENTO,
    semestresProjetados: [SEMESTRE_PLANEJAMENTO],
  };
}

export const BSI = curso(
  {
    id: "bsi-981",
    rotulo: "Bacharelado em Sistemas de Informação",
    rotuloCurto: "BSI",
    matriz: matriz981Json as unknown as Matriz,
  },
  "bsi",
);

// A BSI tem uma oferta só por semestre, publicada com os códigos da matriz nova.
// A 806 lê a mesma oferta pela camada de equivalências — 66 das 77 disciplinas
// ofertadas em 2026-1 resolvem para ela, 8 pelo código direto e 58 por
// equivalência. As 11 restantes existem apenas na 981, o que é esperado numa
// oferta compartilhada entre matrizes.
export const BSI_806 = curso(
  {
    id: "bsi-806",
    rotulo: "Bacharelado em Sistemas de Informação (806)",
    rotuloCurto: "BSI (806)",
    matriz: matriz806Json as unknown as Matriz,
  },
  "bsi",
);

// Eng. Comp. tem uma única oferta de Turmas Abertas por semestre (curso "ENG DE
// COMPUTAÇÃO"); as matrizes 844 e 962 apenas a leem por códigos distintos. Por
// isso ambas apontam para o mesmo arquivo de turmas — que é o de Eng. Comp., e
// não o de BSI.
export const ENG_COMP = curso(
  {
    id: "eng-comp",
    rotulo: "Engenharia de Computação (844)",
    rotuloCurto: "Eng. Comp. (844)",
    matriz: matriz844Json as unknown as Matriz,
  },
  "eng-comp",
);

export const ENG_COMP_962 = curso(
  {
    id: "eng-comp-962",
    rotulo: "Engenharia de Computação (962)",
    rotuloCurto: "Eng. Comp. (962)",
    matriz: matriz962Json as unknown as Matriz,
  },
  "eng-comp",
);

// Eng. Eletrônica tem PDF de Turmas Abertas próprio (curso "ENG ELETRÔNICA"),
// separado do de Eng. Comp. 2026-2 vem do PDF oficial do Portal; 2026-1 e
// 2025-2 vêm do backup do Grade na Hora, que é a fonte das ofertas passadas.
// As duas paridades importam: o Simulador de Formatura espelha cada semestre
// futuro na oferta real de mesma paridade, e sem 2026-1 os semestres ímpares
// eram projetados sobre a oferta de um semestre par.
export const ENG_ELETRONICA = curso(
  {
    id: "eng-eletronica-968",
    rotulo: "Engenharia Eletrônica (968)",
    rotuloCurto: "Eng. Eletrônica",
    matriz: matriz968Json as unknown as Matriz,
  },
  "eletronica",
);

// Controle e Automação tem oferta própria do Portal. 2026-2 é a fonte oficial
// vigente; as duas ofertas anteriores vêm dos backups HTML do Grade na Hora e
// preservam as duas paridades usadas pelo Simulador de Formatura.
export const ENG_CONTROLE = curso(
  {
    id: "eng-controle-978",
    rotulo: "Engenharia de Controle e Automação (978)",
    rotuloCurto: "Eng. Controle",
    matriz: matriz978Json as unknown as Matriz,
  },
  "controle",
);

// Mecatrônica tem uma das maiores ofertas do Portal. As matrizes 823 e 973
// pertencem ao mesmo curso e consultam a mesma lista de Turmas Abertas. O
// casamento dos códigos atuais com a grade antiga acontece pelas 264
// equivalências publicadas na própria matriz 823.
export const ENG_MECATRONICA = curso(
  {
    id: "eng-mecatronica-973",
    rotulo: "Engenharia Mecatrônica (973)",
    rotuloCurto: "Eng. Mecatrônica",
    matriz: matriz973Json as unknown as Matriz,
  },
  "mecatronica",
);

export const ENG_MECATRONICA_823 = curso(
  {
    id: "eng-mecatronica-823",
    rotulo: "Engenharia Mecatrônica (823)",
    rotuloCurto: "Eng. Mecatrônica (823)",
    matriz: matriz823Json as unknown as Matriz,
  },
  "mecatronica",
);

function carregarGrupo(grupo: GrupoOferta): Promise<void> {
  if (prontos.has(grupo)) return Promise.resolve();
  const andamento = emAndamento.get(grupo);
  if (andamento) return andamento;
  const promessa = CARREGADORES[grupo]()
    .then((ofertas) => {
      // Muta o objeto que os cursos já têm, em vez de trocar a referência:
      // quem guardou `curso.ofertas` passa a ver os dados reais.
      for (const c of CURSOS) {
        if (grupoDoCurso.get(c.id) === grupo) Object.assign(c.ofertas, ofertas);
      }
      prontos.add(grupo);
    })
    .finally(() => emAndamento.delete(grupo));
  emAndamento.set(grupo, promessa);
  return promessa;
}

/** Baixa as ofertas do curso (e das outras matrizes do mesmo curso). */
export function carregarOfertasDoCurso(c: DadosCurso): Promise<void> {
  const grupo = grupoDoCurso.get(c.id);
  return grupo ? carregarGrupo(grupo) : Promise.resolve();
}

/** As ofertas reais do curso já chegaram? Antes disso todas estão vazias. */
export function ofertasProntas(c: DadosCurso): boolean {
  const grupo = grupoDoCurso.get(c.id);
  return grupo ? prontos.has(grupo) : true;
}

/**
 * Baixa as ofertas de todos os cursos. O roster de docentes das avaliações é
 * global (§6.10), e a ingestão e os testes precisam de tudo carregado.
 */
export async function carregarTodasOfertas(): Promise<void> {
  await Promise.all((Object.keys(CARREGADORES) as GrupoOferta[]).map(carregarGrupo));
}

/** Mantido para quem já chamava o carregador antigo só de Mecatrônica. */
export function carregarOfertasHistoricasMecatronica(): Promise<void> {
  return carregarGrupo("mecatronica");
}

/**
 * Todos os cursos cobertos. Exportado porque o roster de docentes das avaliações
 * é global — ele varre as ofertas de todos os cursos, não só o do aluno (§6.10),
 * e manter uma segunda lista lá dentro daria drift assim que um curso novo entrar.
 */
export const CURSOS = [
  BSI,
  BSI_806,
  ENG_COMP,
  ENG_COMP_962,
  ENG_ELETRONICA,
  ENG_CONTROLE,
  ENG_MECATRONICA,
  ENG_MECATRONICA_823,
];

/** Dados do curso escolhido no check-in, com a BSI como padrão. */
export function dadosDoCurso(id: string | undefined | null): DadosCurso {
  return CURSOS.find((c) => c.id === id) ?? BSI;
}

/** Curso coberto correspondente à matriz detectada no histórico. */
export function dadosDoCursoPorMatriz(matriz: number | null | undefined): DadosCurso | null {
  if (matriz === null || matriz === undefined) return null;
  return CURSOS.find((c) => c.matriz.matriz === matriz) ?? null;
}

/**
 * Semestres navegáveis, do mais recente para o mais antigo: os projetados vêm
 * junto dos que têm oferta própria, porque para quem planeja os dois são
 * períodos possíveis. "2027-1" ordena naturalmente acima de "2026-2".
 */
export function semestresDoCurso(curso: DadosCurso): string[] {
  return [...new Set([...curso.semestresProjetados, ...Object.keys(curso.ofertas)])]
    .sort()
    .reverse();
}

/**
 * Só os semestres com PDF publicado. É o conjunto que `oferta.semestre` pode
 * legitimamente assumir, e a base do espelho de paridade.
 */
export function semestresReaisDoCurso(curso: DadosCurso): string[] {
  return Object.keys(curso.ofertas).sort().reverse();
}

/**
 * Oferta a exibir para um semestre: a própria, quando existe; senão a real de
 * mesma paridade. Resolver aqui, e não guardar uma cópia em `ofertas`, é o que
 * mantém Mecatrônica correta — as ofertas dela chegam por chunk assíncrono, e
 * um espelho materializado na carga do módulo nasceria do placeholder vazio.
 */
export function ofertaDoSemestre(curso: DadosCurso, semestre: string): OfertaSemestre {
  const alvo = chaveSemestre(semestre);
  const conhecidas = semestresReaisDoCurso(curso).map((s) => curso.ofertas[s]);
  return (
    curso.ofertas[alvo] ??
    ofertaReferenciaDoSemestre(alvo, conhecidas) ??
    // Último recurso: a oferta mais recente que existir. Não pode se apoiar em
    // `semestrePadrao`, que é o semestre de planejamento e por definição não tem
    // entrada própria — e um curso pode ter só uma paridade disponível, como
    // Mecatrônica nos instantes antes de o chunk de ofertas chegar.
    conhecidas[0]
  );
}
