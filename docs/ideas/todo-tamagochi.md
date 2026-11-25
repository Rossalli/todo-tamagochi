# Todo Tamagochi

## Problema
Como podemos fazer concluir uma tarefa pequena virar cuidar de alguém, para que eu abra o app todo dia por 30+ dias sem culpa?

**Para quem:** primeiro eu mesma, depois pessoas com procrastinação/TDAH.
**Sucesso:** eu uso todo dia por 30+ dias.

## Direção recomendada
Direção **C (diário + armário)**. Eu crio tarefas simples, e cada uma concluída alimenta a raposa e gera uma linha no diário. A cada **5 tarefas** eu escolho um item (chapéu, óculos, coroa etc.), que passa a aparecer nas próximas histórias. A raposa **nunca sofre**: se eu sumir, ela só dorme, e na volta recebo uma frase de boas-vindas sem culpa.

O diferencial está no **diário**. As frases misturam o texto da minha tarefa, o item equipado e um tom bobo aleatório, então cada entrada soa única. Isso responde a Habitica e Finch, que já fazem "tarefa vira bichinho", mas não dão um motivo para voltar além do placar.

Crescimento em **5 estágios** (ovo, bebê, filhote, jovem, adulto), em pixel art 16×16 desenhada como grades de texto e renderizada em canvas.

## Decisões fechadas
- **Espécie:** raposa, fixa no MVP. O nome é escolhido pelo usuário.
- **Estágios:** ovo (0–2 tarefas), bebê (3–9), filhote (10–29), jovem (30–59), adulto (60+). Limites ajustáveis.
- **Marco de itens:** a cada 5 tarefas, escolher 1 entre 3 itens sorteados do catálogo.
- **Arte:** sprites 16×16 em grades de texto, mesma paleta, itens sobrepostos com offset. Teste em `prototype/sprites.html`.
- **Texto:** templates (100 frases em `frases.json`), sem LLM.
- **Desmarcar tarefa:** desfaz o alimento, mas não remove itens já ganhos.
- **Tarefas ridículas:** sem regra no começo. Se virar abuso, limitar a 3–5 tarefas por dia contando para o marco.

## Suposições a validar
- [ ] **As frases não enjoam em 30 dias.** Teste: usar por 2 semanas e anotar quando parar de ler. Se for antes do dia 15, aumentar templates ou misturar mais variáveis.
- [ ] **"Dormir" não gera culpa.** Teste: sumir 3 dias e observar o que sinto ao voltar.
- [ ] **X=5 está no ritmo certo.** Teste: ajustar e ver se escolher item ainda empolga ou cansa.
- [ ] **O catálogo não acaba cedo.** Com 5 tarefas por item e 3 por dia, 15 itens duram ~25 dias. Para 30+ dias, o catálogo precisa de 20–30 itens.
- [ ] **Eu lembro de abrir o app.** Teste: fixar a aba e ver se o hábito pega sem notificação. É o ponto mais frágil.
- [ ] **O estilo 16×16 serve.** Teste: usar o protótipo e ver se a raposa agrada. Se não, trocar por Piskel ou pacote do itch.io.

## Escopo do MVP (fim de semana, localStorage)
**Dentro:**
- Lista de tarefas simples (adicionar, concluir, desmarcar)
- Raposa com nome e 5 estágios
- Marco a cada 5 tarefas, com escolha entre 3 itens
- Diário com as 100 frases, sem repetir as últimas 10
- Modo "dormindo" com mensagem de boas-vindas após 2+ dias sem uso
- Persistência em localStorage

**Fora:** tudo da lista abaixo.

## Não vamos fazer (e por quê)
- **Bichinho que sofre, morre ou fica triste.** Culpa faz abandonar o app.
- **Tipo de tarefa que define atributos (saúde, estudo etc.).** Corta para manter a tarefa simples.
- **LLM para gerar histórias.** Quebra o fim de semana e o localStorage. Templates bastam para testar a hipótese.
- **Conta, login e sincronização entre dispositivos.** Peso demais para validar o núcleo.
- **Notificações push.** Web app não entrega bem, e podem virar pressão.
- **Modo parceiro / social.** Exige backend.
- **Moedas, loja, níveis complexos e pomodoro.** O armário de 5 em 5 já é a recompensa. O resto vira "mais um Habitica".
- **Escolha de espécie.** Multiplica arte e testes sem validar o núcleo.

## Perguntas abertas
- Os itens precisam encaixar nos 4 estágios com corpo. O ovo fica sem item ou com um laço na casca?
- Bebê e filhote ficam parecidos (os dois são só cabeça)? Dar corpinho ao bebê ou aumentar o filhote?
- Quais 20–30 itens entram no catálogo e como cada um é desenhado em 16×16?
- O último estágio chega perto do dia 20. Empurrar o adulto para 90 tarefas ou aceitar que, no fim, só itens e diário mudam?

## Arquivos
- `docs/ideas/frases.json`: as 100 frases em 4 grupos (A só tarefa, B com item, C volta, D marco de 5).
- `prototype/sprites.html`: teste visual da raposa (5 estágios, 3 itens, sorteador de frases).
