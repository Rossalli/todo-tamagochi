# Spec: Todo Tamagochi — V1

Origem: `docs/ideas/todo-tamagochi.md`. Frases: `docs/ideas/frases.json`. Protótipo visual: `prototype/sprites.html`.

## Objective

Uma lista de tarefas em que cada tarefa concluída alimenta uma raposa de pixel art. A raposa cresce em 5 estágios, nunca sofre (se você some, ela dorme), e o app escreve um diário bobo de cada tarefa. A cada 5 tarefas concluídas você escolhe um item para ela usar.

**Para quem:** eu mesma primeiro, depois pessoas com procrastinação/TDAH.
**Sucesso:** eu abro e uso o app todo dia por 30+ dias.

### Histórias de usuário
- Como usuária, adiciono uma tarefa curta e a marco como feita, e vejo a raposa reagir e uma nova linha no diário.
- Como usuária, a cada 5 tarefas escolho 1 entre 3 itens para a raposa usar.
- Como usuária, vejo uma barra de energia que sobe com as tarefas, e sei quando a raposa está para dormir. Se fico 48h sem concluir nenhuma, ela dorme e me recebe sem culpa quando eu volto.
- Como usuária, se marco uma tarefa por engano, posso desmarcar sem perder itens já ganhos.

## Tech Stack
- HTML + CSS + JavaScript (ES modules), sem framework e sem bundler.
- Renderização em `<canvas>` 20×16 escalado (raposa 16×16 + 2 colunas de margem de cada lado, usadas só por itens de mão), sprites como grades de texto.
- Persistência: `localStorage`.
- Testes: `node --test` (Node ≥ 20, sem dependências). `package.json` só com `"type": "module"` e scripts.
- Servidor de desenvolvimento: `npx --yes serve` (não é dependência do projeto).

## Commands
```
Dev:   npx --yes serve . -l 5180        # abrir http://localhost:5180
Test:  node --test
Test (um arquivo): node --test tests/state.test.js
```
Não há build nem lint no V1.

## Project Structure
```
index.html              → página única
styles.css              → estilos
src/app.js              → liga estado, UI e eventos (único módulo com DOM)
src/state.js            → lógica pura: tarefas, contagem, estágio, marcos, desfazer
src/diary.js            → sorteio de frases e preenchimento de templates (puro)
src/storage.js          → leitura e escrita no localStorage (com migração e fallback)
src/sprites.js          → grades dos sprites, itens e desenho no canvas
src/data/frases.js      → as 100 frases (A, B, C, D)
src/data/items.js       → catálogo de itens (nome, slot, grade, âncora)
tests/                  → *.test.js para state, diary, storage
docs/ideas/             → ideia e frases originais
prototype/              → teste visual (descartável)
SPEC.md                 → este arquivo
```

## Modelo de dados

```js
// localStorage["todo-tamagochi:v1"]
{
  schema: 1,
  petName: "Fuyu",
  tasks: [{ id, text, done, doneAt /* ms ou null */ }],
  completed: 12,              // contagem atual de tarefas concluídas
  rewardsGranted: 2,          // marcos de 5 já entregues (nunca diminui)
  owned: ["festa", "oculos"], // ids de itens ganhos
  equipped: { head: "festa", face: null, hold: null },
  diary: [{ id, taskId, text, at }],   // mais recente primeiro
  recentPhrases: ["A12", "B7"],        // últimos 10 ids usados
  lastOpenAt: 1764000000000
}
```

## Regras de negócio

**Estágios** por `completed` (constantes em `state.js`, ajustáveis):

| Estágio | completed |
|---|---|
| ovo | 0–2 |
| bebê | 3–9 |
| filhote | 10–29 |
| jovem | 30–59 |
| adulto | 60+ |

**Marcos:** a cada 5 concluídas há 1 recompensa pendente quando `floor(completed / 5) > rewardsGranted`. A usuária escolhe 1 entre 3 itens sorteados dos ainda não possuídos. Ao escolher, `rewardsGranted += 1`. Se não houver itens suficientes, mostra os que restam. Se não restar nenhum, o marco é consumido sem escolha.

**Desmarcar:** `completed -= 1`, remove a entrada de diário daquela conclusão. Não remove itens ganhos e **não diminui `rewardsGranted`**, então desmarcar e marcar de novo não duplica recompensa.

**Diário (sorteio da frase):**
1. Ao concluir uma tarefa que cruza um marco de 5: usa o grupo **D**.
2. Senão, com item equipado: sorteia de **A + B**. Sem item: só **A**.
3. Ao concluir uma tarefa com a raposa dormindo: primeiro uma entrada do grupo **C** (frase de volta), depois a entrada da tarefa. As duas levam o mesmo `taskId`, então desmarcar remove ambas.
4. Nunca repete os últimos 10 ids usados (se o grupo for menor que isso, repete só o necessário).
5. `{pet}`, `{tarefa}` e `{item}` são substituídos por texto puro. O resultado é sempre exibido com `textContent`.

**Energia e sono:** a energia vai de 0 a 10. Cada tarefa concluída soma 1 e reinicia o relógio (`lastActivityAt`). A energia **nunca desce aos poucos**: passadas 48h sem concluir nenhuma tarefa, ela vai a zero de uma vez e a raposa dorme. Concluir uma tarefa acorda (energia volta a 1). O relógio só começa na primeira tarefa concluída, então uma raposa nova nunca dorme por não ter feito nada. Desmarcar tira 1 de energia, mas não devolve o relógio anterior nem faz dormir.

- **Aviso:** nas últimas 12h antes de dormir aparece "Com sono: vai dormir em cerca de Xh". Fora dessa janela, a tela mostra só o nível. Tons calmos (lilás), nunca vermelho.
- **Dormindo:** olhos fechados (traços de 2 pixels) e um Z azul na margem direita; vale também para o ovo (só o Z). Itens continuam aparecendo.
- **O sono é aplicado** ao abrir o app, a cada minuto com a página aberta, ao voltar para a aba e ao concluir uma tarefa. Nunca há estado de tristeza, fome ou morte.
- `lastOpenAt` ficou sem uso (a regra antiga era "2+ dias sem abrir"); pode ser removido numa limpeza.

**Itens:** 3 slots (`head`, `face`, `hold` = segurado ao lado). Cada item é uma grade pequena com âncora por estágio. O ovo não usa itens. O catálogo do V1 tem 25 itens (ver "Catálogo de itens").

- Item **geral** funciona em bebê, filhote, jovem e adulto (com âncora por estágio).
- Item **de estágio** (bebê ou filhote) só pode ser equipado enquanto a raposa está naquele estágio. Depois de crescer, continua na coleção ("álbum"), visível mas não equipável.
- A escolha de recompensa sorteia 3 itens ainda não possuídos de: itens de estágio do estágio atual + itens gerais. Itens de estágio de outro estágio nunca entram no sorteio.

**Tarefas:** texto aparado, 1 a 80 caracteres, vazio é rejeitado. Sem edição de texto no V1, só adicionar, concluir, desmarcar e excluir. Excluir uma tarefa concluída **não** altera `completed`.

## Code Style

Funções puras, relógio e aleatoriedade injetados, nomes em inglês no código e texto em português na interface.

```js
// src/state.js
export const STAGES = [
  { id: "egg",   from: 0 },
  { id: "baby",  from: 3 },
  { id: "pup",   from: 10 },
  { id: "young", from: 30 },
  { id: "adult", from: 60 },
];

export function stageFor(completed) {
  return [...STAGES].reverse().find((s) => completed >= s.from).id;
}

export function completeTask(state, taskId, now = Date.now()) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.done) return state;
  return {
    ...state,
    completed: state.completed + 1,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, done: true, doneAt: now } : t)),
  };
}
```

Convenções: 2 espaços, aspas duplas, ponto e vírgula, `const` por padrão, sem estado mutável compartilhado, nenhum `innerHTML` com texto da usuária.

## Testing Strategy

| Nível | O que | Como |
|---|---|---|
| Unitário | `stageFor` nos limites (2/3, 9/10, 29/30, 59/60), marcos de 5, desfazer sem duplicar recompensa, sorteio sem repetir os últimos 10, substituição de variáveis, escolha de grupo (A/B/C/D) | `node --test` com `rng` e `now` injetados |
| Unitário | `storage`: JSON corrompido, `schema` ausente ou futuro, `localStorage` indisponível | `node --test` com um `localStorage` falso |
| Manual | Fluxo completo no navegador, 5 estágios e itens visíveis, modo dormindo (alterando `lastOpenAt` no console) | Checklist em `tests/MANUAL.md` |

Sem E2E automatizado no V1 (adicionar Playwright exige aprovação).

## Boundaries

- **Always:** rodar `node --test` antes de cada commit. Escrever o teste da regra antes da regra. Exibir texto da usuária só com `textContent`. Manter a linguagem das frases neutra de gênero.
- **Ask first:** adicionar qualquer dependência, mudar o formato do `localStorage` (exige migração), mudar os limites de estágio ou o X=5, mudar o catálogo de itens aprovado.
- **Never:** apagar teste que falha para passar, usar `innerHTML` com texto da usuária, mostrar raposa triste/faminta/morta, enviar dados da usuária para fora do navegador, commitar segredos.

## Success Criteria

Legenda: ✅ verificado, com a evidência indicada · ⚠️ verificado em parte · ⏳ pendente. Status da T17: critérios 1 a 8 e 10 verificados; o 9 em parte; o 11 só a pessoa pode fazer.

1. ✅ Adicionar uma tarefa, marcá-la e ver `completed` subir em 1, a raposa reagir e uma entrada nova no diário, tudo na mesma tela, sem recarregar. *Evidência: `diary-state.test.js`; no Chrome, 5 tarefas concluídas atualizam contador, estágio e 5 entradas sem recarregar.*
2. ✅ Os estágios mudam exatamente em 3, 10, 30 e 60 tarefas concluídas (testado). *Evidência: `state.test.js` ("stageFor muda exatamente nos limites"); no Chrome, ovo vira bebê ao concluir a 3ª.*
3. ✅ Ao chegar a 5 tarefas concluídas, aparece a escolha de 3 itens. Após escolher, o item aparece na raposa e nas frases do grupo B. *Evidência: `items.test.js`, `item-art.test.js`; no Chrome, o diálogo oferece 2 itens de bebê + 1 geral, o item equipado aparece na raposa e 5 de 13 frases citam o item.*
4. ✅ Desmarcar uma tarefa e marcá-la de novo **não** gera segunda recompensa (testado). *Evidência: `items.test.js`, `diary-state.test.js`; no Chrome (T9).*
5. ✅ Nenhuma frase repete dentro das últimas 10 usadas (testado com 200 sorteios). *Evidência: `diary.test.js`.*
6. ✅ Com `lastActivityAt` há 48h ou mais, a raposa abre dormindo e com energia 0. A primeira tarefa concluída a acorda e escreve uma entrada do grupo C antes da entrada da tarefa. Antes das 48h, nada muda; e sem nenhuma tarefa concluída ainda, ela nunca dorme. *Evidência: `energy.test.js`, `wake.test.js`, `sleep-art.test.js`; no Chrome, abre dormindo com 50h, acorda com a frase C e o sono chega com a página aberta.*
7. ✅ Recarregar a página preserva tarefas, contagem, itens, equipados e diário. Dados corrompidos no `localStorage` não quebram o app (volta ao estado inicial sem erro). *Evidência: `storage.test.js`, `storage-energy.test.js`, `hardening.test.js` (JSON truncado em todas as posições possíveis, campos faltando um a um, chaves `__proto__`, estado adulterado); no Chrome, recarregar preserva nome, 13 tarefas, contador, diário, armário e item. Se a gravação falhar, aparece um aviso.*
8. ✅ Nenhum texto de tarefa, mesmo com `<script>` ou `{pet}`, é interpretado como HTML ou como variável de template. *Evidência: `hardening.test.js` (as 100 frases contra mais de 2.900 combinações hostis; nenhuma API que interprete HTML no código; nenhuma rede); no Chrome, `<img onerror>` não vira elemento.*
9. ⚠️ Navegável por teclado, com `aria-live` no diário, canvas com `aria-label` descrevendo estágio e item, contraste de texto ≥ 4.5:1 e animações respeitando `prefers-reduced-motion`. *Evidência: `a11y.test.js` (contraste calculado, `aria-live`, estrutura, reduced-motion); no Chrome, o fluxo inteiro só com teclado. **Não verificado:** leitor de tela real, zoom a 200% e modo escuro/alto contraste (ver `tests/MANUAL.md`, seção 7).*
10. ✅ `node --test` passa sem falhas. *Evidência: `npm test`, 222 testes.*
11. ⏳ **Critério de uso real:** depois de implementado, usar 14 dias seguidos sem desistir, anotando quando as frases começarem a enjoar. *Só a pessoa pode fazer: tabela em `tests/MANUAL.md`, seção 8.*

## Out of Scope (Deferred)

- Conta, login e sincronização entre dispositivos: exige backend.
- Notificações push: não são confiáveis na web e podem virar pressão.
- Modo parceiro / social: exige backend.
- LLM para gerar histórias: quebra o localStorage e o escopo do fim de semana.
- Tipo de tarefa que define atributos: cortado para manter a tarefa simples.
- Moedas, loja, níveis complexos, pomodoro: o armário de 5 em 5 já é a recompensa.
- Escolha de espécie: multiplica arte e testes.
- Edição do texto de tarefa, prioridades, datas e categorias.
- Limite diário de tarefas contando para o marco: só se houver abuso no uso real.
- Slot de pescoço (babador, cachecol, coleira): só depois de validar o catálogo.

## Catálogo de itens (proposta, 25)

**Gerais (17)**
- head (7): chapéu de festa, coroa, gorro de lã, boné, chapéu de pirata, laço, flor
- face (5): óculos de sol, óculos redondos, bigode, máscara de herói, monóculo
- hold (5): balão, pirulito, livro, xícara de café, estrelinha

**Só no bebê (4):** touquinha (head), chupeta (face), chocalho (hold), ursinho (hold)
**Só no filhote (4):** fita de cabeça (head), bigode de leite (face), bola (hold), ossinho de borracha (hold)

Cobertura: ~18 recompensas em 30 dias (90 tarefas), com 17 itens gerais mais os de estágio. Passando disso o catálogo acaba.

## Decisões tomadas
1. Servidor de desenvolvimento: `npx --yes serve`.
2. Catálogo proposto acima, aguardando cortes.
3. Bebê e filhote têm itens próprios (chupeta, chocalho, bola etc.), com o slot `hold` adicionado.
4. Bebê e filhote ficam como estão no protótipo.
5. Adulto aos 60 tarefas.
6. Olhos fechados do modo dormindo derivados dos pixels `k` dos olhos.
7. Nome do bichinho pedido no primeiro uso, editável depois (assumido a partir de um "sim"). **A espécie é surpresa:** nenhum texto da interface diz "raposa", nem antes nem depois de chocar. O diálogo pergunta "Como vai se chamar o seu bichinho?", e o nome padrão é "Bichinho". `tests/surprise.test.js` impede que a palavra volte.
8. Ovo choca com 3 tarefas e o primeiro item chega com 5.

## Open Questions
1. O bebê recebe só 1 item (marco de 5) antes de virar filhote. Está bom, ou o primeiro marco deveria vir antes (por exemplo, no 3º, quando choca)?
2. Os itens de estágio ficam no álbum, sem poder ser equipados depois que ela cresce. Está bom assim, ou o item de bebê deve sumir da coleção?
3. Cortes ou trocas no catálogo de 25 itens.
4. ~~Barra de energia~~ **Decidido (T15):** a energia só sobe com tarefas (+1 cada, máximo 10) e vai a zero de uma vez após 48h sem concluir nenhuma; o sono depende de tarefas concluídas, e não de abrir o app. Aviso discreto nas últimas 12h. Ver "Energia e sono".
6. **Itens de mão (decidido na T10):** o quadro ganhou 2 colunas de margem de cada lado (20×16). Itens de mão ficam ao lado do corpo, na margem, e nunca cobrem pixels da raposa (testado). Cabeça e rosto continuam dentro dos 16×16 da raposa.
5. **Sorteio de recompensa (decidido na T8):** a escolha de 3 itens garante **até 2 itens do estágio atual** (bebê ou filhote) e completa com gerais. Sem isso, o bebê (só 1 escolha) veria um item de bebê em ~49% das vezes.
