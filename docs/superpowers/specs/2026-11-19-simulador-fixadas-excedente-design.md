# Simulador de Formatura: fixadas, excedente e três ações por matéria

Design curto, aprovado na conversa de 19/11/2026.

## Intenção

Horas acima do mínimo de uma categoria não são problema. O aluno que pede uma
matéria deve tê-la no plano, e o simulador só avisa quanto passa do mínimo.
Caso real (histórico do dono, matriz 981): Humanidades com 90h feitas e 45h na
projeção (135/135). Planejamento de Carreira (FCH7PC, 60h, só ofertada em
semestres pares) foi recusado com "a categoria dela fecha sem ela", porque o
preenchimento automático já tinha fechado a categoria com Presença Africana em
2027.1.

## Problemas

1. O preenchimento automático ocupa as horas de uma categoria antes da matéria
   que o aluno fixou (a fixada só tem oferta em outro semestre).
2. Fixada em categoria fechada é descartada (`falta(cat) === 0`).
3. Nada avisa o excedente.
4. "Trocar" e o X mandam a matéria para a lista de exclusão, sem escolha.

## Design

### Parte A: fixadas e excedente (motor)

- **Correção de rumo na implementação:** a causa real do caso do dono era outra.
  Presença Africana (FCH7XC) estava fixada ("quero cursar") por uma troca, fechou
  as 45h de Humanidades, e o Planejamento de Carreira (também fixado) era
  descartado por "categoria fechada". Por isso a reserva de horas para fixadas
  foi descartada (YAGNI): o que resolve é a regra abaixo.
- Matéria fixada ignora o fechamento da categoria (humanidades, 2º estrato,
  expressão gráfica, eletivas, grupos de opção, trilhas). A regra de trilha-alvo
  continua valendo para trilhas.
- Excedente por categoria = planejado − exigido, quando maior que zero.
  Entra em `resultado.avisos` ("Ciclo de Humanidades: 30h a mais do que o
  necessário para fechar a carga do curso") e o cartão da categoria mostra
  "+30h acima do mínimo".
- Fixada sem oferta no semestre espelhado vai para o semestre em que há turma.
  Decisão do design: não inventar turma em semestre sem oferta.
- Menu "Adicionar matéria neste semestre" lista categorias fechadas, marcadas
  "já fechada".

### Parte B: três ações por matéria (tela e modelagem)

| Ação | Efeito | Exclusão |
|---|---|---|
| Excluir (X) | tira do plano, não volta | entra |
| Tirar deste semestre | motor não a coloca neste semestre, pode entrar em outro | não entra |
| Trocar | fixa a escolhida; a trocada só é vetada neste semestre | não entra |

- Modelagem ganha `vetosPorSemestre: Record<string, string[]>`, persistido com
  as demais escolhas e passado ao motor, que pula o código no semestre vetado.
- Cada ação reversível por "Desfazer" (aviso de 8s, `avisarRemocao`), conforme
  `docs/GUIA-INTERFACE.md` §7. Sem emoji, sem modal de confirmação.

## Não objetivos

- Plano automático continua cursando só o mínimo para quem não fixa nada.
- Regras de oferta, horário e trilha-alvo não mudam.

## Abordagens consideradas

1. Fixada ignora fechamento + reserva de horas (escolhida).
2. Plano automático passa do mínimo: quebra "cursar só o necessário".
3. Só aviso na tela: a matéria continuaria fora do plano.

## Testes

- Caso 981: Humanidades 135/135 com FCH7PC fixada entra no plano, nenhuma
  outra de Humanidades entra, sem excedente.
- Duas fixadas que passam do mínimo: ambas entram, aviso com o excedente.
- Sem fixações, plano idêntico ao atual (testes existentes seguem verdes).
- Veto por semestre: matéria vetada não aparece naquele semestre, não está na
  lista de exclusão.
- `tests/sobriedade-ui.test.ts` continua passando.
