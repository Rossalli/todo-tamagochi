# Checklist manual

O que os testes automáticos (`npm test`) **não** conseguem verificar. Faça antes de considerar o app pronto, e de novo depois de mudanças grandes.

Para abrir o app: `npm run dev` e acesse a porta indicada (a 5180 por padrão).
Para ver a arte: abra `gallery.html` no mesmo servidor.

## Como simular situações (console do navegador, F12)

Todas assumem que a página do app está aberta. Depois de cada trecho, recarregue a página.

```js
// Ler o estado salvo
const s = JSON.parse(localStorage.getItem("todo-tamagochi:v1"));

// Mudar o estágio da raposa (3 = bebê, 10 = filhote, 30 = jovem, 60 = adulto)
s.completed = 30;
localStorage.setItem("todo-tamagochi:v1", JSON.stringify(s));

// Fazer 40h passarem sem tarefa (aviso de sono) ou 50h (dormindo)
s.lastActivityAt = Date.now() - 40 * 3600 * 1000;
localStorage.setItem("todo-tamagochi:v1", JSON.stringify(s));

// Começar do zero
localStorage.clear();
```

## 1. Fluxo básico
- [ ] Primeira abertura: o diálogo "Como vai se chamar o seu bichinho?" pede o nome. Esc ou "Depois" mantém "Bichinho" e deixa o botão "Dar nome".
- [ ] **O ovo é surpresa:** em nenhum momento antes de chocar aparece a palavra "raposa" (diálogos, avisos, diário, leitor de tela). Procure por ela com Ctrl+F.
- [ ] Adicionar uma tarefa, marcar como feita: o contador sobe, a raposa muda quando cruza um estágio, e uma frase nova aparece no topo do diário.
- [ ] Desmarcar: o contador volta e a frase daquela tarefa some.
- [ ] Excluir uma tarefa **concluída**: o contador **não** diminui.
- [ ] Recarregar a página: tarefas, contador, itens, item equipado, diário e nome continuam.

## 2. Os 5 estágios
- [ ] Ovo (0 a 2), bebê (3 a 9), filhote (10 a 29), jovem (30 a 59), adulto (60+): cada um aparece no número certo de tarefas.
- [ ] Os estágios têm aparência claramente diferente entre si (principalmente bebê e filhote).

## 3. Recompensa a cada 5 tarefas
- [ ] Na 5ª tarefa concluída aparece "Escolha uma recompensa" com 3 itens e a frase do baú no diário.
- [ ] No bebê, 2 dos 3 itens são exclusivos de bebê (dica "só no bebê").
- [ ] Esc ou "Depois" fecha sem escolher: o aviso amarelo "Você ganhou uma recompensa!" continua, também depois de recarregar.
- [ ] Escolher adiciona o item ao armário e esconde o aviso.
- [ ] **Desmarcar e marcar de novo a 5ª tarefa, depois de escolher, não gera outra recompensa.**

## 4. Armário e itens
- [ ] Equipar e desequipar funciona, e o item aparece na raposa.
- [ ] Um item de bebê fica no armário, **desabilitado** (com "só no bebê"), depois que ela vira filhote.
- [ ] No ovo, o armário fica todo desabilitado ("O ovo ainda não usa itens").
- [ ] Com item equipado, algumas frases do diário citam o item.
- [ ] `gallery.html`: os 25 itens aparecem nos estágios certos, sem cortes, e leem como o que deveriam (os mais fracos: chupeta, bigode de leite, balão).

## 5. Energia e sono
- [ ] Raposa nova: barra vazia e "Conclua uma tarefa para dar energia". Ela **nunca dorme** antes da primeira tarefa.
- [ ] Cada tarefa acende 1 nível (máximo 10).
- [ ] Com `lastActivityAt` de 40h atrás: barra lilás e "Com sono: vai dormir em cerca de 8h".
- [ ] Com 50h atrás: ela abre dormindo (olhos fechados, Z azul), energia 0, "Dormindo. Conclua uma tarefa para acordar".
- [ ] Concluir uma tarefa acorda: energia 1, uma frase de volta e depois a frase da tarefa.
- [ ] Nunca aparece vermelho nem texto de culpa.

## 6. Falhas e entradas estranhas
- [ ] Tarefa com `<b>oi</b>` ou `{pet}`: aparece exatamente assim, na lista e no diário.
- [ ] Nome do bichinho com `<b>x</b>`: aparece literal.
- [ ] 80 emojis numa tarefa são aceitos, 81 não ("No máximo 80 caracteres").
- [ ] Modo privado ou armazenamento bloqueado: aparece o aviso "Não foi possível salvar neste navegador". O app continua funcionando até fechar a aba.
- [ ] Apagar o valor de `todo-tamagochi:v1` no `localStorage`, ou colocar texto qualquer ali: o app abre do zero, sem erro.

## 7. Acessibilidade (o que só uma pessoa confere)
- [ ] **Só com teclado**: Tab percorre tudo em ordem lógica; Espaço marca tarefa e equipa item; Enter confirma; Esc fecha diálogos; o foco volta para onde estava.
- [ ] O anel de foco é visível em todos os controles.
- [ ] **Leitor de tela** (NVDA no Windows, VoiceOver no Mac/iOS): ele anuncia a frase nova do diário, "A raposa foi dormir", o nome do medidor de energia e os botões do armário com o estado (pressionado ou não). *Não testado por quem escreveu o app.*
- [ ] **Zoom do navegador a 200%**: nada se sobrepõe nem some.
- [ ] **Tela estreita** (celular ou janela de 320 px): sem rolagem horizontal, mesmo com nome de 20 letras sem espaço.
- [ ] Modo escuro ou alto contraste do sistema: o app continua legível.

## 8. Critério de uso real (critério 11 da spec)

Usar por **14 dias seguidos**. Anote abaixo.

| Dia | Abri o app? | Tarefas | Nota (as frases já enjoaram? o que faltou?) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |
| 11 | | | |
| 12 | | | |
| 13 | | | |
| 14 | | | |

Perguntas para responder no fim:
- Em que dia as frases começaram a se repetir ou a enjoar? (Se foi antes do dia 15, aumentar os templates.)
- Ela dormir sem culpa funcionou, ou eu me senti mal ao voltar?
- Escolher um item a cada 5 tarefas ainda empolgava no fim?
- O catálogo de 25 itens acabou antes dos 14 dias?
- Eu abri o app sem lembrar de nada, ou precisei me forçar? (É o ponto mais frágil.)
