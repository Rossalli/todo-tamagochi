# Implementation Plan: Todo Tamagochi V1

Source spec: `SPEC.md` (aprovada). Defaults aceitos: primeiro marco em 5, itens de estágio ficam no álbum, catálogo de 25 itens.
Tarefas detalhadas (critérios e verificação) em `tasks/todo.md`.

## Overview
Web app estático (HTML, CSS, JS em módulos, sem build) com `localStorage`. Lista de tarefas que alimenta uma raposa de pixel art em 5 estágios, com diário de frases por template, marcos a cada 5 tarefas com escolha de item, e modo dormindo sem culpa. Construído em fatias verticais: cada tarefa deixa o app utilizável.

## Architecture Decisions
- **Estado imutável e funções puras** em `state.js` e `diary.js`. `now` e `rng` são injetados, o que permite testar tudo com `node --test`, sem navegador.
- **Um único módulo com DOM** (`app.js`): cada ação chama uma função pura, salva no storage e re-renderiza a tela a partir do estado.
- **Entradas do diário guardam o texto já renderizado.** Mudar templates depois não reescreve o histórico.
- **Itens como grades de texto com âncora por estágio** (`{ adult, young, pup, baby }` com `x, y`). O ovo não tem âncora. Isso permite cadastrar item novo sem mexer no código de desenho.
- **Frases como módulo JS** (`src/data/frases.js`); o id de cada frase é `grupo + índice` (`A0`, `B12`), usado para não repetir as últimas 10.
- **`rewardsGranted` nunca diminui**, o que impede que desmarcar e marcar de novo gere recompensa em dobro.
- **Servidor de dev:** `npx --yes serve . -l 5180`. Testes: `node --test`.

## Dependency Graph
```
scaffold (T1)
  ├─ state: tarefas (T2) ─┬─ storage (T3) ─┐
  │                       └────────────────┴─ UI de tarefas (T4)
  ├─ sprites + estágios (T5, precisa T4)
  ├─ diário puro (T6) ── diário na UI (T7, precisa T4, T6)
  ├─ itens: modelo e sorteio (T8, precisa T2)
  │     └─ marco de 5 na UI (T9, precisa T7, T8)
  │           └─ desenho de itens + armário (T10, precisa T5, T9)
  │                 ├─ arte: cabeça (T11)
  │                 ├─ arte: rosto e mão (T12)
  │                 └─ arte: estágio (T13)
  ├─ primeiro uso: nome (T14, precisa T4)
  ├─ modo dormindo (T15, precisa T5, T7)
  └─ acessibilidade (T16), endurecimento (T17): por último
```

## Task List

### Phase 1: Fundação e fatia mínima
- [x] T1: Esqueleto do projeto e harness de testes
- [x] T2: Lógica pura de tarefas (adicionar, concluir, desmarcar, excluir)
- [x] T3: Storage com fallback para dados corrompidos
- [x] T4: UI de tarefas com persistência

### Checkpoint 1: Lista funcionando
- [x] `node --test` passa
- [x] Adicionar, concluir, desmarcar, excluir e recarregar a página funciona no navegador

### Phase 2: A raposa e o diário
- [x] T5: Raposa em 5 estágios (sprites, estágio pela contagem)
- [x] T6: Diário puro (frases, sorteio sem repetição, templates seguros)
- [x] T7: Diário na UI (criar e remover entradas)

### Checkpoint 2: Loop central
- [ ] Concluir uma tarefa faz a raposa reagir e escreve uma frase com o texto da tarefa
- [ ] Estágios mudam em 3, 10, 30 e 60 (conferir no navegador alterando o estado)
- [ ] **Revisão com a Barbara:** a raposa e o diário estão agradáveis?

### Phase 3: Itens e marcos
- [x] T8: Modelo de itens e sorteio de recompensa (puro)
- [x] T9: Marco de 5 na UI (escolher 1 de 3, frase D)
- [x] T10: Desenho de itens e armário (equipar, slots, grupo B), com 3 itens de prova
- [x] T11: Arte: 7 itens de cabeça gerais
- [x] T12: Arte: 5 de rosto e 5 de mão gerais
- [x] T13: Arte: 4 itens de bebê e 4 de filhote

### Checkpoint 3: Armário completo
- [x] 25 itens no catálogo, todos visíveis nos estágios em que se aplicam
- [ ] **Revisão com a Barbara:** alinhamento e visual dos itens em cada estágio

### Phase 4: Experiência de volta e primeiro uso
- [x] T14: Primeiro uso (pedir e editar o nome)
- [x] T15: Modo dormindo (olhos fechados, frase C)

### Phase 5: Qualidade
- [x] T16: Acessibilidade
- [x] T17: Endurecimento e checklist manual

### Checkpoint final
- [x] Critérios 1 a 8 e 10 da spec passam, e o 9 em parte (falta leitor de tela real). O 11º (14 dias de uso) é com a Barbara, em `tests/MANUAL.md`
- [x] Pronta para uso real: a T1 a T17 estão concluídas

## Risks and Mitigations
| Risco | Impacto | Mitigação |
|---|---|---|
| Alinhar 25 itens em 4 estágios sem ver o resultado renderizado | Alto | T10 cria uma página de galeria (`gallery.html`) com todos os itens em todos os estágios. Cada tarefa de arte termina com revisão visual da Barbara |
| Volume de arte (25 itens × até 4 âncoras) | Médio | T10 prova o sistema com 3 itens. A arte entra em lotes pequenos (T11 a T13), e o app funciona com o catálogo parcial |
| Frases repetindo cedo | Médio | Sorteio sem repetir as últimas 10, 100 frases, e suposição a validar no uso de 14 dias |
| Dados corrompidos ou schema futuro no `localStorage` | Médio | T3 cobre JSON inválido, schema ausente e `localStorage` indisponível |
| Fuso e virada de dia no modo dormindo | Baixo | Usar dias de calendário locais e injetar `now` nos testes (T15) |
| Texto de tarefa com `<script>` ou `{pet}` | Médio | `textContent` sempre. Substituição de variáveis em passada única, sem reprocessar o texto da tarefa (T6, T17) |
| Bebê com só 1 recompensa de itens de estágio | Baixo | Decisão aceita. Reavaliar no uso real |

## Open Questions
- Nenhuma bloqueante. As 3 perguntas em aberto da spec foram resolvidas pelos defaults.
- Catálogo: cortes ou trocas ainda podem acontecer durante a arte (T11 a T13).

## Parallelization
- Depois do Checkpoint 1: T5 e T6 são independentes. T14 pode andar em paralelo com a Fase 3.
- T11, T12 e T13 são independentes entre si (só adicionam dados em `items.js`) e podem ser feitas em paralelo depois de T10.
- Tudo o mais é sequencial por causa do estado compartilhado em `state.js` e `app.js`.
