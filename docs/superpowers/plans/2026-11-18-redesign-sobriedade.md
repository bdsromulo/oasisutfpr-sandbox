# Redesign de sobriedade do Oásis (TASK-67)

Plano para deixar o Oásis mais sóbrio, mais leve em computador fraco e no celular, e sem os vícios visuais que fazem um site parecer gerado por IA. A regra que vale para tudo é não tirar função. Cada tela continua fazendo o que faz hoje, com outra roupa e menos ruído.

Branch de trabalho `redesign-sobriedade`, criada a partir da `main` do sandbox.

## 1. O que o diagnóstico encontrou

Medido no código e em capturas de tela no desktop (1366px) e no celular (390px), com o histórico sintético dos testes.

| Sinal | Antes | Por que pesa |
|---|---|---|
| `font-black` e `font-extrabold` | 184 usos | Tudo gritava, então nada se destacava. Também obrigava a carregar dois pesos de fonte a mais. |
| `backdrop-blur` | 36 usos | Desfoque é dos efeitos mais caros para a placa de vídeo. Em PC de laboratório, rolar a página engasga. |
| `transition-all` | 88 usos | Anima propriedades de layout sem necessidade e custa recálculo a cada quadro. |
| Escala no hover e no clique | 22 usos | Movimento decorativo que não informa nada. |
| Degradês | 20 blocos | Item 1 da lista de sinais de site "vibecodado". |
| Rótulos em caixa alta com espaçamento largo | 84 usos | Outro vício típico, e mais difícil de ler. |
| Ícone de brilho (sparkles) | 10 usos | Item 24 da lista. Não dizia o que o botão fazia. |
| Fundo da página em degradê e sombra forçada com `!important` em toda superfície branca | global | Repintura cara e cartões "flutuando" sem motivo. |
| Celular | conteúdo começava a ~670px do topo | Cabeçalho em duas linhas, faixa de semestre enorme e grade de navegação 2x2 antes de qualquer dado. |
| JavaScript inicial | 3,4 MB sem compressão (404 KiB gzip) | A maior parte são matrizes e ofertas de todos os cursos. É o que mais pesa para abrir o site num PC lento. |

## 2. O que já foi feito nesta branch (fase 1)

Base visual e estrutura global. Tudo com testes passando (680) e build dentro do teto de bundle.

**Fundação**
- Fundo liso (`zinc-50`) no lugar do degradê, sem a sombra forçada em toda superfície branca.
- Números tabulares no site inteiro, para horas, CR e percentuais não "dançarem".
- Títulos com `text-wrap: balance` e parágrafos com `pretty`.
- Foco de teclado visível e consistente (`:focus-visible` em amarelo).
- Quem pede "reduzir movimento" no sistema recebe a interface parada.
- Fontes Outfit 800 e 900 removidas, porque não são mais usadas.

**Varredura mecânica em todas as telas**
- `font-black` e `font-extrabold` viraram `font-bold`.
- Todos os `backdrop-blur` saíram.
- `transition-all` virou `transition-colors`. As barras de progresso animam só a largura, e a rosca só o traço.
- Escalas de hover e clique removidas.
- `rounded-3xl` virou `rounded-2xl`.
- Os 20 degradês viraram cor sólida.
- Os rótulos em caixa alta viraram texto normal em tamanho legível. Códigos em fonte mono ficaram como estavam.

**Componentes**
- `Card` sem reação a hover, porque cartão que muda de borda sugere clique onde não há.
- `Botao` com raio menor, sem sombra e `type="button"` por padrão.
- `Badge` retangular e discreto.
- Novo `AbasSegmentadas`, um controle único para as sub-abas de Situação e Planejamento. Antes eram botões grandes com degradê, anel e escala, e o texto cortava ("Matér...") em telas médias.
- Novo `CarregadorPontos`, um carregador 3x3 que acende em diagonal, feito só com CSS. Inspirado no Dot Matrix. Aparece ao ler o histórico e ao abrir o Simulador.

**Cabeçalho e navegação**
- Cabeçalho numa linha só no celular, com o período do aluno junto do curso.
- Seletor de tema virou um botão só, que oferece o tema oposto ao atual.
- "Novidades" virou um sino com um ponto fixo quando há algo novo. O anel pulsante saiu.
- Perfil e configurações viraram um único botão.
- Barra lateral do desktop sem cartão em volta. O item ativo se distingue por fundo e ícone em amarelo, sem faixa colorida.
- No celular, a navegação virou barra de abas fixa no rodapé, com a pílula atrás do ícone ativo (padrão do Android). Barra da grade, avisos e "Fale conosco" foram reposicionados acima dela.
- "Fale conosco" no celular mostra só o envelope, para não cobrir o fim das listas.

**Faixa de semestre**
- Virou uma linha neutra com o essencial sempre visível ("Planejando 2027.1 com turmas prováveis. Turmas, horários e docentes ainda vão mudar."). O detalhe completo abre em "Entenda". A cor do estado ficou só no ícone.

**Planejamento**
- "Montando grade para" virou uma linha simples com o seletor, sem fonte mono e sem o ponto piscando.
- Cabeçalho de cada disciplina agora é acessível por teclado (antes era uma `div` clicável) e usa um chevron desenhado no lugar do "▼".

**Desfazer**
- Remover turma, limpar grade e excluir a Grade B ou C mostram um aviso com "Desfazer" por 8 segundos. Excluir grade era imediato e sem volta. Limpar grade abria um modal de "Tem certeza?", que saiu.

**Carregamento**
- O `index.html` traz um esqueleto da página que aparece antes do JavaScript, já no tema certo. Num PC lento a página deixa de ficar em branco.
- `viewport-fit=cover` para as margens de área segura funcionarem no iPhone, e cor da barra do navegador por tema.

## 3. Os 30 sinais de site "vibecodado"

| # | Sinal | No Oásis | Ação |
|---|---|---|---|
| 1 | Degradês fortes | 20 blocos | Feito. Todos viraram cor sólida. |
| 2 | Ícones estilo Lucide | Os ícones próprios seguem o traço Lucide/Feather | Fase 2. Usar menos ícones (só onde ajudam a reconhecer) e afinar o traço para 1,5. Trocar o conjunto inteiro não compensa. |
| 3 | Fundo branco puro | Página branca com degradê | Feito. Página em `zinc-50`, cartões brancos. |
| 4 | Cores de arco-íris | Paleta de 8 cores das matérias na grade | Fase 2. Paleta própria com menos matizes e tons mais baixos. A cor por matéria tem função, então fica, mas harmonizada. |
| 5 | Sombras | 114 usos | Parcial. Saíram dos cartões. Ficam só em camadas que flutuam (modais, menus, avisos). Fase 2 termina a limpeza. |
| 6 | Três cartões lado a lado | Os seis cartões de categoria em Minha Situação | Fase 2. Virar uma lista compacta (categoria, barra, horas), mais fácil de comparar. |
| 7 | Emojis | ⚡ e ◈ como ícones, ✓, ★, ▲ ▼ em texto | Parcial. ⚡ e ◈ trocados por ícones. Os demais na fase 2. |
| 8 | Vidro líquido | `backdrop-blur` em 36 lugares | Feito. |
| 9 | Travessões | 68 linhas de texto visível com "—" | Fase 2. Revisão de texto da interface inteira. |
| 10 | Inter, Geist, Space Grotesk | Outfit e Plus Jakarta Sans | Decisão sua. A Plus Jakarta é muito comum em landing pages geradas. Sugestão abaixo. |
| 11 | Faixa colorida à esquerda | Avisos e citação do Sobre | Feito nos avisos e na navegação. A citação do Sobre fica para a fase 2. |
| 12 | Depoimentos falsos | Não tem | Nada a fazer. |
| 13 | Grade "bento" | Não tem | Nada a fazer. |
| 14 | Janela de terminal | Fonte mono em contagens e chips ("35 disciplinas", "Grade A") | Fase 2. Mono só para códigos de disciplina e horários. |
| 15 | "Não é X, é Y" | Não encontrado | Conferir na revisão de texto. |
| 16 | Marcadores de check | Novidades e listas de "Como usar" | Fase 2. Listas simples ou numeradas. |
| 17 | Três planos de preço | Não tem | Nada a fazer. |
| 18 | Sem demonstração real | "Como gerar histórico" já usa capturas reais | Fase 4. Capturas reais também em "Como usar". |
| 19 | Cantos muito arredondados | `rounded-2xl` e `3xl` por toda parte | Parcial. 3xl saiu, botões foram para `lg`. Fase 2 leva cartões para `xl`. |
| 20 | Roxo com preto | Roxo só na paleta da grade e no fluxograma | Entra no item 4. |
| 21 | Sem esqueleto de carregamento | Página em branco até o JS carregar | Feito. Esqueleto no HTML e carregador de pontos. |
| 22 | Orbes radiais | Não tem | Nada a fazer. |
| 23 | Grade de pontos | Fundo do canvas do fluxograma | Mantido. Ali tem função (referência ao arrastar e dar zoom). |
| 24 | Ícone de brilho | 10 usos | Feito. Sino, quadro de grade, check, aperto de mão e mais. |
| 25 | Setas animadas | "Exibir lista →" | Fase 2. Seta sai, o texto do link basta. |
| 26 | Sem termos de uso | Não tem | Fase 4. Página curta, texto seu. |
| 27 | Sem política de privacidade | Existe só como menção solta | Fase 4. Página própria. O Oásis tem uma história boa aqui (histórico lido só no navegador, GoatCounter sem cookies). |
| 28 | Animação no hover | Escalas e sombras | Feito. Só mudança de cor. |
| 29 | Cores neon | Amarelo e verde muito saturados em blocos inteiros | Parcial. Blocos saíram. Amarelo fica para a ação principal. |
| 30 | Pastel básico | Avisos com fundo verde, laranja e âmbar claros | Parcial. A faixa de semestre ficou neutra. Os demais avisos na fase 2. |

**Sobre a fonte (item 10).** Fica como sugestão para avaliar sem pressa. Trocar a Plus Jakarta Sans do corpo pela **Atkinson Hyperlegible Next**, desenhada pelo Braille Institute para leitura com baixa visão. Ela tem personalidade, é gratuita, tem números bem distintos (útil para CR e horas) e conversa com o objetivo de acessibilidade. A Outfit pode continuar nos títulos. É uma troca de identidade, então fica com você.

## 4. As 20 dicas de interface

| # | Dica | Cabe no Oásis? | Onde | Situação |
|---|---|---|---|---|
| 1 | Esqueleto de carregamento | Sim | Primeiro carregamento, Simulador, leitura do PDF | Feito |
| 2 | Atualização otimista | Já é assim | Tudo é local, a resposta já é imediata | Nada a fazer |
| 3 | Menu de comandos | Sim | Ctrl+K para ir a uma tela ou achar uma disciplina pelo código | Fase 2 |
| 4 | Dicas de atalho | Sim | Junto do menu de comandos, só no desktop | Fase 2 |
| 5 | Aviso com desfazer | Sim | Remover turma, limpar grade, excluir cenário | Feito |
| 6 | Mostrar antigo e revalidar | Pouco | Os dados mudam uma vez por semestre. Um service worker com cache resolveria a volta ao site | Fase 3 |
| 7 | Pré-renderização | Sim | Esqueleto no `index.html` | Feito |
| 8 | BlurHash | Não | O site quase não tem imagens | Não se aplica |
| 9 | Transições de visualização | Com cuidado | Troca de aba com `startViewTransition`, curta e desligada em "reduzir movimento" | Fase 4 |
| 10 | Arrastar para fechar | Sim | Gaveta da grade no celular e menu móvel | Fase 3 |
| 11 | Animação interrompível | Sim | Abrir e fechar gavetas com transição CSS, não keyframe | Fase 3 |
| 12 | Voltar preditivo | Já existe | `useCamadaHistorico` fecha modais com o voltar do Android | Conferir nas telas novas |
| 13 | Área de toque ampliada | Sim | Chips, "+ Nova Grade", células da grade, × dos cenários | Parcial. Navegação e botões de ícone já têm 44px |
| 14 | Margens de área segura | Sim | `viewport-fit=cover` e barra inferior | Feito |
| 15 | Preenchimento de código | Não | Não há login | Não se aplica |
| 16 | Números tabulares | Sim | Site inteiro | Feito |
| 17 | Títulos balanceados | Sim | Site inteiro | Feito |
| 18 | Cantos contínuos | Talvez | `corner-shape: squircle` como enfeite progressivo | Fase 4, opcional |
| 19 | Chave de idempotência | Sim, adaptada | Impedir duplo envio no formulário de avaliação e dupla importação de savefile | Fase 3 |
| 20 | Triângulo seguro da Amazon | Não | Não há submenu aberto por hover | Não se aplica |

## 5. As leis de UX, aplicadas

| Lei | Onde ela entrou |
|---|---|
| Estética e usabilidade | Menos ruído faz o resto parecer mais confiável. É o motivo da fase 1 inteira. |
| Hick | Cabeçalho com menos escolhas (tema num botão, perfil e configurações juntos). |
| Fitts | Navegação no rodapé do celular, alvos de 44px, ação principal grande e perto do conteúdo. |
| Jakob | Barra de abas no rodapé e controle segmentado, padrões que todo mundo já conhece. |
| Miller | Fase 2 agrupa os seis cartões de categoria numa lista só. |
| Doherty (400ms) | Esqueleto imediato, menos efeitos caros, e na fase 3 dados carregados por curso. |
| Proximidade e região comum | Fim do cartão dentro de cartão. Perfil e configurações no mesmo botão. |
| Similaridade | Um padrão de aba, um de botão de ícone, um de aviso. |
| Hierarquia visual | Um peso forte por tela, não 184. |
| Revelação progressiva | Faixa de semestre com "Entenda". |
| Reconhecer em vez de lembrar | Fase 2, menu de comandos com busca por nome e código. |
| Von Restorff | Amarelo reservado à ação principal da tela. Fase 2 tira o segundo botão amarelo da grade. |
| Pico e fim | Fase 4, momento de conclusão quando a grade fica sem conflitos ou o simulador fecha a formatura. |
| Gradiente de meta | As barras e o "faltam X h" já fazem isso. Fase 2 dá mais destaque ao que falta. |
| Posição serial | Configurações no início do cabeçalho, ajuda e sobre no fim. |
| Tesler | O Oásis já absorve a complexidade (detecta curso e matriz sozinho). Manter. |
| Postel | Busca tolerante a acento e caixa já existe. Fase 2 estende ao menu de comandos. |
| Navalha de Occam | Textos repetidos nas faixas e dicas encurtados. |
| Ciclo de retorno | Desfazer, carregador com rótulo, foco visível. |

## 6. Próximas fases

**Fase 2, tela a tela (visual)**
1. Minha Situação com a lista compacta de categorias no lugar dos seis cartões.
2. Grade com uma só ação amarela, chips de cenário sem mono, paleta de matérias harmonizada.
3. Nomes de disciplina com conectivos em minúscula na exibição ("Análise e Projeto de Sistemas"). O dado da matriz não muda, só a apresentação.
4. Revisão de texto da interface (travessões, setas, marcadores de check, "Exibir Lista →").
5. Cartões em `rounded-xl` e sombras só em camadas flutuantes.
6. Menu de comandos (Ctrl+K) com dicas de atalho.

**Fase 3, desempenho e celular**
1. Carregar matrizes e ofertas por curso sob demanda, em vez de todas no bundle inicial. É o maior ganho possível para PC lento.
2. `content-visibility: auto` nas listas longas (Matérias abertas, Catálogo).
3. Arrastar para fechar a gaveta da grade e o menu móvel, com transição interrompível.
4. Proteção contra duplo envio em avaliação e savefile.
5. Service worker para abrir instantâneo na segunda visita (só depois de decidir como atualizar dados de semestre sem servir oferta velha).

**Fase 4, acabamento e confiança**
1. Páginas de privacidade e de termos de uso.
2. Capturas reais em "Como usar".
3. Transição curta entre abas.
4. Momento de conclusão (pico e fim).
5. Cantos contínuos, se ficarem bons.

## 7. Referências visuais

- **Dot Matrix** (dotmatrix.zzzzshawn.cloud). Aproveitado no carregador de pontos, feito à mão em CSS e sem a dependência React/shadcn deles.
- **Bklit UI** (bklit.com). Referência para a fase 2 de Minha Situação e do Simulador. Gráficos de linha fina, poucas cores, grades leves. Tudo em SVG desenhado à mão, sem biblioteca de gráficos.
- **Uilora** (uilora.com). Pouco aproveitável. É vitrine de componentes animados e pesados para Next.js, o oposto do que um PC de laboratório aguenta.

## 8. Como validar

- `npm test -- --run` e `npm run build` antes de cada integração.
- Conferir no sandbox em três situações. Um celular real, um PC dos laboratórios da UTFPR, e o Chrome com a CPU limitada a 6x (DevTools, Performance).
- Testar com teclado (Tab e Enter) a navegação, as sub-abas e as disciplinas do Planejamento.
- Testar com "reduzir movimento" ligado no sistema.
