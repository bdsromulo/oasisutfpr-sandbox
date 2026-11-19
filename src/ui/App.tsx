import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useCamadaHistorico } from "./hooks/useCamadaHistorico";
import type { OfertaSemestre, PerfilAluno } from "../domain/tipos";
import { parseHistorico } from "../domain/historico/parser";
import { matriculadasPresumiveis, perfilComPresuncao } from "../domain/motor/presuncao";
import { PainelAprovacaoPresumida } from "./telas/PainelAprovacaoPresumida";
import { VERSAO_NOVIDADES } from "./novidades";
import {
  dadosDoCurso,
  dadosDoCursoPorMatriz,
  carregarOfertasHistoricasMecatronica,
  ofertaDoSemestre,
  semestresDoCurso,
  semestresReaisDoCurso,
} from "../domain/dadosCurso";
import {
  descritorDoSemestre,
  formatarSemestre,
  SEMESTRE_CORRENTE,
  SEMESTRE_PLANEJAMENTO,
  type EstadoSemestre,
} from "../domain/semestres";
import { TelaSituacao } from "./telas/Situacao";
import { TelaPossoCursar } from "./telas/PossoCursar";
import { TelaGrade } from "./telas/Grade";
import { TelaLayoutGNH } from "./telas/LayoutGNH";
import { TelaCatalogo, type CategoriaCatalogo } from "./telas/Catalogo";
import { TelaCheckin, type DadosCheckin } from "./telas/Checkin";
import { TelaConfiguracoes, type Preferencias } from "./telas/Configuracoes";
import { MiniGrade, type PreviewTurma } from "./MiniGrade";
import { ModalGradeMagica } from "./telas/ModalGradeMagica";
import { AbasSegmentadas, Botao, BotaoIconeComDica, CarregadorPontos, Chevron } from "./componentes";
import { SidebarNavegacao, type AbaPrincipal } from "./SidebarNavegacao";
/**
 * O Simulador de Formatura entra sob demanda. Ele carrega a tela, os controles
 * de modelagem e o motor de projeção — o trecho mais pesado do código —, mas só
 * abre com histórico importado e depois de um clique na navegação. Deixá-lo no
 * bundle inicial fazia todo mundo pagar por ele já no primeiro carregamento,
 * inclusive quem só quer olhar as turmas abertas do celular.
 */
const TelaSimuladorFormatura = lazy(() =>
  import("./telas/TelaSimuladorFormatura").then((m) => ({ default: m.TelaSimuladorFormatura })),
);
import { TelaAmigosMatch } from "./telas/TelaAmigosMatch";
import { TelaGestaoInformacao } from "./telas/TelaGestaoInformacao";
import { TelaFluxograma } from "./telas/TelaFluxograma";
import { TelaSobre } from "./telas/TelaSobre";
import { TelaComoUsar } from "./telas/TelaComoUsar";
import { PilulaFaleConosco } from "./telas/Contato";
import { PainelMenuMobile } from "./MenuMobile";
// Direto do módulo de valores, e não das telas: importar dos componentes
// puxaria o Simulador inteiro para o bundle inicial.
import {
  EXCLUSOES_VAZIAS,
  MODELAGEM_VAZIA,
  type ValorExclusoes,
  type ValorModelagem,
} from "./telas/valoresSimulador";
import {
  IconBell,
  IconClipboard,
  IconEye,
  IconHelp,
  IconInfo,
  IconMenu,
  IconMoon,
  IconSettings,
  IconStar,
  IconSun,
  IconWarning,
  LogoUTFPR,
  IconX,
} from "./icons";
import { ModalMinhasAvaliacoes } from "./telas/ModalMinhasAvaliacoes";
import { ModalNovidades } from "./telas/ModalNovidades";
import { AvisoBeta } from "./telas/AvisoBeta";
import { ProvedorToasts, useToasts } from "./toasts/contexto";
import { avisarRemocao } from "./toasts/avisos";
import { PilhaToasts } from "./toasts/PilhaToasts";
import { reviewsHabilitadasPara } from "../domain/reviews/config";
import { coletaHabilitada } from "../domain/reviews/forms";
import {
  criarSavefile,
  desserializarPerfil,
  lerSavefile,
  type SavefileOasis,
} from "../domain/savefile";

declare const __OASIS_BETA__: boolean;

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}

type AbaSituacao = "painel" | "catalogo" | "trilhas";
type AbaPlanejamento = "cursar" | "grade";
type Layout = "oasis" | "gnh";

const CHAVE_PERFIL = "oasis.perfil.v1";
const CHAVE_GRADE = "oasis.grade.v1";
const CHAVE_CESTA = "oasis.cesta_grades.v1";
const CHAVE_GRADE_ATIVA = "oasis.grade_ativa.v1";
const CHAVE_LAYOUT = "oasis.layout.v1";
const CHAVE_PREFS = "oasis.preferencias.v1";
const CHAVE_CHECKIN = "oasis.checkin.v1";
const CHAVE_CESTA_EXCLUSOES = "oasis.cesta_exclusoes.v1";
const CHAVE_CESTAS_POR_SEMESTRE = "oasis.cestas_por_semestre.v2";
const CHAVE_EXCLUSOES_POR_SEMESTRE = "oasis.exclusoes_por_semestre.v2";
// ponteiro (semestre + letra da grade) para a grade do Planejamento que alimenta
// o Simulador de Formatura; a seleção em si continua vindo da cesta, para o
// simulador acompanhar as edições feitas na grade
const CHAVE_GRADE_SIMULADOR = "oasis.grade_simulador.v1";
// Códigos das matérias em curso que o aluno decidiu contar como aprovadas.
// Guardamos SÓ os códigos: gravar o perfil já presumido o tornaria
// indistinguível do real no próximo carregamento, e a suposição deixaria de ser
// reversível.
const CHAVE_PRESUMIDAS = "oasis.materias_presumidas.v1";
// Marca que a virada para o semestre de planejamento já foi aplicada às
// preferências guardadas. Sem ela, quem já usava o site continuaria abrindo no
// semestre que era o padrão quando entrou — 2026.2, cuja matrícula já passou.
const CHAVE_VIRADA = `oasis.virada.${SEMESTRE_PLANEJAMENTO}.v1`;
// Marca que o aviso de novidades já foi lido. Versionada no nome: a próxima
// novidade troca o sufixo e o destaque volta a aparecer para todo mundo, sem
// precisar de lógica de comparação de datas.
// O sufixo beta/release separa o sandbox (bdsromulo.github.io/oasisutfpr-sandbox)
// de qualquer outra project page do mesmo usuário no GitHub Pages — origens
// diferentes já isolam o localStorage do site oficial (domínio próprio via CNAME),
// mas sem o sufixo o sandbox ainda compartilharia a chave com outras project pages
// eventuais em bdsromulo.github.io.
const CHAVE_NOVIDADES = `oasis.novidades_lidas.${VERSAO_NOVIDADES}.${
  __OASIS_BETA__ ? "beta" : "release"
}`;

/**
 * Ponto amarelo de "há novidade". Parado de propósito: o anel pulsante antigo
 * (`animate-ping`) repintava a cada quadro em toda tela, e um sinal que pisca
 * para sempre deixa de ser lido.
 */
function PontoNovidade() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-utfpr-500 ring-2 ring-white dark:ring-zinc-950"
    />
  );
}

// Cores do seletor de período, por estado do semestre. Verde é o que ainda vai
// começar, laranja é o que está acontecendo, cinza é o que já passou — a mesma
// convenção que a tela "Como Usar" descreve.
const CAPSULA_SEMESTRE: Record<EstadoSemestre, string> = {
  planejamento:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
  corrente:
    "border-orange-500/40 bg-orange-500/15 text-orange-700 hover:bg-orange-500/25 dark:text-orange-300",
  passado:
    "border-zinc-400/40 bg-zinc-500/10 text-zinc-600 hover:bg-zinc-500/20 dark:text-zinc-300",
};

const PONTO_SEMESTRE: Record<EstadoSemestre, string> = {
  planejamento: "bg-emerald-500",
  corrente: "bg-orange-500",
  passado: "bg-zinc-400",
};

const OPCAO_SEMESTRE: Record<EstadoSemestre, string> = {
  planejamento: "text-emerald-700 dark:text-emerald-400",
  corrente: "text-orange-600 dark:text-orange-400",
  passado: "text-zinc-600 dark:text-zinc-400",
};

/**
 * Marcação inicial da aprovação presumida: tudo que está em curso AGORA entra
 * marcado. Um histórico emitido em outro semestre já tem nota lançada em algum
 * lugar e não deve ser presumido — nesses casos o painel lista as matérias com
 * um aviso e os marcadores nascem desligados. Perfis antigos guardados no
 * navegador não trazem o semestre; nesses, presumir preserva o comportamento de
 * quem acabou de importar o PDF.
 */
function semearPresumidas(p: PerfilAluno | null): string[] {
  if (!p) return [];
  return matriculadasPresumiveis(p)
    .filter((m) => !m.semestre || m.semestre === SEMESTRE_CORRENTE)
    .map((m) => m.codigo);
}

// A previsão foi validada contra históricos reais da matriz 981 e passou a
// respeitar o mínimo por categoria, os pré-requisitos e a sazonalidade observada
// na oferta — está liberada na navegação lateral.
const SIMULADOR_LIBERADO: boolean = true;

// Modo privado: quando ativo, o histórico é guardado apenas em sessionStorage
// (some ao fechar a aba/navegador) em vez de localStorage — útil em máquina
// compartilhada. As preferências (não sensíveis) seguem em localStorage.
function salvarPerfil(p: PerfilAluno, privado?: boolean) {
  const serial = JSON.stringify({ ...p, aprovadas: [...p.aprovadas] });
  if (privado) {
    sessionStorage.setItem(CHAVE_PERFIL, serial);
    localStorage.removeItem(CHAVE_PERFIL);
  } else {
    localStorage.setItem(CHAVE_PERFIL, serial);
    sessionStorage.removeItem(CHAVE_PERFIL);
  }
}
function lerPerfil(): PerfilAluno | null {
  const bruto = sessionStorage.getItem(CHAVE_PERFIL) ?? localStorage.getItem(CHAVE_PERFIL);
  if (!bruto) return null;
  try {
    const obj = JSON.parse(bruto);
    return { ...obj, aprovadas: new Set(obj.aprovadas) };
  } catch {
    return null;
  }
}

function Aplicacao() {
  const toasts = useToasts();
  const [perfil, setPerfil] = useState<PerfilAluno | null>(lerPerfil);
  const [checkinConcluido, setCheckinConcluido] = useState<boolean>(
    () => localStorage.getItem(CHAVE_CHECKIN) === "true",
  );
  const [aba, setAba] = useState<AbaPrincipal>(() => (lerPerfil() ? "situacao" : "planejamento"));
  const [abaSituacao, setAbaSituacao] = useState<AbaSituacao>("painel");
  const [abaPlanejamento, setAbaPlanejamento] = useState<AbaPlanejamento>("cursar");
  const [categoriaCatalogo, setCategoriaCatalogo] = useState<CategoriaCatalogo>("todas");
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis",
  );
  const [preferencias, setPreferencias] = useState<Preferencias>(() => {
    const padrao: Preferencias = {
      tema: "sistema",
      layout: (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis",
      semestreAtivo: SEMESTRE_PLANEJAMENTO,
    };
    try {
      const salvo: Preferencias | null = JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? "null");
      if (!salvo) return padrao;

      // Virada de semestre, uma vez só. Quem estava no semestre que era o padrão
      // antes da virada não o escolheu — foi colocado nele —, então acompanha a
      // mudança. Quem escolheu um período mais antigo de propósito fica onde
      // está, e quem trocar depois disso também: a marca já terá sido gravada.
      if (!localStorage.getItem(CHAVE_VIRADA)) {
        localStorage.setItem(CHAVE_VIRADA, "true");
        if (!salvo.semestreAtivo || salvo.semestreAtivo === SEMESTRE_CORRENTE) {
          return { ...salvo, semestreAtivo: SEMESTRE_PLANEJAMENTO };
        }
      }
      return salvo;
    } catch {
      return { ...padrao, layout: "oasis" };
    }
  });
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [modalAvaliacoesAberto, setModalAvaliacoesAberto] = useState(false);
  const [modalNovidadesAberto, setModalNovidadesAberto] = useState(false);
  // O realce vale uma vez. Depois de aberto o botão continua lá, porém calado:
  // um destaque permanente vira mobília e deixa de ser notado.
  const [novidadesLidas, setNovidadesLidas] = useState(
    () => localStorage.getItem(CHAVE_NOVIDADES) === "true",
  );

  const abrirNovidades = () => setModalNovidadesAberto(true);
  const fecharNovidades = () => {
    setModalNovidadesAberto(false);
    if (!novidadesLidas) {
      localStorage.setItem(CHAVE_NOVIDADES, "true");
      setNovidadesLidas(true);
    }
  };
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [giAberta, setGiAberta] = useState(false);
  const [sobreAberta, setSobreAberta] = useState(false);
  const [comoUsarAberta, setComoUsarAberta] = useState(false);
  // Com histórico carregado, a matriz detectada no próprio PDF é a fonte de
  // verdade do curso. Isso também corrige sessões antigas salvas como BSI por
  // padrão apesar de conterem um histórico da matriz 844.
  const cursoDoPerfil = dadosDoCursoPorMatriz(perfil?.matriz);
  const cursoAtivo = cursoDoPerfil?.id ?? preferencias.curso ?? "bsi-981";
  const [versaoOfertasMecatronica, setVersaoOfertasMecatronica] = useState(0);
  useEffect(() => {
    let ativo = true;
    void carregarOfertasHistoricasMecatronica()
      .then(() => {
        if (ativo) setVersaoOfertasMecatronica((versao) => versao + 1);
      })
      .catch(() => {
        // Uma falha de rede mantém o placeholder vazio sem derrubar a aplicação.
        // O navegador pode tentar novamente no próximo carregamento da página.
      });
    return () => {
      ativo = false;
    };
  }, []);
  const dadosCurso = useMemo(() => dadosDoCurso(cursoAtivo), [cursoAtivo]);
  const matriz = dadosCurso.matriz;
  const todasOfertas = dadosCurso.ofertas;
  const semestresDisponiveis = useMemo(
    () => semestresDoCurso(dadosCurso),
    [dadosCurso, versaoOfertasMecatronica],
  );

  // o semestre guardado pode ser de outro curso: cai no padrão se não existir
  const semestreAtivo =
    preferencias.semestreAtivo && semestresDisponiveis.includes(preferencias.semestreAtivo)
      ? preferencias.semestreAtivo
      : dadosCurso.semestrePadrao;

  // Num semestre projetado a oferta vem espelhada da real de mesma paridade —
  // `oferta.semestre` continua dizendo de onde as turmas vieram, e é disso que
  // o banner se serve para avisar que o quadro é provável, não publicado.
  const oferta = useMemo<OfertaSemestre>(
    () => ofertaDoSemestre(dadosCurso, semestreAtivo),
    [semestreAtivo, dadosCurso, versaoOfertasMecatronica],
  );
  const semestresReais = useMemo(
    () => semestresReaisDoCurso(dadosCurso),
    [dadosCurso, versaoOfertasMecatronica],
  );
  const descritorSemestre = useMemo(
    () => descritorDoSemestre(semestreAtivo, semestresReais),
    [semestreAtivo, semestresReais],
  );

  // Aprovação presumida: as matérias em curso que o aluno espera passar contam
  // como aprovadas no planejamento. Persistimos só os códigos e derivamos o
  // perfil a cada render — ver CHAVE_PRESUMIDAS.
  const [presumidas, setPresumidas] = useState<string[] | null>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PRESUMIDAS) ?? "null");
      if (Array.isArray(salvo)) return salvo.filter((c) => typeof c === "string");
    } catch {}
    // `null` distingue "ainda não escolheu" de "desmarcou tudo": sem isso, quem
    // já tinha histórico guardado no navegador antes desta versão nunca receberia
    // a marcação padrão, e teria de reimportar o PDF para ganhar o recurso.
    return null;
  });
  useEffect(() => {
    if (presumidas === null) return;
    localStorage.setItem(CHAVE_PRESUMIDAS, JSON.stringify(presumidas));
  }, [presumidas]);
  useEffect(() => {
    if (presumidas === null && perfil) setPresumidas(semearPresumidas(perfil));
  }, [presumidas, perfil]);

  const presumidasEfetivas = useMemo(
    () => presumidas ?? semearPresumidas(perfil),
    [presumidas, perfil],
  );

  const perfilEfetivo = useMemo(
    () => perfilComPresuncao(perfil, presumidasEfetivas, matriz),
    [perfil, presumidasEfetivas, matriz],
  );

  const [preview, setPreview] = useState<PreviewTurma | null>(null);
  const [mobileGradeDrawerAberto, setMobileGradeDrawerAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gradeAtiva, setGradeAtiva] = useState<string>(() => {
    return localStorage.getItem(CHAVE_GRADE_ATIVA) ?? "A";
  });

  const [todasCestasPorSemestre, setTodasCestasPorSemestre] = useState<
    Record<string, Record<string, SelecaoTurma[]>>
  >(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CESTAS_POR_SEMESTRE) ?? "null");
      if (salvo && typeof salvo === "object" && Object.keys(salvo).length > 0) return salvo;
    } catch {}
    // Os semestres abaixo são LITERAIS DE PROPÓSITO e não acompanham a virada.
    // São migrações de storage: a cesta v1 foi gravada quando 2026-1 era o
    // semestre corrente, e a grade v0 quando era 2026-2. Trocá-los por
    // SEMESTRE_CORRENTE arquivaria o planejamento antigo num semestre em que
    // ele nunca existiu — na prática, apagaria a grade de quem migra.
    try {
      const salvoV1 = JSON.parse(localStorage.getItem(CHAVE_CESTA) ?? "null");
      if (salvoV1 && typeof salvoV1 === "object") {
        return { "2026-1": salvoV1 };
      }
    } catch {}
    try {
      const gradeAtual = JSON.parse(localStorage.getItem(CHAVE_GRADE) ?? "[]");
      return { "2026-2": { A: gradeAtual } };
    } catch {
      return { [SEMESTRE_CORRENTE]: { A: [] } };
    }
  });

  const [todasExclusoesPorSemestre, setTodasExclusoesPorSemestre] = useState<
    Record<string, Record<string, any>>
  >(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_EXCLUSOES_POR_SEMESTRE) ?? "null");
      if (salvo && typeof salvo === "object") return salvo;
    } catch {}
    // literal de migração, como acima: as exclusões v1 são de 2026-1
    try {
      const salvoV1 = JSON.parse(localStorage.getItem(CHAVE_CESTA_EXCLUSOES) ?? "null");
      if (salvoV1 && typeof salvoV1 === "object") {
        return { "2026-1": salvoV1 };
      }
    } catch {}
    return { [SEMESTRE_CORRENTE]: {} };
  });

  // Grade do Planejamento escolhida como ponto de partida do Simulador de
  // Formatura. Guardamos só o ponteiro: a seleção é lida da cesta a cada render,
  // então mexer na grade replaneja a projeção sem precisar reimportar.
  const [gradeParaSimulador, setGradeParaSimulador] = useState<{
    semestre: string;
    grade: string;
  } | null>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_GRADE_SIMULADOR) ?? "null");
      return salvo && salvo.semestre && salvo.grade ? salvo : null;
    } catch {
      return null;
    }
  });

  const cestaGrades = useMemo(() => {
    return todasCestasPorSemestre[semestreAtivo] ?? { A: [] };
  }, [todasCestasPorSemestre, semestreAtivo]);

  const gradeDoPlanejamentoParaSimulador = useMemo(() => {
    if (!gradeParaSimulador) return null;
    const sel = todasCestasPorSemestre[gradeParaSimulador.semestre]?.[gradeParaSimulador.grade];
    if (!sel || sel.length === 0) return null;
    return { ...gradeParaSimulador, selecao: sel };
  }, [gradeParaSimulador, todasCestasPorSemestre]);

  // Ritmo e exclusões do Simulador de Formatura vivem aqui, e não como useState
  // dentro da tela: importar uma grade troca de aba de propósito (o aluno vê o
  // resultado na Grade), o que desmonta o simulador — um estado local voltaria
  // ao padrão a cada remontagem e o próximo import silenciosamente ignoraria o
  // ritmo que o aluno tinha acabado de escolher.
  const [ritmoSimulador, setRitmoSimulador] = useState(5);
  const [exclusoesSimulador, setExclusoesSimulador] = useState<ValorExclusoes>(EXCLUSOES_VAZIAS);
  const [modelagemSimulador, setModelagemSimulador] = useState<ValorModelagem>(MODELAGEM_VAZIA);

  const cestaExclusoes = useMemo(() => {
    return todasExclusoesPorSemestre[semestreAtivo] ?? {};
  }, [todasExclusoesPorSemestre, semestreAtivo]);

  const exclusoesAtivas = useMemo(() => {
    return cestaExclusoes[gradeAtiva] ?? null;
  }, [cestaExclusoes, gradeAtiva]);

  const [selecao, setSelecao] = useState<SelecaoTurma[]>(() => {
    return (todasCestasPorSemestre[semestreAtivo] ?? { A: [] })[gradeAtiva] ?? [];
  });

  function setCestaExclusoes(acao: any) {
    setTodasExclusoesPorSemestre((prevTodas) => {
      const atual = prevTodas[semestreAtivo] || {};
      const novo = typeof acao === "function" ? acao(atual) : acao;
      const novoTodas = { ...prevTodas, [semestreAtivo]: novo };
      localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(novoTodas));
      // espelho legado: só o semestre da cesta v1 alimenta a chave antiga
      if (semestreAtivo === "2026-1") {
        localStorage.setItem(CHAVE_CESTA_EXCLUSOES, JSON.stringify(novo));
      }
      return novoTodas;
    });
  }

  useEffect(() => {
    localStorage.setItem(CHAVE_GRADE, JSON.stringify(selecao));
    setTodasCestasPorSemestre((prev) => {
      const cestaAtual = prev[semestreAtivo] || { A: [] };
      if (cestaAtual[gradeAtiva] === selecao) return prev;
      const novaCesta = { ...cestaAtual, [gradeAtiva]: selecao };
      const novoTodas = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(novoTodas));
      // espelho legado: só o semestre da cesta v1 alimenta a chave antiga
      if (semestreAtivo === "2026-1") {
        localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
      }
      return novoTodas;
    });
  }, [selecao, gradeAtiva, semestreAtivo]);

  // Migra o histórico entre localStorage e sessionStorage ao alternar o modo privado.
  useEffect(() => {
    if (perfil) salvarPerfil(perfil, preferencias.privado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencias.privado]);

  function handleMudarGradeAtiva(g: string) {
    setGradeAtiva(g);
    localStorage.setItem(CHAVE_GRADE_ATIVA, g);
    setSelecao(cestaGrades[g] ?? []);
  }

  function handleNovaGrade() {
    const chaves = Object.keys(cestaGrades);
    const abasPossiveis = ["A", "B", "C"];
    const nova = abasPossiveis.find((l) => !chaves.includes(l));
    if (!nova) return;
    const novaCesta = { ...cestaGrades, [nova]: [] };
    setTodasCestasPorSemestre((prev) => {
      const n = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(n));
      return n;
    });
    setCestaExclusoes((prev: any) => ({ ...prev, [nova]: { disciplinas: [], professores: [] } }));
    setGradeAtiva(nova);
    localStorage.setItem(CHAVE_GRADE_ATIVA, nova);
    setSelecao([]);
  }

  function handleRemoverGrade(g: string) {
    if (g === "A") return;
    // Guardados antes de apagar, para o "Desfazer" do aviso. A exclusão era
    // imediata e sem volta: um × de 16px ao lado do nome da grade.
    const semestre = semestreAtivo;
    const removida = cestaGrades[g] ?? [];
    const exclusoesRemovidas = cestaExclusoes[g];
    const eraAtiva = gradeAtiva === g;
    const novaCesta = { ...cestaGrades };
    delete novaCesta[g];
    setTodasCestasPorSemestre((prev) => {
      const n = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(n));
      return n;
    });
    setCestaExclusoes((prev: any) => {
      const n = { ...prev };
      delete n[g];
      return n;
    });
    if (gradeAtiva === g) {
      setGradeAtiva("A");
      localStorage.setItem(CHAVE_GRADE_ATIVA, "A");
      setSelecao(novaCesta["A"] ?? []);
    }
    avisarRemocao(toasts, {
      chave: "remover-grade",
      titulo: `Grade ${g} excluída`,
      descricao:
        removida.length > 0
          ? `${removida.length} ${removida.length === 1 ? "turma estava" : "turmas estavam"} nela.`
          : undefined,
      desfazer: () => {
        setTodasCestasPorSemestre((prev) => {
          const n = { ...prev, [semestre]: { ...(prev[semestre] ?? {}), [g]: removida } };
          localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(n));
          return n;
        });
        if (exclusoesRemovidas) {
          setCestaExclusoes((prev: any) => ({ ...prev, [g]: exclusoesRemovidas }));
        }
        if (eraAtiva) {
          setGradeAtiva(g);
          localStorage.setItem(CHAVE_GRADE_ATIVA, g);
          setSelecao(removida);
        }
      },
    });
  }
  const [modalGradeMagica, setModalGradeMagica] = useState(false);

  // Histórico para navegação com o botão voltar nativo do Android:
  useCamadaHistorico(modalConfigAberto, () => setModalConfigAberto(false), "modalConfigAberto");
  useCamadaHistorico(menuMobileAberto, () => setMenuMobileAberto(false), "menuMobileAberto");
  useCamadaHistorico(giAberta, () => setGiAberta(false), "giAberta");
  useCamadaHistorico(sobreAberta, () => setSobreAberta(false), "sobreAberta");
  useCamadaHistorico(comoUsarAberta, () => setComoUsarAberta(false), "comoUsarAberta");
  useCamadaHistorico(mobileGradeDrawerAberto, () => setMobileGradeDrawerAberto(false), "mobileGradeDrawerAberto");
  useCamadaHistorico(modalGradeMagica, () => setModalGradeMagica(false), "modalGradeMagica");

  // Sincronizar tema no DOM
  useEffect(() => {
    const root = document.documentElement;
    function aplicarTema(t: "sistema" | "claro" | "escuro") {
      if (t === "claro") {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      } else if (t === "escuro") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        const prefereEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefereEscuro) {
          root.classList.add("dark");
          root.style.colorScheme = "dark";
        } else {
          root.classList.remove("dark");
          root.style.colorScheme = "light";
        }
      }
    }
    aplicarTema(preferencias.tema);

    if (preferencias.tema === "sistema") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => aplicarTema("sistema");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [preferencias.tema]);

  // Sincronizar layout na preferência
  useEffect(() => {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(preferencias));
    setLayout(preferencias.layout);
    localStorage.setItem(CHAVE_LAYOUT, preferencias.layout);
  }, [preferencias]);

  // A cada lançamento a chave é versionada. Assim, o aviso abre uma vez para
  // quem já usa o site e também logo após concluir o primeiro cadastro; fechar
  // é o gesto que confirma a leitura neste navegador.
  useEffect(() => {
    if (checkinConcluido && !novidadesLidas) setModalNovidadesAberto(true);
  }, [checkinConcluido, novidadesLidas]);

  async function processarArquivo(arq: File, dados?: DadosCheckin) {
    setCarregando(true);
    setErro(null);
    try {
      const p = await analisarPDFParaPreview(arq);
      // o curso escolhido no check-in precisa ser guardado também neste caminho,
      // senão quem importa o PDF cai sempre na navegação da BSI
      if (dados) {
        setPreferencias((prefs) => ({
          ...prefs,
          campus: dados.campus,
          curso: dados.curso,
          matriz: dados.matriz,
        }));
      }
      confirmarNovoPerfil(p);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function analisarPDFParaPreview(arq: File): Promise<PerfilAluno> {
    // O pdf.js é o maior módulo da aplicação e só é necessário quando o aluno
    // realmente escolhe um PDF. Mantê-lo fora do carregamento inicial reduz o
    // custo de abrir o Oásis, sobretudo em redes móveis.
    const { extrairLinhas } = await import("../domain/historico/extrair-pdf-browser");
    const linhas = await extrairLinhas(await arq.arrayBuffer());
    const p = parseHistorico(linhas.map((l) => l.texto));
    if (!p.nome || p.cursadas.length === 0) {
      throw new Error(
        "Não reconheci este PDF como um Histórico Escolar válido do Portal do Aluno" +
          (p.avisos.length ? ` (${p.avisos[0]})` : ""),
      );
    }
    return p;
  }

  function confirmarNovoPerfil(p: PerfilAluno) {
    const cursoDetectado = dadosDoCursoPorMatriz(p.matriz);
    if (cursoDetectado) {
      setPreferencias((prefs) => ({
        ...prefs,
        curso: cursoDetectado.id,
        matriz: String(cursoDetectado.matriz.matriz),
        // pela lista navegável, e não por `ofertas`: o semestre de planejamento
        // é uma escolha válida e não tem entrada própria lá
        semestreAtivo: semestresDoCurso(cursoDetectado).includes(prefs.semestreAtivo ?? "")
          ? prefs.semestreAtivo
          : cursoDetectado.semestrePadrao,
      }));
    }
    salvarPerfil(p, preferencias.privado);
    setPerfil(p);
    setPresumidas(semearPresumidas(p));
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setAba("situacao");
    setAbaSituacao("painel");
  }

  function exportarSavefile() {
    const savefile = criarSavefile({
      perfil,
      preferencias: {
        campus: preferencias.campus,
        curso: preferencias.curso,
        matriz: preferencias.matriz,
        semestreAtivo: preferencias.semestreAtivo,
      },
      cestasPorSemestre: todasCestasPorSemestre,
      exclusoesPorSemestre: todasExclusoesPorSemestre,
      gradeAtiva,
      gradeParaSimulador,
      ritmoSimulador,
      exclusoesSimulador,
      modelagemSimulador,
      materiasPresumidas: presumidasEfetivas,
    });
    const blob = new Blob([JSON.stringify(savefile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oasis-utfpr-${new Date().toISOString().slice(0, 10)}.oasis.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function analisarSavefile(arquivo: File): Promise<SavefileOasis> {
    return lerSavefile(await arquivo.text());
  }

  function confirmarSavefile(savefile: SavefileOasis) {
    const dados = savefile.dados;
    const perfilImportado = desserializarPerfil(dados.perfil);
    const semestreImportado = dados.preferencias.semestreAtivo ?? SEMESTRE_PLANEJAMENTO;
    const cestasImportadas = dados.cestasPorSemestre;
    const cestasDoSemestre = cestasImportadas[semestreImportado] ?? { A: [] };
    const gradeImportada = cestasDoSemestre[dados.gradeAtiva]
      ? dados.gradeAtiva
      : Object.keys(cestasDoSemestre)[0] ?? "A";

    setPreferencias((atuais) => ({
      ...atuais,
      ...dados.preferencias,
      semestreAtivo: semestreImportado,
    }));
    setPerfil(perfilImportado);
    setPresumidas(dados.materiasPresumidas ?? semearPresumidas(perfilImportado));
    if (perfilImportado) salvarPerfil(perfilImportado, preferencias.privado);
    else {
      localStorage.removeItem(CHAVE_PERFIL);
      sessionStorage.removeItem(CHAVE_PERFIL);
    }
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setTodasCestasPorSemestre(cestasImportadas);
    localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(cestasImportadas));
    setTodasExclusoesPorSemestre(dados.exclusoesPorSemestre);
    localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(dados.exclusoesPorSemestre));
    setGradeAtiva(gradeImportada);
    localStorage.setItem(CHAVE_GRADE_ATIVA, gradeImportada);
    setSelecao(cestasDoSemestre[gradeImportada] ?? []);
    setGradeParaSimulador(dados.gradeParaSimulador);
    if (dados.gradeParaSimulador) {
      localStorage.setItem(CHAVE_GRADE_SIMULADOR, JSON.stringify(dados.gradeParaSimulador));
    } else {
      localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
    }
    setRitmoSimulador(dados.ritmoSimulador);
    setExclusoesSimulador(dados.exclusoesSimulador as ValorExclusoes);
    // savefile anterior a TASK-47 nao tem o campo: cai no padrao inerte
    // Espalhado sobre o padrão, e não substituindo-o: savefile gravado antes de
    // cada alavanca nova não tem o campo dela, e ler `undefined` como se fosse
    // lista quebraria a tela inteira do simulador na importação.
    setModelagemSimulador({
      ...MODELAGEM_VAZIA,
      ...((dados.modelagemSimulador as Partial<ValorModelagem> | undefined) ?? {}),
    });
    setAba(perfilImportado ? "situacao" : "planejamento");
    setAbaSituacao("painel");
    setAbaPlanejamento("cursar");
  }

  // O semestre é um contexto de PLANEJAMENTO, não um modo global do site: ele troca
  // as turmas ofertadas e a cesta de grades em montagem, mas não mexe no histórico,
  // no progresso nem no coeficiente — esses vêm do PDF e são sempre o presente real.
  function mudarSemestre(novoSem: string) {
    setPreferencias({ ...preferencias, semestreAtivo: novoSem });
    const novaCesta = todasCestasPorSemestre[novoSem] || { A: [] };
    const chaves = Object.keys(novaCesta);
    const abaDestino = chaves.includes(gradeAtiva) ? gradeAtiva : chaves[0] || "A";
    setGradeAtiva(abaDestino);
    localStorage.setItem(CHAVE_GRADE_ATIVA, abaDestino);
    setSelecao(novaCesta[abaDestino] || []);
  }

  function handleImportarGradeDoSimulador(semestreDestino: string, gradeDestino: string, novaSelecao: SelecaoTurma[]) {
    setPreferencias((p) => ({ ...p, semestreAtivo: semestreDestino }));
    setTodasCestasPorSemestre((prev) => {
      const cestaAtual = prev[semestreDestino] || { A: [] };
      const novaCesta = { ...cestaAtual, [gradeDestino]: novaSelecao };
      const novoTodas = { ...prev, [semestreDestino]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(novoTodas));
      // espelho legado, como acima
      if (semestreDestino === "2026-1") {
        localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
      }
      return novoTodas;
    });
    setTodasExclusoesPorSemestre((prevTodas) => {
      const atual = prevTodas[semestreDestino] || {};
      const novo = { ...atual, [gradeDestino]: { disciplinas: [], professores: [] } };
      const novoTodas = { ...prevTodas, [semestreDestino]: novo };
      localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(novoTodas));
      // espelho legado, como acima
      if (semestreDestino === "2026-1") {
        localStorage.setItem(CHAVE_CESTA_EXCLUSOES, JSON.stringify(novo));
      }
      return novoTodas;
    });
    setGradeAtiva(gradeDestino);
    localStorage.setItem(CHAVE_GRADE_ATIVA, gradeDestino);
    setSelecao(novaSelecao);
    setAba("planejamento");
    setAbaPlanejamento("grade");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Caminho de volta da importação: a grade montada no Planejamento vira o
   * primeiro semestre do Simulador de Formatura, e os demais semestres passam a
   * ser calculados a partir dela.
   */
  function handleEnviarGradeParaSimulador(semestreOrigem: string, gradeOrigem: string) {
    const ponteiro = { semestre: semestreOrigem, grade: gradeOrigem };
    setGradeParaSimulador(ponteiro);
    localStorage.setItem(CHAVE_GRADE_SIMULADOR, JSON.stringify(ponteiro));
    setAba("simulador");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDescartarGradeDoSimulador() {
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  function handleContinuarSemRegistro(dados: DadosCheckin) {
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    // O check-in escolhe curso e matriz separadamente ("eng-comp" + "962"), mas
    // cada matriz é um curso próprio aqui dentro: sem resolver pela matriz, a
    // 962 cairia nos dados da 844.
    const cursoDaMatriz = dadosDoCursoPorMatriz(Number(dados.matriz))?.id ?? dados.curso;
    setPreferencias((p) => ({
      ...p,
      campus: dados.campus,
      curso: cursoDaMatriz,
      matriz: dados.matriz,
    }));
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    // Modo Livre entra direto no Planejamento: a página precisa começar no topo,
    // e não na posição de rolagem herdada do check-in.
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleLimparDados() {
    localStorage.clear();
    sessionStorage.removeItem(CHAVE_PERFIL);
    setPerfil(null);
    setPresumidas([]);
    setCheckinConcluido(false);
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
    setSelecao([]);
    setPreferencias({ tema: "sistema", layout: "oasis", semestreAtivo: SEMESTRE_PLANEJAMENTO });
    setLayout("oasis");
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    setRitmoSimulador(5);
    setExclusoesSimulador(EXCLUSOES_VAZIAS);
    setModelagemSimulador(MODELAGEM_VAZIA);
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  function handleTrocarUsuario() {
    localStorage.removeItem(CHAVE_PERFIL);
    sessionStorage.removeItem(CHAVE_PERFIL);
    localStorage.removeItem(CHAVE_CHECKIN);
    setPerfil(null);
    setPresumidas([]);
    setCheckinConcluido(false);
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
    setSelecao([]);
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    setRitmoSimulador(5);
    setExclusoesSimulador(EXCLUSOES_VAZIAS);
    setModelagemSimulador(MODELAGEM_VAZIA);
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  // "sistema" segue o SO. O botão do topo sempre oferece o tema oposto ao que
  // está na tela, qualquer que seja a origem dele.
  const temaEscuroAtivo =
    preferencias.tema === "escuro" ||
    (preferencias.tema === "sistema" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // A barra de abas do celular existe sempre que a pessoa está dentro da
  // plataforma. As telas de material do projeto têm o próprio "Voltar".
  const navMobileVisivel =
    (!!perfil || checkinConcluido) && !sobreAberta && !giAberta && !comoUsarAberta;

  const barraGradeMobileVisivel =
    (!!perfil || checkinConcluido) &&
    aba === "planejamento" &&
    abaPlanejamento === "cursar" &&
    !sobreAberta &&
    !giAberta &&
    !comoUsarAberta;

  return (
    <div className={`mx-auto max-w-6xl px-4 pt-4 sm:pt-6 lg:pb-20 ${navMobileVisivel ? "pb-[calc(9rem+env(safe-area-inset-bottom))]" : "pb-[calc(5rem+env(safe-area-inset-bottom))]"}`}>
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-200 pb-4 sm:mb-8 sm:pb-6 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <LogoUTFPR className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold leading-none tracking-tight sm:text-2xl">
              <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
            </h1>
            {/* No celular o rótulo curto cabe numa linha só. O longo quebrava
                em duas e empurrava o conteúdo para baixo. */}
            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
              <span className="sm:hidden">
                {dadosCurso.rotuloCurto} · Matriz {matriz.matriz}
                {perfil && <> · {perfil.periodo}º período</>}
              </span>
              <span className="hidden sm:inline">
                {dadosCurso.rotulo} · Câmpus Curitiba · Matriz {matriz.matriz}
              </span>
            </p>
          </div>
        </div>

        {/* No celular as ações viram um único botão de menu: eram cinco ícones
            de 32px em duas linhas, abaixo do mínimo de toque. O período do aluno
            subiu para a linha do curso, e o cabeçalho cabe numa linha só. */}
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          {/* Só depois do check-in, como no bloco do desktop. Antes disso a
              pessoa ainda não entrou na plataforma para o que mudou fazer
              sentido. */}
          {(!!perfil || checkinConcluido) && (
            <button
              type="button"
              onClick={abrirNovidades}
              aria-label={novidadesLidas ? "Novidades" : "Novidades (há algo novo)"}
              title="O que mudou no Oásis"
              className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <IconBell className="h-5 w-5 shrink-0" />
              {!novidadesLidas && <PontoNovidade />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuMobileAberto(true)}
            aria-label="Abrir menu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <IconMenu className="h-5 w-5 shrink-0" />
          </button>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {/* Controles do cabeçalho visíveis quando já iniciou a plataforma */}
          {(perfil || checkinConcluido) && (
            <>
              {/* Perfil e configurações juntos: a engrenagem é onde se troca o
                  histórico, então fica ao lado de quem ele descreve. */}
              <button
                type="button"
                onClick={() => setModalConfigAberto(true)}
                title="Configurações"
                className="mr-1 flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2 text-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {perfil ? (
                  <span className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                    {perfil.nome.split(" ")[0]}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · {perfil.periodo}º período
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">Modo Livre</span>
                )}
                <IconSettings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </button>

              {/* Um botão só para o tema. Dois ícones lado a lado pediam uma
                  escolha onde só existe "o outro". */}
              <BotaoIconeComDica
                dica={temaEscuroAtivo ? "Usar tema claro" : "Usar tema escuro"}
                onClick={() =>
                  setPreferencias({ ...preferencias, tema: temaEscuroAtivo ? "claro" : "escuro" })
                }
              >
                {temaEscuroAtivo ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
              </BotaoIconeComDica>

              {/* Não depende de avaliações: o modal abre sozinho para todo
                  mundo, e sem o botão não haveria como reabri-lo. */}
              <BotaoIconeComDica dica="Novidades" onClick={abrirNovidades}>
                <span className="relative flex">
                  <IconBell className="h-4 w-4" />
                  {!novidadesLidas && <PontoNovidade />}
                </span>
              </BotaoIconeComDica>

              {/* Avaliar não vive só na tela de progresso: quem quer opinar sobre
                  uma matéria antiga precisa de um caminho direto (RF15). */}
              {perfil && reviewsHabilitadasPara(matriz.matriz) && coletaHabilitada() && (
                <BotaoIconeComDica
                  dica="Avaliar uma disciplina"
                  onClick={() => setModalAvaliacoesAberto(true)}
                >
                  <IconStar className="h-4 w-4" />
                </BotaoIconeComDica>
              )}
            </>
          )}

          {/* Ajuda e "Sobre" valem para qualquer ambiente. São material do
              projeto, então aparecem também antes do check-in. */}
          <BotaoIconeComDica
            dica="Como usar o site"
            onClick={() => {
              setGiAberta(false);
              setSobreAberta(false);
              setComoUsarAberta(true);
            }}
          >
            <IconHelp className="h-4 w-4" />
          </BotaoIconeComDica>

          <BotaoIconeComDica
            dica="Sobre o projeto"
            onClick={() => {
              setGiAberta(false);
              setComoUsarAberta(false);
              setSobreAberta(true);
            }}
          >
            <IconInfo className="h-4 w-4" />
          </BotaoIconeComDica>
        </div>
      </header>

      {/* Antes de qualquer outro aviso e em qualquer tela, inclusive as de
          material do projeto: o beta é o mesmo código do site, e quem chega por
          um link não teria como saber que está numa cópia de teste. */}
      <AvisoBeta />

      {/* Banner do período escolhido. Fica fora do "Sobre", que é material do
          projeto e não do semestre.

          São três estados, não dois. O semestre de planejamento ainda não tem
          PDF publicado e mostra turmas espelhadas — precisa dizer isso em voz
          alta. O corrente tem oferta oficial e consolidada. Os passados não
          merecem faixa nenhuma: quem escolhe um deles sabe o que está fazendo. */}
      {/* Uma linha só, com o detalhe sob demanda. A versão anterior ocupava
          um quarto da tela do celular antes de qualquer conteúdo. O essencial
          (planejamento, turmas prováveis, vão mudar) continua sempre visível. */}
      {descritorSemestre.estado === "planejamento" && !sobreAberta && !comoUsarAberta && (
        <details className="group mb-5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
            <IconClipboard className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span className="min-w-0 flex-1">
              <strong className="font-semibold">Planejando {descritorSemestre.rotulo}</strong>
              <span className="text-zinc-600 dark:text-zinc-400">
                {" "}com turmas prováveis. Turmas, horários e docentes ainda vão mudar.
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-zinc-600 underline decoration-dotted underline-offset-2 dark:text-zinc-400">
              <span className="group-open:hidden">Entenda</span>
              <span className="hidden group-open:inline">Fechar</span>
            </span>
          </summary>
          <p className="border-t border-zinc-200 px-3.5 py-3 pl-10 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            A UTFPR ainda não publicou o PDF de <em>Turmas Abertas</em> de{" "}
            {descritorSemestre.rotulo}. Até lá, a lista de matérias e horários é a oferta real de{" "}
            <strong className="font-semibold">
              {descritorSemestre.ofertaEspelhada
                ? formatarSemestre(descritorSemestre.ofertaEspelhada)
                : "um semestre de mesma paridade"}
            </strong>
            , o último semestre de mesma paridade. Serve para ensaiar a matrícula, mas a oferta
            oficial vai trazer outras turmas.
          </p>
        </details>
      )}

      {descritorSemestre.estado === "corrente" && !sobreAberta && !comoUsarAberta && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <IconClipboard className="mt-0.5 h-4 w-4 shrink-0 text-orange-700 dark:text-orange-400" />
          <p className="leading-relaxed">
            <strong className="font-semibold">Semestre corrente: {descritorSemestre.rotulo}.</strong>{" "}
            A matrícula já passou e estas turmas são a oferta oficial. Para montar a grade do
            próximo semestre, troque o período em <em>Montando grade para</em>.
          </p>
        </div>
      )}

      {/* Como Usar, Sobre e Gestão da Informação são material do projeto, não do
          aluno: abrem em qualquer ambiente, sem exigir histórico nem sessão. */}
      {comoUsarAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setComoUsarAberta(false)}>
            <Chevron aberto={false} classe="rotate-90" />
            <span>Voltar</span>
          </Botao>
          <TelaComoUsar />
        </div>
      ) : sobreAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setSobreAberta(false)}>
            <Chevron aberto={false} classe="rotate-90" />
            <span>Voltar</span>
          </Botao>
          <TelaSobre
            onAbrirGestaoInformacao={() => {
              setSobreAberta(false);
              setGiAberta(true);
            }}
          />
        </div>
      ) : giAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setGiAberta(false)}>
            <Chevron aberto={false} classe="rotate-90" />
            <span>Voltar ao início</span>
          </Botao>
          <TelaGestaoInformacao />
        </div>
      ) : !perfil && !checkinConcluido ? (
        /* Se não tem perfil nem fez checkin (ou trocou de usuário), mostra Checkin */
        <TelaCheckin
          onProcessarArquivo={processarArquivo}
          onAnalisarSavefile={analisarSavefile}
          onConfirmarSavefile={confirmarSavefile}
          onContinuarSemRegistro={handleContinuarSemRegistro}
          onAbrirGestaoInformacao={() => setGiAberta(true)}
          carregando={carregando}
          erro={erro}
        />
      ) : (
        // Empilha no celular e vira duas colunas no desktop. `SidebarNavegacao`
        // devolve DOIS elementos: o aside do desktop e a barra de abas do
        // mobile. Numa linha flex, essa barra virava uma coluna ao lado do
        // conteúdo e espremia a coluna principal a zero pixel — a página
        // inteira passava a rolar de lado no celular.
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
          {/* Menu Lateral (Sidebar Desktop / Mobile Drawer) */}
          <SidebarNavegacao
            abaAtiva={aba}
            onSelecionarAba={(novaAba) => {
              if (novaAba === "situacao" && !perfil) setAbaSituacao("catalogo");
              setAba(novaAba);
            }}
            temPerfil={!!perfil}
            qtdTurmasSelecao={selecao.length}

          />

          {/* coluna principal */}
          <div className="min-w-0 flex-1 w-full">
            {perfil && perfil.avisos.length > 0 && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Observações na leitura do documento:</span>{" "}
                  {perfil.avisos.join("; ")}
                </div>
              </div>
            )}

            {aba === "situacao" && (
              <div className="space-y-6">
                {/* Sub-navegação em Minha Situação: Resumo, Catálogo e Trilhas */}
                <AbasSegmentadas
                  rotulo="Seções de Minha Situação"
                  valor={abaSituacao}
                  onMudar={setAbaSituacao}
                  opcoes={[
                    { id: "painel", rotulo: "Painel geral" },
                    { id: "catalogo", rotulo: "Catálogo" },
                    { id: "trilhas", rotulo: "Árvore e trilhas" },
                  ]}
                />

                {/* Antes do painel, e não depois: o que ele mostra já leva a
                    presunção em conta, e quem não souber disso lê os números
                    achando que são só o histórico. */}
                {abaSituacao === "painel" && perfil && (
                  <PainelAprovacaoPresumida
                    perfil={perfil}
                    matriz={matriz}
                    presumidas={presumidasEfetivas}
                    onMudar={setPresumidas}
                  />
                )}

                {abaSituacao === "painel" && (
                  <TelaSituacao
                    perfil={perfilEfetivo}
                    matriz={matriz}
                    onAbrirConfiguracoes={() => setModalConfigAberto(true)}
                    onAbrirCatalogo={(cat) => {
                      setCategoriaCatalogo(cat);
                      setAbaSituacao("catalogo");
                    }}
                  />
                )}

                {abaSituacao === "catalogo" && (
                  <TelaCatalogo
                    perfil={perfilEfetivo}
                    matriz={matriz}
                    oferta={oferta}
                    categoriaInicial={categoriaCatalogo}
                    onVoltar={() => setAbaSituacao("painel")}
                  />
                )}

                {abaSituacao === "trilhas" && (
                  <TelaFluxograma
                    matriz={matriz}
                    perfil={perfilEfetivo}
                    ofertas={semestresDisponiveis.map((sem) => todasOfertas[sem]).filter(Boolean)}
                  />
                )}
              </div>
            )}

            {aba === "planejamento" && (
              <div className="space-y-6">
                {/* Contexto de matrícula: o período escolhido vale para as turmas
                    listadas e para a grade em montagem, e só para isso. A cor do
                    seletor diz o estado do semestre (verde vai começar, laranja
                    está acontecendo, cinza já passou). */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <label
                    htmlFor="seletor-semestre"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Montando grade para
                  </label>
                  <span
                    className={`relative inline-flex items-center rounded-lg border transition-colors ${CAPSULA_SEMESTRE[descritorSemestre.estado]}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${PONTO_SEMESTRE[descritorSemestre.estado]}`}
                    />
                    <select
                      id="seletor-semestre"
                      value={semestreAtivo}
                      onChange={(e) => mudarSemestre(e.target.value)}
                      title="Período letivo usado para listar turmas e montar a grade"
                      className="min-h-9 cursor-pointer appearance-none bg-transparent py-1 pl-6 pr-8 text-sm font-semibold text-current focus:outline-none max-sm:min-h-11"
                    >
                      {semestresDisponiveis.map((sem) => {
                        const d = descritorDoSemestre(sem, semestresReais);
                        return (
                          <option
                            key={sem}
                            value={sem}
                            className={`bg-white dark:bg-zinc-900 ${OPCAO_SEMESTRE[d.estado]}`}
                          >
                            {d.rotulo} ({d.rotuloEstado})
                          </option>
                        );
                      })}
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 12 12"
                      className="pointer-events-none absolute right-2.5 h-3 w-3 opacity-70"
                    >
                      <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <p className="w-full text-xs text-zinc-500 sm:w-auto dark:text-zinc-400">
                    Vale para as turmas e a grade. Histórico e coeficiente seguem no período atual.
                  </p>
                </div>

                {/* As duas metades do Planejamento. A contagem fica ao lado do
                    rótulo, em cinza: é informação, não chamada para ação. */}
                <AbasSegmentadas
                  rotulo="Seções do Planejamento"
                  valor={abaPlanejamento}
                  onMudar={setAbaPlanejamento}
                  opcoes={[
                    {
                      id: "cursar",
                      rotulo: "Matérias abertas",
                      contagem: oferta.disciplinas.reduce((acc, d) => acc + d.turmas.length, 0),
                    },
                    { id: "grade", rotulo: "Minha grade", contagem: selecao.length },
                  ]}
                />

                {abaPlanejamento === "cursar" ? (
                  (preferencias.layout ?? layout) === "gnh" ? (
                    <TelaLayoutGNH
                      perfil={perfilEfetivo}
                      matriz={matriz}
                      oferta={oferta}
                      selecao={selecao}
                      setSelecao={setSelecao}
                      onPreview={setPreview}
                      onAbrirMobilePreview={(p) => {
                        setPreview(p);
                        setMobileGradeDrawerAberto(true);
                      }}
                      filtrarConflitos={preferencias.filtrarConflitos}
                      onAbrirGradeMagica={() => setModalGradeMagica(true)}
                    />
                  ) : (
                    <TelaPossoCursar
                      perfil={perfilEfetivo}
                      matriz={matriz}
                      oferta={oferta}
                      selecao={selecao}
                      setSelecao={setSelecao}
                      onPreview={setPreview}
                      onAbrirMobilePreview={(p) => {
                        setPreview(p);
                        setMobileGradeDrawerAberto(true);
                      }}
                      filtrarConflitos={preferencias.filtrarConflitos}
                      onAbrirGradeMagica={() => setModalGradeMagica(true)}
                    />
                  )
                ) : (
                  <TelaGrade
                    oferta={oferta}
                    selecao={selecao}
                    setSelecao={setSelecao}
                    cestaGrades={cestaGrades}
                    gradeAtiva={gradeAtiva}
                    onMudarGradeAtiva={handleMudarGradeAtiva}
                    onNovaGrade={handleNovaGrade}
                    onRemoverGrade={handleRemoverGrade}
                    perfil={perfilEfetivo}
                    matriz={matriz}
                    onAbrirGradeMagica={() => setModalGradeMagica(true)}
                    exclusoesSugestao={exclusoesAtivas}
                    onLimparExclusoes={() => {
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                    todasCestasPorSemestre={todasCestasPorSemestre}
                    semestreAtivo={semestreAtivo}
                    semestresConhecidos={semestresReais}
                    todasOfertas={todasOfertas}
                    onEnviarParaSimulador={
                      SIMULADOR_LIBERADO && perfil
                        ? () => handleEnviarGradeParaSimulador(semestreAtivo, gradeAtiva)
                        : undefined
                    }
                    gradeNoSimulador={
                      gradeParaSimulador?.semestre === semestreAtivo &&
                      gradeParaSimulador?.grade === gradeAtiva
                    }
                  />
                )}
              </div>
            )}

            {aba === "simulador" && SIMULADOR_LIBERADO && perfil && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <CarregadorPontos classe="text-utfpr-600 dark:text-utfpr-500" />
                    Carregando o Simulador de Formatura
                  </div>
                }
              >
              <TelaSimuladorFormatura
                perfil={perfilEfetivo}
                perfilReal={perfil}
                presumidas={presumidasEfetivas}
                onMudarPresumidas={setPresumidas}
                matriz={matriz}
                ofertas={semestresDisponiveis.map((sem) => todasOfertas[sem]).filter(Boolean)}
                semestreAtivo={semestreAtivo}
                todasCestasPorSemestre={todasCestasPorSemestre}
                onImportarGrade={handleImportarGradeDoSimulador}
                gradeDoPlanejamento={gradeDoPlanejamentoParaSimulador}
                onUsarGradeDoPlanejamento={handleEnviarGradeParaSimulador}
                onDescartarGradeDoPlanejamento={handleDescartarGradeDoSimulador}
                ritmo={ritmoSimulador}
                onMudarRitmo={setRitmoSimulador}
                exclusoes={exclusoesSimulador}
                onMudarExclusoes={setExclusoesSimulador}
                modelagem={modelagemSimulador}
                onMudarModelagem={setModelagemSimulador}
              />
              </Suspense>
            )}

            {/* Perfil cru: o match compara históricos reais entre pessoas, e
                uma suposição minha não pode entrar na conta de outra. */}
            {aba === "match" && (
              <TelaAmigosMatch
                perfil={perfil}
                selecao={selecao}
                oferta={oferta}
                matriz={matriz}
                onAdicionarOuTrocarTurma={(codDisciplina, codTurma) => {
                  setSelecao((prev) => {
                    const semEssa = prev.filter((i) => i.codDisciplina !== codDisciplina);
                    return [...semEssa, { codDisciplina, codTurma }];
                  });
                }}
              />
            )}
          </div>

          {/* sidebar de feedback contínuo: visível na aba de Planejamento/Posso Cursar */}
          {aba === "planejamento" && abaPlanejamento === "cursar" && (
            <aside className="sticky top-4 self-start hidden w-60 shrink-0 lg:block">
              <MiniGrade
                oferta={oferta}
                semestreAtivo={semestreAtivo}
                selecao={selecao}
                preview={preview}
                perfil={perfilEfetivo}
                matriz={matriz}
                onLimpar={() => {
                  setSelecao([]);
                  setCestaExclusoes((prev: any) => {
                    const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                    return n;
                  });
                }}
                cestaGrades={cestaGrades}
                gradeAtiva={gradeAtiva}
                onMudarGradeAtiva={handleMudarGradeAtiva}
                onNovaGrade={handleNovaGrade}
                onRemoverGrade={handleRemoverGrade}
                onRemoverTurma={(codigo) =>
                  setSelecao((s) => s.filter((item) => item.codDisciplina !== codigo))
                }
                exclusoesSugestao={exclusoesAtivas}
                onLimparExclusoes={() => {
                  setCestaExclusoes((prev: any) => {
                    const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                    return n;
                  });
                }}
              />
            </aside>
          )}
        </div>
      )}

      {/* Modal Sugestão de Grade unificado para todo o Planejamento */}
      <ModalGradeMagica
        aberto={modalGradeMagica}
        onFechar={() => setModalGradeMagica(false)}
        perfil={perfilEfetivo}
        matriz={matriz}
        oferta={oferta}
        selecaoAtual={selecao}
        onGerarGrade={(s, meta) => {
          setSelecao(s);
          if (meta) {
            setCestaExclusoes((prev: any) => {
              const n = { ...prev, [gradeAtiva]: meta };
              return n;
            });
          }
          setModalGradeMagica(false);
          setAbaPlanejamento("grade");
        }}
      />

      {/* Apresentação do sistema de avaliações. "Avaliar" só existe com
          histórico, que é o que prova ter cursado a matéria. */}
      <ModalNovidades
        aberto={modalNovidadesAberto}
        onFechar={fecharNovidades}
        onAvaliar={
          perfil && coletaHabilitada() ? () => setModalAvaliacoesAberto(true) : undefined
        }
      />

      {/* Modal de Configurações Centralizadas (TASK-01) */}
      <TelaConfiguracoes
        aberto={modalConfigAberto}
        onFechar={() => setModalConfigAberto(false)}
        preferencias={preferencias}
        onSalvarPreferencias={setPreferencias}
        perfil={perfil}
        onAtualizarPDF={processarArquivo}
        onAnalisarPDF={analisarPDFParaPreview}
        onConfirmarPDF={confirmarNovoPerfil}
        onExportarSavefile={exportarSavefile}
        onAnalisarSavefile={analisarSavefile}
        onConfirmarSavefile={confirmarSavefile}
        onTrocarUsuario={handleTrocarUsuario}
        onLimparDados={handleLimparDados}
        carregandoPDF={carregando}
      />

      <ModalMinhasAvaliacoes
        aberto={modalAvaliacoesAberto}
        perfil={perfil}
        matriz={matriz}
        onFechar={() => setModalAvaliacoesAberto(false)}
      />

      {/* Barra flutuante inferior para mobile e Bottom Sheet (Gaveta).
          Sobre e Gestão da Informação substituem o conteúdo principal: a barra
          de grade não pode ficar flutuando por cima delas. */}
      {barraGradeMobileVisivel && (
        <>
          <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 lg:hidden">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-900/90 p-3.5 px-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950/90 text-white">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold">Grade {gradeAtiva}</span>
                  <span className="rounded-full bg-utfpr-500/20 px-2 py-0.5 font-mono text-xs font-bold text-utfpr-400">
                    {selecao.length} {selecao.length === 1 ? "turma" : "turmas"}
                  </span>
                </div>
                {preview ? (
                  <span className="truncate text-xs font-semibold text-amber-400">
                    {<IconEye className="inline h-4 w-4 shrink-0 align-[-0.2em]" />} Espiando {preview.turma.codigo} ({preview.disciplina.codigo})
                  </span>
                ) : (
                  <span className="truncate text-xs text-zinc-400">
                    Toque para inspecionar grade
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileGradeDrawerAberto(true)}
                className="ml-3 min-h-11 shrink-0 cursor-pointer rounded-xl bg-utfpr-500 px-4 py-2 font-display text-xs font-bold text-zinc-950 shadow-md transition-colors hover:bg-utfpr-400"
              >
                {preview ? "Ver Preview" : "Abrir Grade"}
              </button>
            </div>
          </div>

          {mobileGradeDrawerAberto && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
              <div
                className="fixed inset-0 bg-black/60 transition-opacity"
                onClick={() => {
                  setMobileGradeDrawerAberto(false);
                  if (preview) setPreview(null);
                }}
              />
              <div className="relative z-10 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-3xl border-t border-zinc-200/80 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 mb-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                      Mini-Grade no Celular
                    </h3>
                    {preview && (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                        Espiando
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar mini-grade"
                    onClick={() => {
                      setMobileGradeDrawerAberto(false);
                      if (preview) setPreview(null);
                    }}
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pb-6">
                  <MiniGrade
                    oferta={oferta}
                    semestreAtivo={semestreAtivo}
                    selecao={selecao}
                    preview={preview}
                    perfil={perfilEfetivo}
                    matriz={matriz}
                    onLimpar={() => {
                      setSelecao([]);
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                    cestaGrades={cestaGrades}
                    gradeAtiva={gradeAtiva}
                    onMudarGradeAtiva={handleMudarGradeAtiva}
                    onNovaGrade={handleNovaGrade}
                    onRemoverGrade={handleRemoverGrade}
                    onRemoverTurma={(codigo) =>
                      setSelecao((s) => s.filter((item) => item.codDisciplina !== codigo))
                    }
                    exclusoesSugestao={exclusoesAtivas}
                    onLimparExclusoes={() => {
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="mt-20 border-t border-zinc-200/80 pt-6 pb-24 text-center text-xs text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500">
        Projeto acadêmico independente, feito por e para estudantes da UTFPR. Não é um site oficial, então confira seus dados no Portal do Aluno.
      </footer>

      {/* contato sempre à mão, em qualquer tela da plataforma */}
      <PilulaFaleConosco barraGradeMobileAtiva={barraGradeMobileVisivel} navMobileAtiva={navMobileVisivel} />

      <PainelMenuMobile
        aberto={menuMobileAberto}
        onFechar={() => setMenuMobileAberto(false)}
        temaAtivo={preferencias.tema}
        onMudarTema={(t) => setPreferencias({ ...preferencias, tema: t })}
        mostrarConfiguracoes={!!perfil || checkinConcluido}
        mostrarAvaliar={
          !!perfil && reviewsHabilitadasPara(matriz.matriz) && coletaHabilitada()
        }
        onAvaliar={() => setModalAvaliacoesAberto(true)}
        onAbrirConfiguracoes={() => setModalConfigAberto(true)}
        onAbrirComoUsar={() => {
          setGiAberta(false);
          setSobreAberta(false);
          setComoUsarAberta(true);
        }}
        onAbrirSobre={() => {
          setGiAberta(false);
          setComoUsarAberta(false);
          setSobreAberta(true);
        }}
      />

      {/* A pilha de avisos fecha a árvore: fica acima de tudo e sobe quando a
          barra de grade flutuante do mobile está na tela. */}
      <PilhaToasts acimaDaBarraMobile={barraGradeMobileVisivel} acimaDaNavMobile={navMobileVisivel} />
    </div>
  );
}

/**
 * O provedor de avisos envolve a aplicação inteira, e não só o Planejamento:
 * choque de turma nasce no Planejamento, mas os avisos da projeção nascem no
 * Simulador, e ambos publicam na mesma pilha.
 */
export function App() {
  return (
    <ProvedorToasts>
      <Aplicacao />
    </ProvedorToasts>
  );
}
