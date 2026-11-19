# Guia de interface do Oásis

Regras para desenhar e codar qualquer tela, componente ou texto novo no Oásis. Nasceu do redesign de sobriedade (TASK-67, 18 e 19 de novembro de 2026). O diagnóstico, as medições e o histórico completo ficam em `docs/superpowers/plans/2026-11-18-redesign-sobriedade.md`. Este arquivo é o que sobra de útil para quem vai escrever código depois.

A ideia central cabe em uma frase: **cada pixel precisa informar ou permitir uma ação. O que só enfeita sai.** O Oásis é uma ferramenta de acompanhamento acadêmico usada em PC de laboratório e no celular, perto de matrícula. Precisa parecer confiável, abrir rápido e não gritar.

Vale para humanos e para agentes. Se você é um agente, leia também `REPOSITORIO.md` e `CLAUDE.md`.

## 1. Antes de escrever

1. **Procure o que já existe.** Quase tudo que uma tela nova precisa está em `src/ui/componentes.tsx`, `src/ui/toasts/avisos.ts`, `src/ui/textos.ts`, `src/ui/transicao.ts` e `src/ui/icons.tsx`. Componente novo só se nenhum desses cobre.
2. **Pergunte o que a pessoa quer fazer na tela.** Defina a ação principal. Ela recebe o amarelo. O resto é neutro.
3. **Não tire função.** Sobriedade é menos ruído, não menos recurso. Se um enfeite carrega informação (cor de status, cor por matéria), a informação fica e o enfeite é refeito de forma mais discreta.
4. **Registre.** Feature nova entra em `Tasks.md` antes do código e nasce em branch no sandbox (`REPOSITORIO.md` §5 e §7).

## 2. Proibido (e o teste que pega)

`tests/sobriedade-ui.test.ts` varre `src/ui` e falha se qualquer destes voltar. Comentários são ignorados, então pode citar o vício num comentário.

| Proibido | Faça assim |
|---|---|
| Emoji e símbolos de texto como ícone (`✓ ✕ ⚡ ▲ ▼ ⛔ ⏰`) | Ícone de `src/ui/icons.tsx` (traço 1,5) ou `Chevron`. Estrelas de avaliação são exceção: são a própria nota. |
| Degradê (`bg-gradient-*`, `bg-linear-*`) | Cor sólida. |
| `backdrop-blur` | Fundo opaco. Desfoque é dos efeitos mais caros para a placa de vídeo e engasga PC fraco. |
| `transition-all` | `transition-colors`, ou só a propriedade que muda (largura da barra, traço da rosca). |
| `scale-*` e `brightness-*` no hover ou na seleção | Mudança de cor ou anel. Movimento não informa nada. |
| `font-black`, `font-extrabold` | `font-bold` no máximo. Um peso forte por tela. |
| Sombra e `rounded-2xl` no `Card` base | `Card` é `rounded-xl` e sem sombra. |
| Matérias da grade em tom 400 ou em amarelo | Paleta `CORES` de `Grade.tsx`, tons baixos. Amarelo é da ação principal. |
| Toast com fundo colorido | Fundo neutro, cor só no ícone. |

Não depende de teste, mas vale a mesma disciplina:

- **Sem travessão (`—`) em texto visível.** Use vírgula, ponto ou dois-pontos. Travessão como marca de "valor vazio" numa célula é aceitável.
- **Sem setas decorativas em link** ("Exibir Lista →"). Diga o que o link faz: "Ver matérias das trilhas".
- **Sem faixa colorida à esquerda** em aviso ou citação.
- **Sem sparkles** como ícone de "novo" ou "mágico". Use o ícone do que o botão faz.
- **Sem rótulo em CAIXA ALTA com espaçamento largo.** Texto normal, tamanho legível.
- **Sem marcador de check** em listas de benefício. Lista simples ou numerada.
- **Sem cartões três a três.** Dados comparáveis viram lista alinhada, com a barra e o "faltam Xh" na mesma linha (Minha Situação e Resumo do Impacto).
- **Sem cartão dentro de cartão.** Agrupe por espaço e por filete, não por mais uma caixa.
- **Sem fonte mono em número corrido.** Mono é para código de disciplina.
- **Sem frase de efeito.** Nada de "Não é X, é Y", "Descubra", "Potencialize", "Experiência fluida". Diga o que a tela faz.

## 3. Cor

- **Base neutra.** Página em `zinc-50`, cartões brancos, texto em zinc. Tema escuro equivalente. Todo componente novo precisa estar certo nos dois temas.
- **Amarelo UTFPR é acento, não cor de texto.** No tema claro, amarelo sobre branco dá 1,6:1 e reprova. Use-o em fundo de ação principal, ícone ativo e foco. Não derive cores do nome "Oásis" (`CLAUDE.md`).
- **Um amarelo por tela.** A única ação principal leva o fundo amarelo. Estado ativo de filtro vai em preto, não em amarelo.
- **Cor só quando tem função:** erro (vermelho), conflito de horário, status de disciplina, nós do fluxograma, cor por matéria na grade. Aviso comum é neutro ou âmbar pastel.
- **Texto secundário:** no mínimo `zinc-500` no claro. `zinc-400` sobre branco não passa. Correções de contraste vivem na camada de utilitários de `src/index.css`, para não anular `hover:text-*`.

## 4. Tipografia e números

- Fonte do corpo: Plus Jakarta Sans. Títulos: Outfit. Pesos 400, 500, 600 e 700. Os pesos 800 e 900 não são mais carregados.
- Números são tabulares no site inteiro (já global). Horas, CR e percentuais não dançam. Não desfaça isso.
- Títulos com `text-wrap: balance` e parágrafos com `pretty` já são o padrão global.
- **Nome de disciplina** exibido passa por `nomeLegivel()` (`src/ui/textos.ts`): "Análise e Projeto de Sistemas". O dado da matriz nunca é alterado, só a apresentação. Código de disciplina continua em mono e em maiúsculas.
- Em Situação, códigos dentro de texto corrido passam por `renderizarTextoComCodigos` (tooltip com nome, período e carga).

## 5. Componentes: use estes

Todos em `src/ui/componentes.tsx`, salvo indicação.

| Preciso de | Use | Observação |
|---|---|---|
| Superfície de conteúdo | `Card` | `rounded-xl`, sem sombra, sem reação a hover. Cartão que muda de borda sugere clique onde não há. Se for clicável, use `<button>` ou link por dentro. |
| Botão | `Botao` | `type="button"` por padrão, raio `lg`, sem sombra. |
| Botão só de ícone | `BotaoIconeComDica` | Alvo de 44px e dica de texto. |
| Sub-abas | `AbasSegmentadas` | Um padrão de aba no site inteiro. |
| Etiqueta de status | `Badge` | Retangular e discreta. |
| Progresso | `Barra`, `Rosca` | Animam só largura e traço. |
| Indicar aberto/fechado | `Chevron` | Nunca `▲ ▼`. |
| Esperar carregamento | `CarregadorPontos` | Com `rotulo` dizendo o que carrega. |
| Aviso passageiro | `src/ui/toasts/avisos.ts` | Ver §7. |
| Escolher tela ou disciplina rápido | Menu de comandos (`comandos.ts`, Ctrl+K) | Tela nova entra na lista de comandos. |

Regras de composição:

- **Superfície flutuante** (modal, gaveta, menu, aviso) pode ter sombra e raio maior. **Superfície no fluxo** (cartão, lista) não.
- **Cabeçalho clicável é `<button>`**, nunca `div` com `onClick`. Tem de funcionar com Tab e Enter.
- Um padrão por papel: uma aba, um botão de ícone, um aviso. Se for criar variante, justifique no PR.

## 6. Estrutura e hierarquia da tela

- **Dado antes de moldura.** No celular, o conteúdo útil aparece no primeiro scroll. O cabeçalho é de uma linha. Nada de bloco decorativo antes do dado.
- **Revelação progressiva.** O essencial fica visível, o detalhe abre sob demanda ("Entenda", chevron). Texto de aviso: uma linha direta, explicação completa atrás de um clique.
- **Menos escolhas simultâneas** (Hick). Controles raros agrupam-se (perfil e configurações são um botão só). Não crie um botão novo no cabeçalho sem tirar outro.
- **Gradiente de meta.** Todo progresso mostra quanto falta, não só quanto tem.
- **Lista longa:** adicione a classe `item-lista-longa` aos itens (aplica `content-visibility: auto`). Atenção: ela contém a pintura, então painel `fixed` não pode morar dentro do cartão contido. Renderize-o depois do `</Card>`, como em `PossoCursar.tsx`.
- **Celular:** navegação na barra de abas do rodapé. Elementos flutuantes se posicionam acima dela e respeitam a área segura (`viewport-fit=cover`). Alvos de toque com no mínimo 44px.

## 7. Ações destrutivas: desfazer, não confirmar

- Remover turma, limpar grade, excluir cenário: execute na hora e mostre aviso com **"Desfazer" por 8 segundos** (`avisarRemocao`). Nada de modal "Tem certeza?".
- Toda via de remoção passa pelo mesmo aviso, inclusive atalhos pequenos como o × da célula da grade. Já houve bug por um caminho esquecer.
- Ação que dispara algo externo ou irreversível (abrir o formulário de avaliação, importar savefile) é **idempotente**: ignore o segundo clique (`jaAbriuRef` em `ModalEnvioForms.tsx`).
- Modal e gaveta fecham com o "voltar" do Android: use `useCamadaHistorico` (`src/ui/hooks/`).

## 8. Movimento

- Animação só quando comunica mudança de estado, e curta: 120 a 180ms.
- Só cor, opacidade ou o próprio traço/largura. Nada de escala, balanço, pulso ou anel pulsante. Indicador de novidade é um ponto fixo.
- Troca de aba e sub-aba passa por `comTransicao()` (`src/ui/transicao.ts`, View Transitions). Use-o em navegação nova.
- Prefira `transition` CSS a `@keyframes` para abrir e fechar, porque a transição pode ser interrompida no meio.
- **"Reduzir movimento" do sistema é respeitado.** Qualquer animação nova precisa ficar parada sob `prefers-reduced-motion: reduce` (regra global já existe em `src/index.css`; confira que a sua não a contorna).

## 9. Acessibilidade

- Foco de teclado visível e consistente: o `:focus-visible` amarelo é global. Não use `outline-none` sem substituto.
- Contraste: texto de corpo a 4,5:1 no mínimo, nos dois temas.
- Tudo que se clica é alcançável por Tab e aciona com Enter ou Espaço.
- Ícone sem texto leva `aria-label`.
- Cor nunca é o único sinal. Status de disciplina tem ícone ou palavra junto da cor.
- Busca tolerante a acento e caixa: use `normalizarBusca` (`src/ui/comandos.ts`).
- Teste a tela só com teclado antes de abrir PR.

## 10. Desempenho (PC de laboratório)

- **Meta:** abrir e rolar bem num PC lento. Teste com o Chrome com a CPU limitada a 6x (DevTools, Performance).
- **Bundle:** o teto está em `verificar-bundle` (hoje 300 KiB gzip no JS inicial) e o `npm run build` falha se estourar. Não suba o teto para caber uma feature. Dado grande carrega sob demanda, como as ofertas de turma por curso (`src/domain/ofertas/`). Nunca importe dado de todos os cursos no bundle inicial.
- **Dependência nova** exige justificativa. Gráfico é SVG feito à mão, sem biblioteca. Componente animado pesado de vitrine (estilo Uilora) está fora.
- **Carregando algo?** Mostre `CarregadorPontos` com rótulo, e "Tentar de novo" se a rede falhar. Nunca tela em branco.
- Listas com centenas de itens usam `item-lista-longa` (§6).
- Sem backend e sem service worker por enquanto: este último depende de decidir como não servir oferta velha de semestre (`Tasks.md`, TASK-67).

## 11. Texto da interface

- **Português do Brasil, direto, sem floreio.** Diga o que acontece: "Remover turma" e não "Vamos limpar isso para você".
- **Frases curtas.** Repetição de aviso em faixa e dica é cortada.
- **Estado em linguagem do aluno:** "faltam 90h", "Planejando 2027.1 com turmas prováveis".
- **Honestidade sobre incerteza.** Oferta de semestre futuro é provável, não confirmada, e a interface diz isso.
- **Rótulo de botão é verbo ou o nome do destino.** Nada de "Clique aqui".
- **Erro explica e oferece saída.** "Não conseguimos ler o histórico. Gere o PDF pelo celular no Chrome." Não "Ocorreu um erro".
- **Sem texto de enchimento**: sem "Bem-vindo ao futuro de...", sem depoimento inventado, sem promessa que a tela não cumpre.
- Dados oficiais e vivência ficam separados (`CLAUDE.md`): correção de prática entra como anotação, nunca sobrescrevendo a fonte, e a interface mostra a diferença quando importa.

## 12. Privacidade e confiança

- O histórico escolar é lido **só no navegador**. Nenhuma feature nova envia dado de aluno a lugar nenhum, nem para log.
- Métrica é o GoatCounter, sem cookies. Rastreador novo não entra sem decisão do dono.
- Nunca commitar PDF de histórico, nem nome de aluno em teste. Use o histórico sintético dos testes.

## 13. Checklist de PR de interface

Marque tudo antes de pedir merge no sandbox.

- [ ] `npm test -- --run` e `npm run build` passam, incluindo `tests/sobriedade-ui.test.ts` e o teto de bundle.
- [ ] Nenhum item do §2 (emoji, degradê, blur, `transition-all`, escala, peso 800/900, travessão, seta decorativa).
- [ ] Reaproveitei `Card`, `Botao`, `AbasSegmentadas`, `Badge`, `Chevron`, ícones existentes. Variante nova está justificada.
- [ ] Um único elemento amarelo de ação principal na tela. O resto é neutro.
- [ ] Tema claro e escuro conferidos.
- [ ] Celular (390px) e desktop (1366px) conferidos. Dado útil no primeiro scroll do celular.
- [ ] Teclado: Tab, Enter, foco visível. Com "reduzir movimento" ligado, nada se mexe.
- [ ] Remoção ou ação destrutiva tem "Desfazer", e todos os caminhos passam por ele.
- [ ] Carregamento tem estado visível e erro com "Tentar de novo".
- [ ] Textos revisados: sem travessão, sem frase de efeito, sem repetição.
- [ ] Nenhum dado de aluno sai do navegador.
- [ ] Se a feature mexe em usabilidade, registrada em `Tasks.md` e, se muda arquitetura de informação, em `Estrategia.md`.

## 14. Ao encontrar um vício novo

Se achar um padrão de "cara de IA" que não está aqui, não corrija só a ocorrência:

1. Conte quantos há (`grep` em `src/ui`).
2. Corrija todos.
3. Adicione um contrato em `tests/sobriedade-ui.test.ts`, no mesmo molde dos existentes.
4. Registre a regra neste guia, na tabela do §2.

Assim o vício não volta por copiar e colar.

## 15. Decisões que ficam com o dono

Não implemente sem pedido explícito: trocar a fonte do corpo (a sugestão é a Atkinson Hyperlegible Next, ver plano §3 item 10), páginas de privacidade e termos de uso, capturas reais em "Como usar", momento de conclusão, cantos contínuos (`corner-shape`), service worker e arrastar para fechar gavetas.
