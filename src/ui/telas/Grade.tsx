import { useMemo, useState, useRef } from "react";
import { toPng } from "html-to-image";
import type { OfertaSemestre } from "../../domain/tipos";
import { chaveSemestre, estadoDoSemestre, SEMESTRE_CORRENTE } from "../../domain/semestres";
import {
  aulasSemanais,
  chaveSlot,
  detectarConflitos,
  horariosUnicos,
  itensDaSelecao,
  relatorioTexto,
  type ItemGrade,
} from "../../domain/motor/grade";
import type { Matriz, PerfilAluno, SelecaoTurma } from "../../domain/tipos";
import { faixaDoSlot } from "../../domain/horarios";
import { categoriaDe } from "../../domain/motor/elegiveis";
import { disciplinaCanonicaDaOferta } from "../../domain/motor/identidade";
import { calcularResumoProgressoGrade, obterCargaHoraria, type ResumoCategoriaGrade } from "../../domain/motor/progressoGrade";
import { Badge, BalaoProgressoHover, BarraProgressoComPreview, Botao, Card, IconeStatusProgresso } from "../componentes";
import { IconCalendar, IconCheck, IconCopy, IconDownload, IconGraduationCap, IconHourglass, IconImage, IconInfo, IconLock, IconStar, IconTrash, IconUser, IconWarning, IconGrade, IconBan } from "../icons";
import { ModalGradeMagica } from "./ModalGradeMagica";
import { useToasts } from "../toasts/contexto";
import { avisarRemocao } from "../toasts/avisos";
import { PainelProfessor, type AlvoPainelProfessor } from "./PainelProfessor";
import { reviewsHabilitadasPara } from "../../domain/reviews/config";
import { PainelDisciplina, type AlvoPainelDisciplina } from "./PainelDisciplina";
import { useContagemPorTurma } from "./reviewsComuns";
import { descricaoDoCurso, ehTrilha } from "../../domain/cursos";
import { nomeLegivel } from "../textos";

const DIAS: [number, string][] = [
  [2, "Segunda"],
  [3, "Terça"],
  [4, "Quarta"],
  [5, "Quinta"],
  [6, "Sexta"],
  [7, "Sábado"],
];
const SLOTS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ["M", n] as const),
  ...[1, 2, 3, 4, 5, 6].map((n) => ["T", n] as const),
  ...[1, 2, 3, 4, 5].map((n) => ["N", n] as const),
];
/**
 * Cor de cada matéria na grade. A cor tem função (achar a mesma matéria nos
 * vários horários), então fica, mas em tons baixos e com menos matizes: antes
 * eram dez cores 400 saturadas, que liam como arco-íris. O amarelo da UTFPR
 * não entra, para não competir com a ação principal da tela.
 */
const CORES = [
  "bg-sky-200 text-sky-950 dark:bg-sky-900 dark:text-sky-50",
  "bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50",
  "bg-rose-200 text-rose-950 dark:bg-rose-900 dark:text-rose-50",
  "bg-indigo-200 text-indigo-950 dark:bg-indigo-900 dark:text-indigo-50",
  "bg-orange-200 text-orange-950 dark:bg-orange-900 dark:text-orange-50",
  "bg-teal-200 text-teal-950 dark:bg-teal-900 dark:text-teal-50",
  "bg-stone-300 text-stone-950 dark:bg-stone-700 dark:text-stone-50",
  "bg-fuchsia-200 text-fuchsia-950 dark:bg-fuchsia-900 dark:text-fuchsia-50",
];

/**
 * Uma linha do Resumo do Impacto. Antes cada categoria era um cartão em grade,
 * com chips em fonte mono e uma caixa amarela para o excedente. Numa lista só,
 * no mesmo desenho de Minha Situação, as barras ficam alinhadas e dá para ver
 * de relance onde a grade soma horas.
 */
function LinhaResumoCategoria({ r, isSubTrilha }: { r: ResumoCategoriaGrade; isSubTrilha?: boolean }) {
  const max = r.exigido > 0 ? r.exigido : 1;
  const pctTotal = Math.min(100, Math.round((r.cumpridoSimulado / max) * 100));
  const ehExcedenteConcluido = Boolean(isSubTrilha && r.cumpridoBase >= r.exigido && r.impulsoGrade > 0);

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_9rem] ${
        isSubTrilha ? "md:pl-9" : ""
      }`}
    >
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.categoriaNome}</span>
        {r.disciplinasEnvolvidas.length > 0 ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {r.disciplinasEnvolvidas.map((disc, i) => (
              <span key={disc.codigo} title={`${disc.codigo} · ${nomeLegivel(disc.nome)} (${disc.carga}h)`}>
                {i > 0 && ", "}
                {nomeLegivel(disc.nome)} <span className="text-zinc-400 dark:text-zinc-500">+{disc.carga}h</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Nada desta grade conta aqui</span>
        )}
        {ehExcedenteConcluido && (
          <span className="mt-1 flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <IconStar className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Trilha já completa. As +{r.impulsoGrade}h contam como horas excedentes no bloco optativo do curso.
            </span>
          </span>
        )}
      </div>
      <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
        <BarraProgressoComPreview cumprido={r.cumpridoBase} preview={r.impulsoGrade} exigido={r.exigido} classe="h-2" />
      </div>
      <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {Math.min(r.exigido, r.cumpridoSimulado)}
          <span className="font-normal text-zinc-400"> / {r.exigido}h</span>
          <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">{pctTotal}%</span>
        </span>
        <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400" title={r.statusTexto}>
          <IconeStatusProgresso status={r.statusIcone} />
          {r.impulsoGrade > 0 ? (
            <span className="font-medium text-zinc-800 dark:text-zinc-200">+{r.impulsoGrade}h nesta grade</span>
          ) : (
            <span>sem impulso</span>
          )}
        </span>
      </div>
    </li>
  );
}

/** Legenda das cores da barra, em texto corrido e sem pílulas. */
function LegendaResumo() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" /> Já concluído
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-utfpr-500" /> Soma desta grade
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" /> Falta
      </span>
    </div>
  );
}

function SecaoResumoImpactoGrade(props: {
  itens: ItemGrade[];
  perfil?: PerfilAluno | null;
  matriz?: Matriz | null;
}) {
  const temHistorico = Boolean(props.perfil && props.perfil.cursadas && props.perfil.cursadas.length > 0);
  const cursoAtual = descricaoDoCurso(props.matriz ?? 981);
  const resumos = useMemo(
    () => calcularResumoProgressoGrade(props.itens, props.perfil, props.matriz),
    [props.itens, props.perfil, props.matriz]
  );

  const cabecalho = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
      <div>
        <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Impacto da grade no curso
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Quanto as matérias desta grade somam em cada categoria.
        </p>
      </div>
      {temHistorico && <LegendaResumo />}
    </div>
  );

  if (!temHistorico) {
    return (
      <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {cabecalho}
        <div className="flex items-start gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Carregue seu histórico para ver quanto esta grade adianta em cada categoria
            {cursoAtual.matriz === 981 ? ", estrato e trilha" : " e trilha"} do curso.
          </p>
        </div>
      </section>
    );
  }

  if (resumos.length === 0) return null;

  // categorias principais: obrigatórias mais as de conjunto único do curso
  const chavesPrincipais = [
    "obrigatorias",
    ...cursoAtual.categorias.filter((c) => c.id !== "eletivas").map((c) => String(c.conjunto)),
  ];
  const resumosNormaisPrimeiraParte = resumos.filter((r) => chavesPrincipais.includes(r.categoriaId));
  const resumoTrilhasGeral = resumos.find((r) => r.categoriaId === "trilhas_geral");
  const resumosSubTrilhas = resumos.filter((r) => ehTrilha(cursoAtual, r.categoriaId));
  const resumosNormaisSegundaParte = resumos.filter(
    (r) =>
      ![...chavesPrincipais, "trilhas_geral"].includes(r.categoriaId) &&
      !ehTrilha(cursoAtual, r.categoriaId)
  );

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {cabecalho}
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {resumosNormaisPrimeiraParte.map((r) => (
          <LinhaResumoCategoria key={r.categoriaId} r={r} />
        ))}
        {resumoTrilhasGeral && <LinhaResumoCategoria r={resumoTrilhasGeral} />}
        {resumosSubTrilhas.length > 0 && (
          <li className="bg-zinc-50 px-5 py-2 text-xs text-zinc-500 md:pl-9 dark:bg-zinc-950/40 dark:text-zinc-400">
            Por trilha ({resumosSubTrilhas.length}). As horas das trilhas contam para a carga optativa do curso.
          </li>
        )}
        {resumosSubTrilhas.map((r) => (
          <LinhaResumoCategoria key={r.categoriaId} r={r} isSubTrilha />
        ))}
        {resumosNormaisSegundaParte.map((r) => (
          <LinhaResumoCategoria key={r.categoriaId} r={r} />
        ))}
      </ul>
    </section>
  );
}

export function TelaGrade(props: {
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  cestaGrades?: Record<string, SelecaoTurma[]>;
  gradeAtiva?: string;
  onMudarGradeAtiva?: (id: string) => void;
  onNovaGrade?: () => void;
  onRemoverGrade?: (id: string) => void;
  perfil?: PerfilAluno | null;
  matriz?: Matriz;
  onAbrirGradeMagica?: () => void;
  exclusoesSugestao?: {
    disciplinas: { codigo: string; nome: string }[];
    professores: string[];
    trilhas?: { conjunto: string; nome: string }[];
    outrosFiltros?: string[];
  } | null;
  onLimparExclusoes?: () => void;
  todasCestasPorSemestre?: Record<string, Record<string, SelecaoTurma[]>>;
  semestreAtivo?: string;
  /** semestres com oferta própria, para a cópia de grade entre períodos */
  semestresConhecidos?: string[];
  todasOfertas?: Record<string, OfertaSemestre>;
  /** manda esta grade para o Simulador de Formatura usar como semestre de partida */
  onEnviarParaSimulador?: () => void;
  /** true quando esta grade já é a que alimenta o simulador */
  gradeNoSimulador?: boolean;
}) {
  const { oferta, selecao, setSelecao } = props;
  const [copiado, setCopiado] = useState(false);
  const [modalGradeMagica, setModalGradeMagica] = useState(false);
  // painel lateral de avaliações do docente (RF17) — por enquanto só na BSI 981
  const [profPainel, setProfPainel] = useState<AlvoPainelProfessor | null>(null);
  const reviewsLigadas = reviewsHabilitadasPara(props.matriz?.matriz);
  const [turmaRevisada, setTurmaRevisada] = useState<AlvoPainelDisciplina | null>(null);

  const reviews = useContagemPorTurma(props.matriz);
  const [disciplinaHoverId, setDisciplinaHoverId] = useState<string | null>(null);
  const [elementoHoverKey, setElementoHoverKey] = useState<string | null>(null);
  const [progressoCarregadoKey, setProgressoCarregadoKey] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iniciarHover = (id: string, chaveElemento?: string) => {
    setDisciplinaHoverId(id);
    if (chaveElemento) {
      setElementoHoverKey(chaveElemento);
      setProgressoCarregadoKey(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setProgressoCarregadoKey(chaveElemento);
      }, 1000);
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setElementoHoverKey(null);
      setProgressoCarregadoKey(null);
    }
  };

  const cancelarHover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setDisciplinaHoverId(null);
    setElementoHoverKey(null);
    setProgressoCarregadoKey(null);
  };
  const toasts = useToasts();

  /**
   * Limpa a grade na hora e oferece a volta. Antes havia um modal de "tem
   * certeza?" a partir de duas matérias. O desfazer devolve as turmas; as
   * exclusões da Sugestão de Grade, que também são zeradas, ficam zeradas.
   */
  function limparGrade() {
    const anterior = selecao;
    setSelecao([]);
    props.onLimparExclusoes?.();
    if (anterior.length === 0) return;
    avisarRemocao(toasts, {
      chave: "limpar-grade",
      titulo: `Grade ${props.gradeAtiva || "A"} limpa`,
      descricao: `${anterior.length} ${anterior.length === 1 ? "turma removida" : "turmas removidas"}.`,
      desfazer: () => setSelecao(anterior),
    });
  }

  function removerDisciplina(codigo: string) {
    const anterior = selecao;
    setSelecao(selecao.filter((s) => s.codDisciplina !== codigo));
    avisarRemocao(toasts, {
      chave: "remover-turma",
      titulo: `${codigo} saiu da grade`,
      desfazer: () => setSelecao(anterior),
    });
  }
  const [baixandoImagem, setBaixandoImagem] = useState(false);
  const gradeTableRef = useRef<HTMLDivElement>(null);

  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [semestreOrigemSelecionado, setSemestreOrigemSelecionado] = useState<string | null>(null);
  const [gradeOrigemSelecionada, setGradeOrigemSelecionada] = useState<string>("A");
  const [confirmacaoSobreescreverImportacao, setConfirmacaoSobreescreverImportacao] = useState(false);
  const [turnoFiltro, setTurnoFiltro] = useState<"TODOS" | "M" | "T" | "N">("TODOS");

  const itens: ItemGrade[] = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);

  const conflitos = useMemo(() => detectarConflitos(itens), [itens]);
  const porSlot = useMemo(() => {
    const mapa = new Map<string, { item: ItemGrade; cor: string; sala: string | null }[]>();
    itens.forEach((item, i) => {
      for (const h of horariosUnicos(item.turma)) {
        const k = chaveSlot(h);
        const lista = mapa.get(k) ?? [];
        lista.push({ item, cor: CORES[i % CORES.length], sala: h.sala });
        mapa.set(k, lista);
      }
    });
    return mapa;
  }, [itens]);

  const semestresParaImportacao = useMemo(() => {
    if (!props.todasCestasPorSemestre) return [];
    const semestreAtual = props.semestreAtivo || SEMESTRE_CORRENTE;
    const chavesNoStorage = Object.keys(props.todasCestasPorSemestre);
    // vem do curso: uma lista fixa aqui esquece o semestre novo a cada virada
    const conhecidos = props.semestresConhecidos ?? [SEMESTRE_CORRENTE];
    const todas = Array.from(new Set([...conhecidos, ...chavesNoStorage])).filter(
      (s) => s !== semestreAtual && s !== "null" && s !== "undefined"
    );
    return todas
      .map((semestre) => {
        const cesta = props.todasCestasPorSemestre![semestre] || {};
        const abasComDados = Object.entries(cesta)
          .filter(([_, sel]) => Array.isArray(sel) && sel.length > 0)
          .map(([aba, sel]) => ({ aba, selecao: sel }));
        return {
          semestre,
          label: semestre.replace("-", "."),
          abas: abasComDados,
          temDados: abasComDados.length > 0,
        };
      })
      .filter((s) => s.temDados);
  }, [props.todasCestasPorSemestre, props.semestreAtivo]);

  const semOrigem = semestreOrigemSelecionado ?? semestresParaImportacao[0]?.semestre ?? null;
  const semestreObjOrigem = semestresParaImportacao.find((s) => s.semestre === semOrigem);
  const gradeOrigemAba = semestreObjOrigem?.abas.some((a) => a.aba === gradeOrigemSelecionada)
    ? gradeOrigemSelecionada
    : (semestreObjOrigem?.abas[0]?.aba ?? "A");

  const itensPreviewImportacao = useMemo(() => {
    if (!semestreObjOrigem || !props.todasOfertas) return [];
    const abaDados = semestreObjOrigem.abas.find((a) => a.aba === gradeOrigemAba);
    if (!abaDados) return [];
    const ofertaOrigem = props.todasOfertas[semestreObjOrigem.semestre];
    const ofertaAlvo = props.oferta;

    return abaDados.selecao.map((s) => {
      const resolvedOrigem = ofertaOrigem ? itensDaSelecao(ofertaOrigem, [s])[0] : undefined;
      const discOrigem = resolvedOrigem?.disciplina ?? ofertaOrigem?.disciplinas.find((x) => x.codigo === s.codDisciplina);
      const turOrigem = resolvedOrigem?.turma ?? discOrigem?.turmas.find((x) => x.codigo === s.codTurma);

      const codDiscBuscarAlvo = discOrigem?.codigo ?? s.codDisciplina;
      const discAlvo = ofertaAlvo.disciplinas.find((x) => x.codigo === codDiscBuscarAlvo || x.codigo === s.codDisciplina);

      let compativel = false;
      let turmaAlvoCompativel = null;

      const getHorStr = (t: any) => (t?.horarios || []).map((h: any) => `${h.dia}${h.turno}${h.aula}`).sort().join(",");
      const getProfStr = (t: any) => Array.isArray(t?.professores) ? t.professores.slice().sort().join(",") : (t?.professores_raw || "");

      if (discAlvo && turOrigem && turOrigem.horarios && turOrigem.horarios.length > 0) {
        const hOrigemStr = getHorStr(turOrigem);
        const pOrigemStr = getProfStr(turOrigem);

        for (const tAlvo of discAlvo.turmas) {
          const hAlvoStr = getHorStr(tAlvo);
          const pAlvoStr = getProfStr(tAlvo);
          if (hAlvoStr === hOrigemStr && pAlvoStr === pOrigemStr && hAlvoStr.length > 0) {
            compativel = true;
            turmaAlvoCompativel = tAlvo;
            break;
          }
        }
      }
      
      if (!compativel && discAlvo) {
        const codTurmaProcurar = turOrigem?.codTurmaOriginal ?? turOrigem?.codigo ?? s.codTurma;
        const tAlvo = discAlvo.turmas.find((t) => t.codigo === codTurmaProcurar || t.codigo === s.codTurma);
        if (tAlvo) {
          compativel = true;
          turmaAlvoCompativel = tAlvo;
        }
      }

      const horStrDisplay = (turOrigem?.horarios || []).map((h) => `${h.dia}${h.turno}${h.aula}`).join(", ");
      const profStrDisplay = Array.isArray(turOrigem?.professores)
        ? turOrigem.professores.join(", ")
        : (turOrigem?.professores_raw || "A definir");

      return {
        codDisciplina: resolvedOrigem?.selecaoOriginal ? s.codDisciplina : (discOrigem?.codigo ?? s.codDisciplina),
        codTurmaOrigem: s.codTurma,
        codTurmaAlvo: turmaAlvoCompativel?.codigo ?? (resolvedOrigem?.selecaoOriginal ? s.codTurma : (turOrigem?.codigo ?? s.codTurma)),
        nomeDisciplina: discOrigem?.nome || discAlvo?.nome || s.codDisciplina,
        horariosStr: horStrDisplay || "Sem horário",
        professoresStr: profStrDisplay || "A definir",
        compativel,
        existeNoAlvo: !!discAlvo,
      };
    });
  }, [semestreObjOrigem, gradeOrigemAba, props.todasOfertas, props.oferta]);

  function handleExecutarImportacao() {
    const importaveis = itensPreviewImportacao
      .filter((item) => item.compativel)
      .map((item) => ({
        codDisciplina: item.codDisciplina,
        codTurma: item.codTurmaAlvo,
      }));
    props.setSelecao(importaveis);
    setModalImportarAberto(false);
    setConfirmacaoSobreescreverImportacao(false);
  }

  // Semestre encerrado é consulta, não montagem: copiar grade para dentro dele
  // não leva a matrícula nenhuma.
  const semestreDaGrade = chaveSemestre(props.semestreAtivo || props.oferta.semestre);
  const estadoDaGrade = estadoDoSemestre(semestreDaGrade);
  const importacaoBloqueada = estadoDaGrade === "passado";
  // A projeção parte do presente ou do futuro. O semestre de planejamento entra
  // junto: é justamente a grade que se monta para mandar ao simulador.
  const podeEnviarAoSimulador =
    Boolean(props.onEnviarParaSimulador) && estadoDaGrade !== "passado";
  const chavesGrades = props.cestaGrades ? Object.keys(props.cestaGrades).sort() : ["A"];
  const barraAbas = props.cestaGrades && props.onMudarGradeAtiva && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-zinc-500 dark:text-zinc-400">Cenários</span>
        {chavesGrades.map((g) => {
          const ativa = g === (props.gradeAtiva ?? "A");
          const count = (props.cestaGrades![g] ?? []).length;
          return (
            <div key={g} className="group relative flex items-center">
              <button
                onClick={() => props.onMudarGradeAtiva!(g)}
                aria-pressed={ativa}
                className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-9 ${
                  ativa
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
                title={`Simulação Grade ${g}`}
              >
                <span>Grade {g}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ativa ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}>
                  {count}
                </span>
              </button>
              {chavesGrades.length > 1 && props.onRemoverGrade && g !== "A" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemoverGrade!(g);
                  }}
                  aria-label={`Excluir Grade ${g}`}
                  className="ml-1 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-sm font-bold text-white shadow-2xs hover:bg-red-600 sm:absolute sm:-right-1.5 sm:-top-1.5 sm:ml-0 sm:hidden sm:h-4 sm:w-4 sm:rounded-full sm:text-[10px] sm:group-hover:flex"
                  title={`Excluir Grade ${g}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {props.onNovaGrade && chavesGrades.length < 3 && (
          <button
            onClick={props.onNovaGrade}
            className="flex h-11 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 sm:h-9 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
            title="Criar nova Grade alternativa B ou C (+)"
          >
            <span>+ Nova Grade</span>
          </button>
        )}
      </div>
      {semestresParaImportacao.length > 0 && !importacaoBloqueada && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const sIni = semestresParaImportacao[0]?.semestre || null;
              setSemestreOrigemSelecionado(sIni);
              if (sIni) {
                const sObj = semestresParaImportacao.find((x) => x.semestre === sIni);
                setGradeOrigemSelecionada(sObj?.abas[0]?.aba ?? "A");
              }
              setConfirmacaoSobreescreverImportacao(false);
              setModalImportarAberto(true);
            }}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium transition-colors hover:bg-zinc-50 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            title="Importar matérias cadastradas em outros semestres"
          >
            <IconDownload className="h-4 w-4 shrink-0" />
            <span>Importar matérias</span>
          </button>
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-600 cursor-help dark:bg-zinc-700 dark:text-zinc-300"
            title="Ao importar as matérias de outro semestre, só serão importadas as matérias que permaneceram iguais em horário e professor no novo período atual. Cargas e professores mudados não serão importados."
          >
            ?
          </span>
        </div>
      )}
    </div>
  );

  const modaisJSX = (
    <>
      {props.matriz && reviewsLigadas && (
        <>
          <PainelDisciplina
            alvo={turmaRevisada}
            matriz={props.matriz}
            onFechar={() => setTurmaRevisada(null)}
          />
          <PainelProfessor
            alvo={profPainel}
            matriz={props.matriz}
            onFechar={() => setProfPainel(null)}
          />
        </>
      )}

      <ModalGradeMagica
        aberto={modalGradeMagica}
        onFechar={() => setModalGradeMagica(false)}
        perfil={props.perfil ?? null}
        matriz={props.matriz ?? null}
        oferta={props.oferta}
        selecaoAtual={props.selecao}
        onGerarGrade={(s) => {
          props.setSelecao(s);
          setModalGradeMagica(false);
        }}
      />

      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <IconDownload className="h-4 w-4 shrink-0" />
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Importar Matérias de Outro Semestre
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Selecione o período de origem e a grade desejada para copiar para {props.semestreAtivo || SEMESTRE_CORRENTE}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalImportarAberto(false);
                  setConfirmacaoSobreescreverImportacao(false);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 sm:h-8 sm:w-8 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                title="Fechar (ESC)"
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Aviso de regra de compatibilidade */}
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <IconInfo className="text-amber-600 dark:text-amber-400 h-4 w-4 shrink-0" />
                <p className="leading-relaxed">
                  <strong>Regra de compatibilidade:</strong> Só serão importadas as matérias que permaneceram exatamente iguais em horário e professor na oferta de {props.semestreAtivo || SEMESTRE_CORRENTE}. Turmas que sofreram alteração na carga horária, dias/horários ou docente serão sinalizadas como incompatíveis e não serão trazidas.
                </p>
              </div>

              {/* Botões de semestres */}
              <div className="space-y-3">
                <label className="font-display text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  1. Escolha o Semestre de Origem
                </label>
                <div className="flex flex-wrap gap-2">
                  {semestresParaImportacao.map((s) => {
                    const sel = semOrigem === s.semestre;
                    return (
                      <button
                        key={s.semestre}
                        onClick={() => {
                          setSemestreOrigemSelecionado(s.semestre);
                          setGradeOrigemSelecionada(s.abas[0]?.aba ?? "A");
                          setConfirmacaoSobreescreverImportacao(false);
                        }}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold transition-colors cursor-pointer ${
                          sel
                            ? "bg-zinc-900 text-utfpr-400 shadow-sm dark:bg-zinc-800 dark:text-utfpr-300 border-2 border-utfpr-500"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 border-2 border-transparent"
                        }`}
                      >
                        <span>Período {s.label}</span>
                        <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[10px] dark:bg-zinc-700 text-current">
                          {s.abas.length} {s.abas.length === 1 ? "grade" : "grades"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-botões com a opção de grade (A, B, C...) */}
              {semestreObjOrigem && (
                <div className="space-y-3 pt-2 animate-in fade-in duration-150">
                  <label className="font-display text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    2. Escolha a Grade Cadastrada
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {semestreObjOrigem.abas.map((a) => {
                      const sel = gradeOrigemAba === a.aba;
                      return (
                        <button
                          key={a.aba}
                          onClick={() => {
                            setGradeOrigemSelecionada(a.aba);
                            setConfirmacaoSobreescreverImportacao(false);
                          }}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-colors cursor-pointer ${
                            sel
                              ? "bg-utfpr-500 text-zinc-950 shadow-xs font-bold"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>Grade {a.aba}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${sel ? "bg-zinc-950/15 text-zinc-950 font-bold" : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                            {a.selecao.length} matérias
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview Lateral da Grade Selecionada */}
              {semestreObjOrigem && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-display text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      3. Preview das Matérias ({itensPreviewImportacao.length})
                    </label>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {itensPreviewImportacao.filter((x) => x.compativel).length} de {itensPreviewImportacao.length} prontas para importar
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3 space-y-2 dark:border-zinc-800/80 dark:bg-zinc-900/60 divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    {itensPreviewImportacao.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-400 italic">Nenhuma matéria encontrada nesta grade.</p>
                    ) : (
                      itensPreviewImportacao.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                                {item.codDisciplina}
                              </span>
                              <span className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.nomeDisciplina}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span>Turma: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.codTurmaOrigem}</strong></span>
                              <span>·</span>
                              <span>Horário: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.horariosStr}</strong></span>
                              <span>·</span>
                              <span className="truncate max-w-[180px]" title={item.professoresStr}>
                                {<IconUser className="inline h-4 w-4 shrink-0 align-[-0.2em]" />} {item.professoresStr}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center">
                            {item.compativel ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                <span className="inline-flex items-center gap-1"><IconCheck className="h-3.5 w-3.5" />Compatível</span>
                              </span>
                            ) : item.existeNoAlvo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" title={`Esta turma ou matéria mudou de horário/professor no semestre ${props.semestreAtivo || SEMESTRE_CORRENTE}`}>
                                <span>{<IconWarning className="inline h-4 w-4 shrink-0 align-[-0.2em]" />} Mudou no atual</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300" title="Matéria não está sendo ofertada no semestre atual">
                                <span className="flex items-center gap-1"><IconBan className="h-3.5 w-3.5" /> Não ofertada</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com botão de confirmação ou sobreescrita */}
            <div className="border-t border-zinc-200/80 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/80">
              {props.selecao.length > 0 && !confirmacaoSobreescreverImportacao ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start gap-2.5">
                    <IconWarning className="text-amber-600 dark:text-amber-400 h-4 w-4 shrink-0" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-snug">
                      O seu período atual possui matérias preenchidas. Você tem certeza de que quer sobreescrevê-las com a importação?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setModalImportarAberto(false)}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setConfirmacaoSobreescreverImportacao(true)}
                      className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 font-display text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      Sim, Sobreescrever
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setModalImportarAberto(false);
                      setConfirmacaoSobreescreverImportacao(false);
                    }}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecutarImportacao}
                    disabled={itensPreviewImportacao.filter((x) => x.compativel).length === 0}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-xs font-bold transition-colors ${
                      itensPreviewImportacao.filter((x) => x.compativel).length === 0
                        ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                        : "bg-utfpr-500 text-zinc-950 hover:bg-utfpr-400 shadow-sm cursor-pointer"
                    }`}
                  >
                    <span>Confirmar Importação ({itensPreviewImportacao.filter((x) => x.compativel).length} matérias)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );

  if (itens.length === 0) {
    return (
      <div className="space-y-6">
        {barraAbas}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Dica: você pode gerar uma grade ideal automaticamente ou adicionar matérias na aba Matérias Abertas.
          </p>
          <Botao
            variante="primario"
            onClick={props.onAbrirGradeMagica || (() => setModalGradeMagica(true))}
          >
            <IconGrade className="inline h-4 w-4 shrink-0 align-[-0.2em]" /> Sugestão de Grade
          </Botao>
        </div>
        <Card classe="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <IconCalendar className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Sua grade está vazia. Adicione turmas pela aba{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Matérias Abertas</strong>.
            </p>
          </div>
        </Card>
        {modaisJSX}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {barraAbas}
      {conflitos.map((c, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-medium ${
            c.tipo === "choque"
              ? "border-red-300/80 bg-red-50/90 text-red-800 dark:border-red-800/80 dark:bg-red-950/70 dark:text-red-200"
              : "border-amber-300/80 bg-amber-50/90 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/70 dark:text-amber-200"
          }`}
        >
          <IconWarning className="h-4 w-4 shrink-0" />
          <div>
            {c.tipo === "choque" ? "Choque de horário" : "Sedes diferentes no mesmo turno"}:{" "}
            <strong className="font-mono">{c.a.disciplina.codigo}</strong> ×{" "}
            <strong className="font-mono">{c.b.disciplina.codigo}</strong> ({c.detalhe})
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tom="acento" icon={<IconCalendar className="h-3.5 w-3.5" />}>
            {aulasSemanais(itens)} aulas / semana
          </Badge>
          <Badge tom={conflitos.some((c) => c.tipo === "choque") ? "alerta" : "ok"}>
            {conflitos.length === 0 ? "Sem conflitos" : `${conflitos.length} conflito(s) detetado(s)`}
          </Badge>
        </div>
        {/* no celular estes botões passavam de 570px numa tela de 375 e
            arrastavam a página inteira de lado; agora quebram em linhas */}
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <Botao
            variante="primario"
            onClick={() => {
              navigator.clipboard.writeText(relatorioTexto(itens));
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
          >
            {copiado ? (
              <>
                <IconCheck className="h-4 w-4" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <IconCopy className="h-4 w-4" />
                <span>Copiar relatório para a matrícula</span>
              </>
            )}
          </Botao>
          <Botao
            variante="sutil"
            onClick={async () => {
              if (!gradeTableRef.current) return;
              try {
                setBaixandoImagem(true);
                const ehEscuro = document.documentElement.classList.contains("dark");
                const dataUrl = await toPng(gradeTableRef.current, {
                  backgroundColor: ehEscuro ? "#18181b" : "#ffffff",
                  pixelRatio: 2,
                  style: {
                    padding: "16px",
                    borderRadius: "16px",
                  },
                });
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `grade-horaria-${props.oferta.semestre}-${props.gradeAtiva || "A"}.png`;
                a.click();
              } catch (err) {
                console.error("Erro ao gerar imagem PNG:", err);
              } finally {
                setBaixandoImagem(false);
              }
            }}
            title="Baixar imagem PNG da sua grade horária montada"
          >
            <span className="inline-flex items-center gap-1.5">{baixandoImagem ? <IconHourglass className="h-4 w-4 shrink-0" /> : <IconImage className="h-4 w-4 shrink-0" />}<span>{baixandoImagem ? "Gerando imagem" : "Baixar imagem"}</span></span>
          </Botao>
          <Botao
            variante="sutil"
            onClick={props.onAbrirGradeMagica || (() => setModalGradeMagica(true))}
          >
            <IconGrade className="h-4 w-4 shrink-0" />
            <span>Sugestão de Grade</span>
          </Botao>
          {podeEnviarAoSimulador && (
            <Botao
              variante="sutil"
              onClick={props.onEnviarParaSimulador}
              title="Usar esta grade como o semestre de partida do Simulador de Formatura: os semestres seguintes são projetados a partir dela"
            >
              <span className="inline-flex items-center gap-1.5">
                <IconGraduationCap className="h-4 w-4 shrink-0" />
                <span>
                  {props.gradeNoSimulador
                    ? "Atualizar no Simulador de Formatura"
                    : "Enviar ao Simulador de Formatura"}
                </span>
              </span>
            </Botao>
          )}
          <Botao
            variante="perigo"
            onClick={limparGrade}
          >
            <IconTrash className="h-4 w-4" />
            <span>Limpar grade</span>
          </Botao>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Turno</span>
          <div className="flex flex-wrap gap-1.5">
            {(["TODOS", "M", "T", "N"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTurnoFiltro(t)}
                aria-pressed={turnoFiltro === t}
                className={`min-h-11 rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer sm:min-h-8 ${
                  turnoFiltro === t
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {t === "TODOS" ? "Todos" : t === "M" ? "Manhã" : t === "T" ? "Tarde" : "Noite"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="px-1 text-xs font-medium text-zinc-500 sm:hidden dark:text-zinc-400">
        Deslize horizontalmente para ver todos os dias da grade.
      </p>
      <div
        ref={gradeTableRef}
        className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-xs sm:p-4 dark:border-zinc-800/80 dark:bg-zinc-900"
        role="region"
        aria-label="Grade horária com rolagem horizontal"
        tabIndex={0}
      >
        <table className="w-full min-w-[680px] border-collapse bg-white text-xs dark:bg-zinc-900">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-800/50">
              <th className="w-12 border-b border-r border-zinc-200/80 p-2.5 text-center font-mono text-zinc-400 dark:border-zinc-800/80 sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-800">
                Turno
              </th>
              {DIAS.map(([, rot]) => (
                <th
                  key={rot}
                  className="border-b border-l border-zinc-200/80 p-2.5 font-display text-xs font-medium text-zinc-700 dark:border-zinc-800/80 dark:text-zinc-300"
                >
                  {rot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.filter(([turno]) => turnoFiltro === "TODOS" || turno === turnoFiltro).map(([turno, aula]) => {
              const marcoTurno = aula === 1;
              return (
                <tr
                  key={`${turno}${aula}`}
                  className={
                    marcoTurno
                      ? "border-t-2 border-zinc-200 dark:border-zinc-700"
                      : "border-t border-zinc-100 dark:border-zinc-800/50"
                  }
                >
                  <td
                    className="border-r border-zinc-100 bg-zinc-50/90 p-1.5 text-center font-mono font-semibold text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/90 dark:text-zinc-400 sticky left-0 z-10 shadow-xs"
                    title={(() => {
                      const f = faixaDoSlot(turno, aula);
                      return f ? `${f.inicio}–${f.fim}` : undefined;
                    })()}
                  >
                    <div>
                      {turno}
                      {aula}
                    </div>
                    <div className="text-[9px] font-normal leading-tight text-zinc-400">
                      {faixaDoSlot(turno, aula)?.inicio}
                    </div>
                  </td>
                  {DIAS.map(([dia]) => {
                    const ocupantes = porSlot.get(`${dia}${turno}${aula}`) ?? [];
                    return (
                      <td
                        key={dia}
                        className={`h-11 border-l border-zinc-100 p-1 dark:border-zinc-800/60 ${
                          ocupantes.length > 1 ? "bg-red-50/60 ring-2 inset-ring ring-red-500 dark:bg-red-950/30" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {ocupantes.map((o, i) => {
                            const codIdentificador = o.item.selecaoOriginal?.codDisciplina ?? o.item.disciplina.codigo;
                            const codigoCurricular = props.matriz
                              ? disciplinaCanonicaDaOferta(
                                  props.matriz,
                                  o.item.disciplina.codigo,
                                  o.item.disciplina.nome,
                                )?.codigo ?? o.item.disciplina.codigo
                              : o.item.disciplina.codigo;
                            const isHovered =
                              disciplinaHoverId === o.item.disciplina.codigo ||
                              disciplinaHoverId === codIdentificador;

                            return (
                              <div
                                key={i}
                                onMouseEnter={() => iniciarHover(codIdentificador)}
                                onMouseLeave={cancelarHover}
                                className={`group relative flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${o.cor} ${
                                  isHovered
                                    ? "ring-2 ring-zinc-950 dark:ring-white z-40 overflow-visible"
                                    : ""
                                }`}
                                title={`${nomeLegivel(o.item.disciplina.nome)} · ${o.item.turma.codigo}${o.sala ? ` (${o.sala})` : ""}`}
                              >
                                <div className="truncate min-w-0">
                                  <span className="font-mono font-bold">{codigoCurricular}</span>
                                  {o.sala ? ` · ${o.sala}` : ""}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removerDisciplina(codIdentificador);
                                  }}
                                  className={`h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-600 font-mono text-[9px] font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer ${
                                    isHovered ? "flex" : "hidden group-hover:flex"
                                  }`}
                                  title={`Remover ${codIdentificador}`}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {props.exclusoesSugestao &&
        ((props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0) ||
          (props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0) ||
          (props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0) ||
          (props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0)) && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 shadow-sm space-y-1.5 animate-in fade-in">
            <div className="font-display text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <IconInfo className="text-amber-600 dark:text-amber-400 h-4 w-4 shrink-0" /> Observação: Itens excluídos ou filtros na geração via Sugestão de Grade
              </span>
              {props.onLimparExclusoes && (
                <button
                  type="button"
                  onClick={props.onLimparExclusoes}
                  className="text-[11px] font-normal text-zinc-700 hover:underline dark:text-zinc-300 cursor-pointer"
                >
                  ocultar observação
                </button>
              )}
            </div>
            {props.exclusoesSugestao.disciplinas && props.exclusoesSugestao.disciplinas.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Matérias excluídas: </strong>
                {props.exclusoesSugestao.disciplinas.map((d) => `${d.codigo} (${nomeLegivel(d.nome)})`).join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.professores && props.exclusoesSugestao.professores.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Professores excluídos: </strong>
                {props.exclusoesSugestao.professores.join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.trilhas && props.exclusoesSugestao.trilhas.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Trilhas excluídas: </strong>
                {props.exclusoesSugestao.trilhas.map((t) => t.nome).join("; ")}
              </div>
            )}
            {props.exclusoesSugestao.outrosFiltros && props.exclusoesSugestao.outrosFiltros.length > 0 && (
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-100">Filtros/Prioridades aplicados: </strong>
                {props.exclusoesSugestao.outrosFiltros.join("; ")}
              </div>
            )}
          </div>
        )}

      <div className="space-y-2">
        <h3 className="font-display text-sm font-medium tracking-tight text-zinc-500 dark:text-zinc-400">
          Disciplinas selecionadas ({itens.length})
        </h3>
        {/* grid-cols-1 explícito: sem ele a coluna implícita vira max-content e
            um nome longo de disciplina estoura a largura da tela no celular */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {itens.map((item, i) => {
            const discMatriz = props.matriz
              ? disciplinaCanonicaDaOferta(
                  props.matriz,
                  item.disciplina.codigo,
                  item.disciplina.nome,
                )
              : undefined;
            const codigoCurricular = discMatriz?.codigo ?? item.disciplina.codigo;
            const catRaw = discMatriz && props.matriz ? categoriaDe(discMatriz, props.matriz) : "eletiva";
            const catNome =
              catRaw === "obrigatória"
                ? "Obrigatória"
                : catRaw === "2º estrato"
                ? "2º Estrato"
                : catRaw === "humanidades"
                ? "Optativa de Humanidades"
                : catRaw === "eletiva"
                ? "Eletiva"
                : catRaw
                ? catRaw.charAt(0).toUpperCase() + catRaw.slice(1)
                : "Eletiva";

            // A turma inteira é a unidade avaliada: quem divide a mesma turma no
            // mesmo horário é avaliado junto, porque a didática que o aluno viveu
            // é a da dupla. `professores_raw` é o campo completo da fonte (2575
            // das 2618 turmas), então ele vem primeiro.
            const listaProfessores: string[] =
              item.turma.professores_raw?.trim()
                ? item.turma.professores_raw.split(/\s*,\s*/).filter(Boolean)
                : (item.turma.professores ?? []).filter(Boolean);
            const nomesProfessores = listaProfessores.join(", ") || "Professor a definir";

            const codIdentificador = item.selecaoOriginal?.codDisciplina ?? item.disciplina.codigo;
            const chaveElemento = `card-${codIdentificador}-${item.turma.codigo}-${i}`;
            const isHovered = disciplinaHoverId === item.disciplina.codigo || disciplinaHoverId === codIdentificador;
            const isEsteElemento = elementoHoverKey === chaveElemento;
            const progressoPronto = progressoCarregadoKey === chaveElemento;

            return (
              <div
                key={item.selecaoOriginal ? `${item.selecaoOriginal.codDisciplina}-${item.selecaoOriginal.codTurma}` : item.disciplina.codigo}
                onMouseEnter={() => iniciarHover(codIdentificador, chaveElemento)}
                onMouseLeave={cancelarHover}
                // No celular não existe hover: o balão de progresso ficaria
                // inalcançável. Tocar no card abre e fecha o mesmo balão.
                onClick={() => {
                  if (isEsteElemento) {
                    cancelarHover();
                  } else {
                    iniciarHover(codIdentificador, chaveElemento);
                  }
                }}
                className={`relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 shadow-2xs transition-colors ${
                  isHovered
                    ? "border-utfpr-500 bg-utfpr-500/5 ring-1 ring-utfpr-500 dark:border-utfpr-400 dark:bg-utfpr-500/10 scale-[1.01] z-40 overflow-visible"
                    : "border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900"
                }`}
              >
                {isEsteElemento && (
                  <BalaoProgressoHover
                    codigoDisciplina={codigoCurricular}
                    nomeDisciplina={nomeLegivel(item.disciplina.nome)}
                    cargaHoraria={obterCargaHoraria(item.disciplina, props.matriz)}
                    perfil={props.perfil}
                    matriz={props.matriz}
                    posicao="superior"
                    carregando={!progressoPronto}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${CORES[i % CORES.length].split(" ")[0]}`} />
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {nomeLegivel(item.disciplina.nome)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {codigoCurricular}
                        </span>
                        {codigoCurricular !== item.disciplina.codigo && (
                          <span
                            className="rounded bg-zinc-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            title="Código usado pela oferta do semestre e pelo relatório de matrícula"
                          >
                            oferta {item.disciplina.codigo}
                          </span>
                        )}
                        <span>·</span>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Turma {item.turma.codigo}
                        </span>
                        <span className="rounded-full bg-utfpr-500/10 px-2 py-0.5 font-sans text-[10px] font-bold text-utfpr-600 dark:bg-utfpr-500/20 dark:text-utfpr-400">
                          {catNome}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                        <IconUser className="h-4 w-4 shrink-0" />
                        {reviewsLigadas && listaProfessores.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              // o card inteiro alterna o balão de progresso; abrir
                              // o painel não pode disparar isso junto
                              e.stopPropagation();
                              setProfPainel({
                                nomes: listaProfessores,
                                codigo: codigoCurricular,
                                nomeDisciplina: discMatriz?.nome ?? item.disciplina.nome,
                              });
                            }}
                            className="cursor-pointer truncate underline decoration-dotted decoration-utfpr-500 underline-offset-2 transition-colors hover:text-utfpr-600 dark:hover:text-utfpr-400"
                            title={
                              listaProfessores.length > 1
                                ? `Ver avaliações desta turma (${nomesProfessores})`
                                : `Ver avaliações de ${nomesProfessores}`
                            }
                          >
                            {nomesProfessores}
                          </button>
                        ) : (
                          <span className="truncate">{nomesProfessores}</span>
                        )}
                      </div>

                      {reviewsLigadas && listaProfessores.length > 0 && (() => {
                        const professoresRaw = item.turma.professores_raw ?? "";
                        const quantas = reviews.contar(codigoCurricular, professoresRaw);
                        return (
                          <button
                            type="button"
                            disabled={quantas === 0}
                            onClick={(e) => {
                              // o card inteiro alterna o balão de progresso
                              e.stopPropagation();
                              setTurmaRevisada({
                                codigo: codigoCurricular,
                                nome: discMatriz?.nome ?? item.disciplina.nome,
                                professorId: reviews.idDaTurma(professoresRaw),
                                nomeProfessor: nomesProfessores,
                              });
                            }}
                            title={
                              quantas === 0
                                ? "Ainda não há avaliações desta turma"
                                : `Ver ${quantas} avaliação${quantas > 1 ? "ões" : ""} desta turma`
                            }
                            className={`mt-2 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                              quantas === 0
                                ? "cursor-not-allowed border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-600"
                                : "border-utfpr-500/40 bg-utfpr-500/10 text-utfpr-700 hover:bg-utfpr-500/20 dark:text-utfpr-400"
                            }`}
                          >
                            {quantas === 0
                              ? "Sem avaliações"
                              : `${quantas} avaliação${quantas > 1 ? "ões" : ""}`}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  <Botao
                    variante="perigo"
                    onClick={(e?: any) => {
                      // o card inteiro alterna o balão; remover não pode abrí-lo
                      e?.stopPropagation?.();
                      removerDisciplina(codIdentificador);
                    }}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                    <span>remover</span>
                  </Botao>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo visual do Impacto da Grade nas Categorias do Curso */}
      <SecaoResumoImpactoGrade itens={itens} perfil={props.perfil} matriz={props.matriz} />

      {modaisJSX}
    </div>
  );
}

export { TelaGrade as Grade };
