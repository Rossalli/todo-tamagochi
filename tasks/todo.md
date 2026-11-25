# Todo Tamagochi V1: Tarefas

Plano e decisões: `tasks/plan.md`. Spec: `SPEC.md`.
Comandos: `node --test` (testes) e `npx --yes serve . -l 5180` (dev).
Escreva o teste da regra antes da regra (test-driven-development).

---

## Phase 1: Fundação e fatia mínima

### [x] T1: Esqueleto do projeto e harness de testes
**Descrição:** Cria a estrutura de pastas, `package.json` com `"type": "module"`, página vazia que carrega `src/app.js` e um teste de fumaça, para provar que o servidor e o `node --test` funcionam.
**Critérios:**
- [ ] `index.html` carrega `styles.css` e `src/app.js` (módulo) sem erro no console
- [ ] `package.json` tem `"type": "module"` e scripts `test` e `dev`
- [ ] Existe `tests/smoke.test.js` que passa
**Verificação:**
- [ ] `node --test` passa
- [ ] Manual: abrir `http://localhost:5180` mostra a página sem erros no console
**Dependências:** nenhuma
**Arquivos:** `package.json`, `index.html`, `styles.css`, `src/app.js`, `tests/smoke.test.js`
**Escopo:** S

### [x] T2: Lógica pura de tarefas
**Descrição:** `state.js` com estado inicial e as operações de tarefa: adicionar (valida), concluir, desmarcar e excluir. Concluir e desmarcar ajustam `completed`.
**Critérios:**
- [ ] Texto é aparado, rejeita vazio e acima de 80 caracteres
- [ ] Concluir aumenta `completed` em 1 e grava `doneAt`; concluir de novo é no-op
- [ ] Desmarcar diminui `completed` em 1, nunca abaixo de 0
- [ ] Excluir tarefa concluída **não** altera `completed`
- [ ] Nenhuma função muta o estado recebido
**Verificação:** [ ] `node --test tests/state.test.js` passa (casos de borda incluídos)
**Dependências:** T1
**Arquivos:** `src/state.js`, `tests/state.test.js`
**Escopo:** S

### [x] T3: Storage com fallback
**Descrição:** `storage.js` lê e grava o estado no `localStorage` (`todo-tamagochi:v1`) com `schema: 1`.
**Critérios:**
- [ ] Round-trip preserva o estado
- [ ] JSON inválido, `schema` ausente ou maior que o conhecido volta ao estado inicial sem lançar erro
- [ ] `localStorage` indisponível (lança erro) não quebra: o app continua em memória
**Verificação:** [ ] `node --test tests/storage.test.js` com `localStorage` falso
**Dependências:** T2
**Arquivos:** `src/storage.js`, `tests/storage.test.js`
**Escopo:** S

### [x] T4: UI de tarefas com persistência
**Descrição:** `app.js` renderiza a lista (campo para adicionar, marcar, desmarcar, excluir) a partir do estado, salvando a cada ação. Texto sempre via `textContent`.
**Critérios:**
- [ ] Adicionar, concluir, desmarcar e excluir funcionam sem recarregar a página
- [ ] Recarregar preserva tudo
- [ ] Tarefa com `<b>x</b>` aparece como texto literal
- [ ] Enter adiciona; tudo é alcançável por Tab
**Verificação:**
- [ ] `node --test` passa
- [ ] Manual: fluxo completo no navegador, recarregando no meio
**Dependências:** T2, T3
**Arquivos:** `index.html`, `styles.css`, `src/app.js`
**Escopo:** M

### Checkpoint 1: Lista funcionando
- [x] Testes passam. [x] Fluxo de tarefas funciona no navegador, com persistência.

---

## Phase 2: A raposa e o diário

### [x] T5: Raposa em 5 estágios
**Descrição:** Porta os sprites do protótipo (ovo, bebê, filhote, jovem, adulto) para `sprites.js`, desenha em `<canvas>` 16×16 escalado, e escolhe o estágio por `stageFor(completed)` (3, 10, 30, 60).
**Critérios:**
- [ ] `stageFor` retorna o estágio certo em 0, 2, 3, 9, 10, 29, 30, 59, 60 e 200
- [ ] Todas as grades têm 16×16 (teste automatizado)
- [ ] A raposa muda ao concluir tarefas e ao desmarcar
- [ ] Canvas com `aria-label` que descreve o estágio
**Verificação:**
- [ ] `node --test tests/state.test.js tests/sprites.test.js` passa
- [ ] Manual: ver os 5 estágios (ajustando `completed` no `localStorage`)
**Dependências:** T4
**Arquivos:** `src/sprites.js`, `src/state.js`, `src/app.js`, `tests/sprites.test.js`, `index.html`
**Escopo:** M

### [x] T6: Diário puro
**Descrição:** `data/frases.js` (as 100 frases, ids `A0`…`D9`) e `diary.js` com sorteio por grupo, sem repetir os últimos 10 ids, e preenchimento de template em passada única.
**Critérios:**
- [ ] Sem item equipado sorteia só de A; com item, de A+B
- [ ] 200 sorteios seguidos nunca repetem dentro de uma janela de 10
- [ ] `{pet}`, `{tarefa}`, `{item}` são substituídos; tarefa contendo `{pet}` ou `<script>` fica literal
- [ ] Conteúdo do módulo de frases bate com `docs/ideas/frases.json` (40/40/10/10)
**Verificação:** [ ] `node --test tests/diary.test.js` passa com `rng` injetado
**Dependências:** T1
**Arquivos:** `src/data/frases.js`, `src/diary.js`, `tests/diary.test.js`
**Escopo:** M

### [x] T7: Diário na UI
**Descrição:** Ao concluir uma tarefa, cria uma entrada de diário (texto já renderizado) e a mostra em uma lista com `aria-live`. Desmarcar remove a entrada daquela conclusão. Guarda `recentPhrases`.
**Critérios:**
- [ ] Concluir mostra a nova frase no topo, com o texto da tarefa
- [ ] Desmarcar remove a entrada correspondente
- [ ] O diário persiste ao recarregar
- [ ] A região do diário tem `aria-live="polite"`
**Verificação:**
- [ ] `node --test` passa
- [ ] Manual: concluir 5 tarefas e ver 5 frases diferentes
**Dependências:** T4, T6
**Arquivos:** `src/state.js`, `src/app.js`, `index.html`, `styles.css`, `tests/state.test.js`
**Escopo:** M

### Checkpoint 2: Loop central
- [ ] Testes passam. [ ] Concluir tarefa faz a raposa reagir e escreve uma frase. [ ] **Revisão com a Barbara.**

---

## Phase 3: Itens e marcos

### [x] T8: Modelo de itens e sorteio de recompensa
**Descrição:** `items.js` com a estrutura do catálogo (id, nome, slot, `stage` ou `general`, grade, âncoras) e funções puras: pendência de recompensa, sorteio de 3 candidatos e concessão.
**Critérios:**
- [ ] Pendente quando `floor(completed/5) > rewardsGranted`
- [ ] Candidatos vêm de itens do estágio atual + gerais, só não possuídos; no máximo 3
- [ ] Sem candidatos, o marco é consumido sem escolha
- [ ] Desmarcar e marcar de novo **não** gera recompensa extra
- [ ] Dois itens nunca ocupam o mesmo slot
**Verificação:** [ ] `node --test tests/items.test.js` passa
**Dependências:** T2
**Arquivos:** `src/data/items.js`, `src/items.js`, `src/state.js`, `tests/items.test.js`
**Escopo:** M

### [x] T9: Marco de 5 na UI
**Descrição:** Ao cruzar 5, 10, 15…, mostra a frase D e a escolha entre 3 itens. Escolher registra o item como possuído.
**Critérios:**
- [ ] A 5ª tarefa concluída abre a escolha de 3 itens
- [ ] A pessoa pode fechar e voltar depois, e a recompensa continua pendente
- [ ] Escolher adiciona o item a `owned` e consome o marco
- [ ] A frase D aparece no diário
**Verificação:**
- [ ] `node --test` passa
- [ ] Manual: chegar a 5 e escolher; recarregar e conferir
**Dependências:** T7, T8
**Arquivos:** `src/app.js`, `src/state.js`, `index.html`, `styles.css`, `tests/state.test.js`
**Escopo:** M

### [x] T10: Desenho de itens e armário
**Descrição:** `sprites.js` desenha o item equipado em cada slot usando a âncora do estágio. Armário para equipar, remover e ver o álbum (itens de outro estágio ficam visíveis, não equipáveis). Frases B passam a ser sorteadas. Prova com 3 itens (um de cada slot) e cria `gallery.html`, que mostra todos os itens em todos os estágios.
**Critérios:**
- [ ] Equipar e remover funcionam e persistem
- [ ] Item de estágio não pode ser equipado fora do seu estágio
- [ ] O ovo não mostra itens
- [ ] `gallery.html` mostra cada item em cada estágio aplicável
- [ ] Com item equipado, frases do grupo B entram no sorteio e `{item}` sai no texto
**Verificação:**
- [ ] `node --test` passa
- [ ] Manual: equipar nos 4 estágios com corpo e conferir o alinhamento na galeria
**Dependências:** T5, T9
**Arquivos:** `src/sprites.js`, `src/app.js`, `src/data/items.js`, `gallery.html`, `styles.css`
**Escopo:** M

### [x] T11: Arte: 7 itens de cabeça gerais
**Descrição:** Chapéu de festa, coroa, gorro de lã, boné, chapéu de pirata, laço, flor, com âncoras para bebê, filhote, jovem e adulto.
**Critérios:**
- [ ] Os 7 itens existem no catálogo com grade e 4 âncoras
- [ ] Todos aparecem na galeria sem cortar a cabeça nem sair do 16×16
- [ ] Teste confirma que toda grade de item cabe na área de 16×16 em cada âncora
**Verificação:** [ ] `node --test tests/items.test.js`. [ ] **Revisão visual da Barbara** na galeria.
**Dependências:** T10
**Arquivos:** `src/data/items.js`, `tests/items.test.js`
**Escopo:** S

### [x] T12: Arte: 5 de rosto e 5 de mão gerais
**Decisão (T10):** itens de mão usam a margem lateral do quadro 20×16 (x de -2 a 17, relativo à raposa) e nunca cobrem pixels da raposa. O pirulito (T10) é a referência de posição.
**Descrição:** Rosto: óculos de sol, óculos redondos, bigode, máscara de herói, monóculo. Mão: balão, pirulito, livro, xícara de café, estrelinha.
**Critérios:** [ ] 10 itens com grade e 4 âncoras. [ ] Mesmo teste de limites da T11. [ ] Galeria sem cortes.
**Verificação:** [ ] `node --test tests/items.test.js`. [ ] **Revisão visual da Barbara.**
**Dependências:** T10
**Arquivos:** `src/data/items.js`, `tests/items.test.js`
**Escopo:** S

### [x] T13: Arte: 4 itens de bebê e 4 de filhote
**Descrição:** Bebê: touquinha, chupeta, chocalho, ursinho. Filhote: fita de cabeça, bigode de leite, bola, ossinho de borracha. Cada um só tem âncora do seu estágio.
**Critérios:** [ ] 8 itens, cada um com âncora só do seu estágio. [ ] Mesmo teste de limites. [ ] Fora do estágio aparecem só no álbum.
**Verificação:** [ ] `node --test tests/items.test.js`. [ ] **Revisão visual da Barbara.**
**Dependências:** T10
**Arquivos:** `src/data/items.js`, `tests/items.test.js`
**Escopo:** S

### Checkpoint 3: Armário completo
- [x] 25 itens no catálogo com arte. [x] Testes passam. [ ] **Revisão com a Barbara** na galeria.

---

## Phase 4: Experiência de volta e primeiro uso

### [x] T14: Primeiro uso (nome)
**Descrição:** Na primeira abertura (sem `petName`) pede o nome do bichinho (a espécie é surpresa: nenhum texto diz "raposa"). O nome é editável depois e entra nas frases.
**Critérios:**
- [ ] Primeira abertura pede o nome; vazio é rejeitado, até 20 caracteres
- [ ] O nome persiste e aparece em `{pet}`
- [ ] Editar o nome não altera entradas de diário antigas
- [ ] Nome com `<` ou `{pet}` aparece literal
**Verificação:** [ ] `node --test` passa. [ ] Manual: limpar `localStorage` e repetir o fluxo.
**Dependências:** T4
**Arquivos:** `src/state.js`, `src/app.js`, `index.html`, `tests/state.test.js`
**Escopo:** S

### [x] T15: Modo dormindo
**Decisão (Barbara): opção 2.** Energia só sobe com tarefas (+1, máx. 10) e vai a zero de uma vez após 48h sem concluir tarefa; aviso nas últimas 12h. Ver SPEC.md, "Energia e sono".
**Descrição:** Guarda `lastOpenAt`. Se a abertura vier ≥ 2 dias de calendário local depois, a raposa abre com os olhos fechados (derivados dos pixels `k`), com uma frase C no diário. Acorda ao concluir a primeira tarefa da sessão.
**Critérios:**
- [ ] Com `lastOpenAt` há 2+ dias: olhos fechados e entrada do grupo C
- [ ] Com menos de 2 dias, ou na primeira abertura, não dorme
- [ ] Concluir uma tarefa acorda a raposa
- [ ] Não existe estado de tristeza, fome ou morte
- [ ] Virada de dia usa a data local (testado com `now` injetado, incluindo a meia-noite)
**Verificação:** [ ] `node --test` passa. [ ] Manual: ajustar `lastOpenAt` no console e recarregar.
**Dependências:** T5, T7
**Arquivos:** `src/state.js`, `src/sprites.js`, `src/diary.js`, `src/app.js`, `tests/state.test.js`
**Escopo:** M

---

## Phase 5: Qualidade

### [x] T16: Acessibilidade
**Descrição:** Passa pelo app inteiro: teclado, foco visível, rótulos, `aria-live`, contraste e `prefers-reduced-motion`.
**Critérios:**
- [ ] Todo o fluxo (adicionar, concluir, escolher item, equipar) funciona só com teclado, com foco visível
- [ ] Contraste de texto ≥ 4.5:1 (medido)
- [ ] Animações desligadas com `prefers-reduced-motion`
- [ ] Canvas descreve estágio e item equipado; escolha de recompensa é um diálogo acessível
**Verificação:** [ ] Checklist manual com teclado. [ ] Conferência de contraste. [ ] (opcional) skill `accessibility-engineering`.
**Dependências:** T10, T14, T15
**Arquivos:** `index.html`, `styles.css`, `src/app.js`
**Escopo:** M

### [x] T17: Endurecimento e checklist manual
**Descrição:** Testes de injeção e de limites, `tests/MANUAL.md` com o checklist de uso, e execução dos critérios de sucesso da spec.
**Critérios:**
- [ ] Teste: tarefa com `<script>`, `{pet}`, `{item}`, emoji e 80 caracteres nunca vira HTML nem variável
- [ ] Teste: estado do `localStorage` truncado ou com campos faltando não quebra o app
- [ ] `tests/MANUAL.md` cobre dormindo, marcos, desfazer, 5 estágios e persistência
- [ ] Cada um dos 10 critérios automatizáveis da spec está marcado com a evidência
**Verificação:** [ ] `node --test` passa. [ ] Checklist manual executado.
**Dependências:** T16
**Arquivos:** `tests/hardening.test.js`, `tests/MANUAL.md`, `SPEC.md`
**Escopo:** S

### Checkpoint final
- [x] Critérios 1 a 8 e 10 da spec passam; o 9 em parte (falta leitor de tela real). [ ] O critério 11 (14 dias de uso) é com a Barbara.
