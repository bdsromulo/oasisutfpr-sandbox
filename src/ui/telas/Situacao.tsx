import { useMemo, useState, type ReactNode } from "react";
import type { Matriz, PerfilAluno } from "../../domain/tipos";
import { montarPainel, progressoGlobalDoCurso } from "../../domain/motor/situacao";
import { nomeDeEletiva } from "../../domain/eletivas";
import { Badge, Barra, Botao, Card, Rosca } from "../componentes";
import { IconCheck, IconWarning } from "../icons";
import type { CategoriaCatalogo } from "./Catalogo";
import { ModalEnvioForms } from "./ModalEnvioForms";
import { coletaHabilitada, type AlvoAvaliacao } from "../../domain/reviews/forms";
import { criarAlvoAvaliacao } from "../../domain/reviews/alvos";
import { reviewsHabilitadasPara } from "../../domain/reviews/config";
import { codigosJaAvaliadosPor } from "../../domain/reviews/acervo";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import { CURSOS } from "../../domain/dadosCurso";
import type { AcervoReviews } from "../../domain/reviews/tipos";
import acervoReviews from "../../../data/reviews.json";
import {
  contaNoBlocoOptativo,
  creditaExtensao,
  descricaoDoCurso,
  categoriaSimples,
  ehGrupoOpcao,
  grupoOpcaoDe,
} from "../../domain/cursos";
import { nomeLegivel } from "../textos";

export function renderizarTextoComCodigos(texto: string, matriz: Matriz) {
  const partes = texto.split(/([A-Z]{2,5}\d{1,4}[A-Z]?)/g);
  return partes.map((parte, idx) => {
    const d = matriz.disciplinas.find((dm) => dm.codigo === parte);
    if (d) {
      return (
        <span
          key={idx}
          title={`${d.codigo} · ${nomeLegivel(d.nome)} (${d.periodo ? `${d.periodo}º período` : "Optativa"}) · ${d.horas.total}h`}
          className="cursor-help font-mono font-bold underline decoration-dotted decoration-utfpr-500 underline-offset-2 text-zinc-900 dark:text-zinc-100 hover:text-utfpr-600 dark:hover:text-utfpr-400 transition-colors"
        >
          {parte}
        </span>
      );
    }
    return parte;
  });
}

/**
 * Uma linha da lista de categorias. Antes eram seis cartões em grade, cada um
 * com número grande, barra e um "Exibir Lista". Numa lista só as barras ficam
 * alinhadas e dá para comparar as categorias de relance. A linha inteira abre
 * o catálogo da categoria, então o alvo de toque é a linha, não um link de 16px.
 */
function LinhaProgresso(props: {
  titulo: string;
  cumprido: number;
  exigido: number;
  rodape?: ReactNode;
  concluidas?: { codigo: string; nome: string; cht?: number | null }[];
  categoria: CategoriaCatalogo;
  onAbrirCatalogo?: (cat: CategoriaCatalogo) => void;
  /** substitui a barra contínua (o estágio usa um bloco por etapa) */
  barra?: ReactNode;
  /** substitui o "345 / 2005h" */
  valor?: ReactNode;
  /** substitui o "faltam Xh" */
  situacao?: string;
}) {
  const completo = props.cumprido >= props.exigido && props.exigido > 0;
  const falta = Math.max(0, props.exigido - props.cumprido);

  return (
    <li>
      <button
        type="button"
        onClick={() => props.onAbrirCatalogo?.(props.categoria)}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-5 py-4 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_7.5rem] dark:hover:bg-zinc-800/40 dark:focus-visible:bg-zinc-800/40"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.titulo}</span>
          {props.rodape && (
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{props.rodape}</span>
          )}
        </span>
        <span className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
          {props.barra ?? <Barra valor={props.cumprido} max={props.exigido} classe="h-2" />}
        </span>
        <span className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {props.valor ?? (
              <>
                {props.cumprido}
                <span className="font-normal text-zinc-400"> / {props.exigido}h</span>
              </>
            )}
          </span>
          <span
            className={`mt-0.5 flex items-center justify-end gap-1 text-xs ${
              completo ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {completo && <IconCheck className="h-3.5 w-3.5" />}
            {completo ? "concluído" : (props.situacao ?? `faltam ${falta}h`)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function TelaSituacao(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  onAbrirConfiguracoes?: () => void;
  onAbrirCatalogo?: (cat: CategoriaCatalogo) => void;
}) {
  const { perfil, matriz, onAbrirCatalogo } = props;
  const [avaliando, setAvaliando] = useState<AlvoAvaliacao | null>(null);

  /** O que esta pessoa já avaliou — ver `codigosJaAvaliadosPor` para os limites. */
  const jaAvaliadas = useMemo(() => {
    if (!perfil?.nome) return new Set<string>();
    return codigosJaAvaliadosPor(
      (acervoReviews as AcervoReviews).reviews,
      perfil.nome,
      criarMapaIdentidade(matriz),
    );
  }, [perfil?.nome, matriz]);

  /**
   * Disciplinas do último semestre do histórico — o conjunto que a RF16 convida a
   * avaliar. O semestre vem pronto de `DisciplinaCursada`, sem inferência.
   *
   * O que entra é decidido por `criarAlvoAvaliacao`, no domínio: aprovações e
   * consignações representam conclusão; reprovações continuam fora.
   */
  const doUltimoSemestre = useMemo(() => {
    if (!perfil) return { semestre: null as string | null, itens: [] as AlvoAvaliacao[] };
    const codigosDeEstagio = descricaoDoCurso(matriz).estagios.map((e) => e.codigo);
    const avaliaveis = perfil.cursadas
      .map((c) => criarAlvoAvaliacao(c, matriz, CURSOS, codigosDeEstagio))
      .filter((alvo): alvo is AlvoAvaliacao => alvo !== null);
    if (!avaliaveis.length) return { semestre: null, itens: [] };
    const ultimo = avaliaveis.map((alvo) => alvo.semestre).sort().at(-1)!;
    const itens = avaliaveis
      .filter((alvo) => alvo.semestre === ultimo)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return { semestre: ultimo, itens };
  }, [perfil, matriz]);

  const concluidasMapa = useMemo(() => {
    const mapa: Record<string, { codigo: string; nome: string; cht?: number | null }[]> = {
      obrigatorias: [],
      segundoEstrato: [],
      humanidades: [],
      opcoes: [],
      eletivas: [],
      extensao: [],
    };
    if (!perfil) return mapa;

    for (const c of perfil.cursadas) {
      if (c.situacao !== "aprovado" && c.situacao !== "consignado" && c.situacao !== "dispensado") continue;
      const dm = matriz.disciplinas.find((d) => d.codigo === c.codigo);
      // eletiva de outro curso não está na matriz: o nome vem da pool de eletivas
      const nome = dm ? dm.nome : nomeDeEletiva(c.codigo) ?? c.nome;
      const item = { codigo: c.codigo, nome, cht: c.cht || (dm ? dm.horas.total : null) };

      if (creditaExtensao(matriz, dm)) {
        mapa.extensao.push(item);
      }

      if (c.origem === "obrigatoria" || (dm && dm.conjunto === null)) {
        mapa.obrigatorias.push(item);
      } else if (dm && categoriaSimples(descricaoDoCurso(matriz), dm.conjunto)?.id === "segundoEstrato") {
        mapa.segundoEstrato.push(item);
      } else if (dm && categoriaSimples(descricaoDoCurso(matriz), dm.conjunto)?.id === "humanidades") {
        mapa.humanidades.push(item);
      } else if (dm && ehGrupoOpcao(descricaoDoCurso(matriz), dm.conjunto)) {
        // o crédito é do grupo de topo, não da subárea em que a disciplina está
        const key = String(grupoOpcaoDe(descricaoDoCurso(matriz), dm.conjunto));
        if (!mapa[key]) mapa[key] = [];
        mapa[key].push(item);
        mapa.opcoes.push(item);
      } else if (dm && contaNoBlocoOptativo(descricaoDoCurso(matriz), dm.conjunto)) {
        const key = String(dm.conjunto);
        if (!mapa[key]) mapa[key] = [];
        mapa[key].push(item);
      } else {
        mapa.eletivas.push(item);
      }
    }
    return mapa;
  }, [perfil, matriz]);

  // Os estágios variam por curso: BSI tem dois de 200h, Eng. Comp. um de 400h.
  const estagios = useMemo(() => {
    const doCurso = descricaoDoCurso(matriz).estagios;
    const concluida = (c: { situacao: string }) =>
      c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado";
    return doCurso.map((e) => ({
      ...e,
      feito: Boolean(
        perfil?.cursadas.some(
          (c) =>
            (c.codigo === e.codigo ||
              c.nome.toLowerCase().includes(e.rotulo.toLowerCase())) &&
            concluida(c),
        ),
      ),
    }));
  }, [perfil, matriz]);

  const qtdEstagio = estagios.filter((e) => e.feito).length;

  // Régua única, compartilhada com o Simulador de Formatura: as duas telas
  // respondem "quanto do curso já fiz" e precisam do mesmo número.
  const global = useMemo(() => progressoGlobalDoCurso(perfil, matriz), [perfil, matriz]);
  const horasTotalPPC = global.total;
  const horasAprovadasGlobal = global.cumprido;

  if (!perfil) {
    return (
      <Card titulo="Modo livre, sem histórico importado" classe="p-6 sm:p-8 text-center max-w-2xl mx-auto my-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
          Você está navegando no portal no modo <strong>Grade na Hora (Modo Livre)</strong> sem um histórico escolar do Portal do Aluno atrelado à sua sessão.
          Para visualizar o progresso de horas nos estratos (1º, 2º e 3º), trilhas cumpridas e checagem automática de pré-requisitos, importe seu PDF.
        </p>
        <button
          onClick={props.onAbrirConfiguracoes}
          className="inline-flex items-center gap-2 rounded-xl bg-utfpr-500 px-4 py-2.5 font-display text-xs font-bold text-zinc-950 shadow-xs transition-colors hover:bg-utfpr-400"
        >
          <span>Abrir Configurações e Importar Histórico (PDF)</span>
        </button>
      </Card>
    );
  }

  const painel = montarPainel(perfil, matriz);
  const obr = painel.obrigatorias;

  // A exigência do bloco de trilhas varia por curso: BSI pede 3 trilhas dentro
  // de 345h; Eng. Comp. pede 2 dentro de 270h. Ambos saem da descrição do curso
  // e do conjunto agregador da matriz.
  const cursoDesc = descricaoDoCurso(matriz);
  const totalExigido3Estrato =
    (cursoDesc.agregadorTrilhas
      ? matriz.conjuntos[String(cursoDesc.agregadorTrilhas)]?.ch
      : undefined) ?? 345;
  const somaCumpridoTrilhas =
    painel.blocoOptativo?.cumprido ??
    painel.trilhas.reduce((acc, t) => acc + t.cumprido, 0);
  const trilhasExigidas = cursoDesc.trilhasExigidas;
  const horasExcedentesTrilhas = Math.max(0, somaCumpridoTrilhas - totalExigido3Estrato);
  const exibeBlocoTrilhas = painel.blocoOptativo !== null || painel.trilhas.length > 0;

  return (
    <div className="space-y-8">
      {painel.inconsistencias.map((inc) => (
        <div
          key={inc}
          className="flex items-center gap-2 rounded-xl border border-red-300/80 bg-red-50/80 p-3.5 text-sm font-medium text-red-800 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-200"
        >
          <IconWarning className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{inc}</span>
        </div>
      ))}

      {/* MINI CABEÇALHO COM PERÍODO, CR E PROGRESSO GLOBAL DE HORAS (ITEM 3) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-10">
          <div className="col-span-2 sm:col-span-1">
            <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Período de Referência
            </span>
            <div className="mt-0.5 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {perfil.periodo ? `${perfil.periodo}º Período` : "Em Curso"}
              <span className="ml-2 font-sans text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                ({perfil.ingresso ? `Ingresso: ${perfil.ingresso}` : `Matriz ${matriz.matriz}`})
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          <div className="col-span-2 flex flex-row items-center justify-around gap-4 sm:gap-6 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2 dark:border-zinc-800/80 dark:bg-zinc-800/30 sm:col-span-1 sm:justify-start flex-nowrap whitespace-nowrap overflow-hidden">
            <div>
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                CR Absoluto
              </span>
              <div className="mt-0.5 font-display text-lg font-bold text-zinc-900 dark:text-utfpr-400">
                {perfil.coefAbsoluto?.toFixed(4) ?? "—"}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />

            <div>
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                CR Normalizado
              </span>
              <div className="mt-0.5 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {perfil.coefNormalizado?.toFixed(4) ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-auto lg:shrink-0">
          <Rosca
            valor={horasAprovadasGlobal}
            max={horasTotalPPC}
            tamanho={116}
            espessura={11}
            rotuloCentro="do curso"
            legenda={
              <div>
                <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Progresso Geral do Curso
                </span>
                <div className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {horasAprovadasGlobal}
                  <span className="font-sans text-xs font-semibold text-zinc-400"> / {horasTotalPPC}h</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Faltam {Math.max(0, horasTotalPPC - horasAprovadasGlobal)}h para a integralização
                </p>
              </div>
            }
          />
        </div>
      </div>

      <section
        aria-labelledby="titulo-categorias"
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4 pb-2">
          <h2 id="titulo-categorias" className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Progresso por categoria
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Cada linha abre a lista de matérias</span>
        </div>
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {obr && (
          <LinhaProgresso
            titulo={descricaoDoCurso(matriz).matriz === 981 ? "Obrigatórias (1º estrato)" : "Obrigatórias"}
            cumprido={obr.aprovada}
            exigido={obr.total}
            concluidas={concluidasMapa.obrigatorias}
            categoria="obrigatorias"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape={
              perfil.obrigatoriasFaltantes.length ? (
                <span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {perfil.obrigatoriasFaltantes.length === 1
                      ? "1 pendente:"
                      : `${perfil.obrigatoriasFaltantes.length} pendentes:`}
                  </span>{" "}
                  {renderizarTextoComCodigos(
                    perfil.obrigatoriasFaltantes
                      .slice(0, 3)
                      .map((f) => f.codigo)
                      .join(", "),
                    matriz
                  )}
                  {perfil.obrigatoriasFaltantes.length > 3 && (
                    <span>
                      … e mais {perfil.obrigatoriasFaltantes.length - 3}
                    </span>
                  )}
                </span>
              ) : (
                "Todas as obrigatórias foram concluídas"
              )
            }
          />
        )}
        {painel.segundoEstrato && (
          <LinhaProgresso
            titulo="2º Estrato"
            cumprido={painel.segundoEstrato.cumprido}
            exigido={painel.segundoEstrato.exigido}
            concluidas={concluidasMapa.segundoEstrato}
            categoria="segundoEstrato"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.humanidades && (
          <LinhaProgresso
            titulo="Ciclo de Humanidades"
            cumprido={painel.humanidades.cumprido}
            exigido={painel.humanidades.exigido}
            concluidas={concluidasMapa.humanidades}
            categoria="humanidades"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.opcoes && (
          <LinhaProgresso
            titulo={cursoDesc.rotuloOpcoes ?? "Opções do Curso"}
            cumprido={painel.opcoes.cumprido}
            exigido={painel.opcoes.exigido}
            concluidas={concluidasMapa.opcoes}
            categoria="todas"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape={
              painel.opcoes.gruposCumpridos === painel.opcoes.grupos.length
                ? "Todos os grupos de escolha foram cumpridos"
                : (() => {
                    const abertos = painel.opcoes!.grupos.filter((g) => g.cumprido < g.exigido);
                    return (
                      <span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {painel.opcoes!.gruposCumpridos} de {painel.opcoes!.grupos.length} grupos cumpridos.
                        </span>{" "}
                        <span>
                          Em aberto {abertos.slice(0, 2).map((g) => nomeLegivel(g.nome)).join(", ")}
                          {abertos.length > 2 && ` … e mais ${abertos.length - 2}`}
                        </span>
                      </span>
                    );
                  })()
            }
          />
        )}
        {painel.eletivas && (
          <LinhaProgresso
            titulo="Eletivas"
            cumprido={painel.eletivas.cumprido}
            exigido={painel.eletivas.exigido}
            concluidas={concluidasMapa.eletivas}
            categoria="eletivas"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.extensao && (
          <LinhaProgresso
            titulo="Extensão Universitária"
            cumprido={painel.extensao.cumprido}
            exigido={painel.extensao.exigido}
            concluidas={concluidasMapa.extensao}
            categoria="extensao"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape="Atividades extensionistas registradas no histórico"
          />
        )}
        <LinhaProgresso
          titulo="Estágio Curricular"
          cumprido={qtdEstagio}
          exigido={estagios.length}
          categoria="todas"
          onAbrirCatalogo={onAbrirCatalogo}
          rodape={estagios.map((e) => `${e.rotulo} (${e.ch}h)`).join(" e ") + ", obrigatórios para concluir o curso"}
          valor={
            <>
              {qtdEstagio}
              <span className="font-normal text-zinc-400"> de {estagios.length}</span>
            </>
          }
          situacao={`${estagios.length - qtdEstagio} a fazer`}
          barra={
            <span className="flex gap-1.5">
              {estagios.map((e) => (
                <span
                  key={e.codigo}
                  title={`${e.rotulo} (${e.ch}h)${e.feito ? ", feito" : ""}`}
                  className={`h-2 flex-1 rounded-full ${e.feito ? "bg-utfpr-500" : "bg-zinc-200/80 dark:bg-zinc-800/80"}`}
                />
              ))}
            </span>
          }
        />
        </ul>
      </section>

      {/* BLOCO ÚNICO DE TRILHAS NO MENU PRINCIPAL (ITEM 4). A 978 distribui
          suas optativas em cinco grupos obrigatórios, sem agregador nem piso de
          trilhas validáveis; nesse curso o card correto é o de Opções acima. */}
      {exibeBlocoTrilhas && <section>
        <Card
          classe="p-6 transition-colors hover:border-utfpr-500/40 hover:shadow-md cursor-pointer group bg-white dark:bg-zinc-900 "
        >
          <div
            onClick={() => {
              if (onAbrirCatalogo) onAbrirCatalogo("trilhas");
            }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {cursoDesc.rotuloBlocoTrilhas}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Exigência do curso: validação integral de <strong>{trilhasExigidas} {trilhasExigidas === 1 ? "trilha" : "trilhas distintas"}</strong>, com mínimo de {totalExigido3Estrato}h no total.
                  {cursoDesc.naoValidaveis.length > 0 &&
                    " As optativas isoladas também somam para o total, mas não validam uma trilha."}
                </p>
              </div>
              <Badge
                tom={painel.trilhasValidadas >= trilhasExigidas ? "ok" : "acento"}
                classe="px-3 py-1 text-xs font-bold shrink-0"
              >
                {painel.trilhasValidadas} de {trilhasExigidas} {trilhasExigidas === 1 ? "trilha validada" : "trilhas validadas"}
              </Badge>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {cursoDesc.matriz === 981 ? "Total cursado no estrato:" : "Total cursado no bloco optativo:"}
                  </span>
                  <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {somaCumpridoTrilhas} <span className="font-sans text-xs font-normal text-zinc-400">/ {totalExigido3Estrato}h</span>
                  </span>
                </div>
                <Barra valor={somaCumpridoTrilhas} max={totalExigido3Estrato} />
                {cursoDesc.matriz === 844 &&
                  painel.blocoOptativo?.validado !== undefined && (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {painel.blocoOptativo.validado}h já validadas no histórico.
                      As demais horas aprovadas passam a integralizar o bloco conforme
                      a validação das duas trilhas obrigatórias.
                    </p>
                  )}
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Trilhas Concluídas:</span>
                  <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {painel.trilhasValidadas} <span className="font-sans text-xs font-normal text-zinc-400">/ {trilhasExigidas}</span>
                  </span>
                </div>
                <Barra valor={painel.trilhasValidadas} max={trilhasExigidas} destaque={painel.trilhasValidadas > 0} />
                {painel.trilhas.filter(t => t.validado).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {painel.trilhas.filter(t => t.validado).map(t => (
                      <div key={t.conjunto} className="flex items-center justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded px-1.5 py-0.5">
                        <span className="truncate pr-2" title={nomeLegivel(t.nome)}><IconCheck className="mr-1 inline h-3.5 w-3.5 align-[-0.15em]" />{nomeLegivel(t.nome)}</span>
                        <span className="shrink-0 font-mono">({t.cumprido}/{t.exigido}h)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-zinc-50 p-3 border border-zinc-200/60 dark:bg-zinc-800/50 dark:border-zinc-700/60">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Horas Excedentes / Saldo Extra:
                </span>
                <div className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{horasExcedentesTrilhas}h <span className="font-sans text-xs font-normal text-zinc-400">acima do mínimo</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAbrirCatalogo) onAbrirCatalogo("trilhas");
                }}
                className="inline-flex min-h-11 cursor-pointer items-center px-1 text-sm font-medium text-zinc-700 underline decoration-utfpr-500 decoration-2 underline-offset-4 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                Ver matérias das trilhas
              </button>
            </div>
          </div>
        </Card>
      </section>}

      {/* por enquanto só a BSI 981 expõe a camada de avaliações (§6.10) */}
      {reviewsHabilitadasPara(matriz.matriz) && coletaHabilitada() && doUltimoSemestre.itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Avaliar o semestre {doUltimoSemestre.semestre}
          </h2>
          <Card>
            <p className="mb-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              Sua experiência ajuda quem vai escolher turma. A avaliação é pública e
              assinada com o seu nome; seu RA não é publicado.
            </p>
            {/* Mesmo aviso dos outros dois pontos de entrada da avaliação: o campo
                editado só cobra o preço dias depois, quando a resposta é recusada. */}
            <p className="mb-3 text-xs font-semibold leading-relaxed text-amber-700 dark:text-amber-400">
              O formulário abre com disciplina, semestre, professor e seu nome já
              preenchidos. Não altere esses campos.
            </p>
            <div className="space-y-1.5">
              {doUltimoSemestre.itens.map((d) => (
                <div
                  key={`${d.codigo}-${d.semestre}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70"
                >
                  {/* mesma estrutura de duas linhas do seletor completo: o código
                      inline fazia a altura do item variar com o comprimento do nome */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {d.codigo}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-zinc-700 dark:text-zinc-200">
                      {nomeLegivel(d.nome)}
                    </span>
                  </span>
                  {jaAvaliadas.has(d.codigoCanonico) ? (
                    <span
                      title="Você já avaliou esta disciplina. Para mudar, edite sua resposta no formulário."
                      className="shrink-0 cursor-help rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      <IconCheck className="inline h-3.5 w-3.5 align-[-0.15em]" /> avaliada
                    </span>
                  ) : (
                    <Botao onClick={() => setAvaliando(d)} variante="sutil" classe="shrink-0 !px-3 !py-1.5 !text-xs">
                      Avaliar
                    </Botao>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <ModalEnvioForms
        alvo={avaliando}
        autor={perfil.nome}
        onFechar={() => setAvaliando(null)}
      />

      {perfil.dependencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Disciplinas em Dependência
          </h2>
          <div className="flex flex-wrap gap-2">
            {perfil.dependencias.map((d) => (
              <Badge key={d.codigo} tom="alerta" icon={<IconWarning className="h-3.5 w-3.5" />}>
                <span className="font-mono font-bold cursor-help" title={`${d.codigo} · ${nomeLegivel(d.nome)}`}>
                  {d.codigo}
                </span>{" "}
                {nomeLegivel(d.nome)}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
