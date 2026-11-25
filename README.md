# Todo Tamagochi

[![Testes](https://github.com/Rossalli/todo-tamagochi/actions/workflows/test.yml/badge.svg)](https://github.com/Rossalli/todo-tamagochi/actions/workflows/test.yml)

Uma lista de tarefas em que **cada tarefa concluída alimenta um bichinho virtual**. Ele cresce, ganha itens e escreve um diário bobo do que você fez.

**Experimente:** https://rossalli.github.io/todo-tamagochi/

Ele nasce de um ovo. O que vai chocar é surpresa.

## Como funciona

- **Tarefas simples.** Adicione, conclua, desmarque ou exclua. O texto é curto de propósito (até 80 caracteres).
- **Crescimento.** O bichinho passa por 5 estágios: ovo, bebê, filhote, jovem e adulto, aos 3, 10, 30 e 60 tarefas concluídas.
- **Diário.** Cada tarefa concluída vira uma frase, sorteada entre 100 templates, que cita a tarefa e o nome do bichinho. A mesma frase não se repete nas últimas 10.
- **Recompensas.** A cada 5 tarefas você escolhe 1 entre 3 itens. São 25 no total, para a cabeça, o rosto e a mão, e alguns só existem em certos estágios.
- **Energia e sono.** Cada tarefa sobe a barra de energia (até 10). Se passam 48 horas sem você concluir nenhuma, a energia vai a zero de uma vez e o bichinho dorme. Sem tristeza e sem culpa: ele acorda quando você conclui a próxima tarefa. Nas últimas 12 horas aparece um aviso discreto.

## Privacidade

Tudo fica no seu navegador (`localStorage`). Não há conta, servidor nem chamada de rede: nada é enviado para lugar nenhum. Se o navegador não conseguir gravar (aba anônima, por exemplo), o app avisa.

## Rodando localmente

Não há build nem dependências. Como o app usa módulos JavaScript, ele precisa ser servido por HTTP (abrir o arquivo direto no navegador não funciona).

```bash
npm run dev   # serve a pasta em http://localhost:5180
npm test      # roda os testes (Node 20 ou mais novo)
```

`npm run dev` usa o `npx serve`, então precisa de Node e de internet na primeira vez. Qualquer outro servidor estático serve.

## Testes

Mais de 200 testes com o executor nativo do Node (`node --test`), sem biblioteca nenhuma. Eles rodam a cada push e pull request, nas versões 20, 22 e 24 do Node, pelo GitHub Actions.

Cobrem a lógica (estágios, recompensas, energia, diário), o armazenamento (JSON truncado, campos faltando, dados adulterados), a arte (todo item cabe no quadro e nunca cobre o bichinho), a acessibilidade (contraste calculado, estrutura do HTML) e a segurança (texto da pessoa nunca vira HTML nem variável de template).

O que a automação não consegue conferir, como a leitura por leitor de tela e o uso por 14 dias, está em [`tests/MANUAL.md`](tests/MANUAL.md).

## Estrutura

```
index.html, styles.css   a página
src/app.js               liga estado, tela e eventos (único módulo que mexe no DOM)
src/state.js             tarefas, estágios, energia, marcos (funções puras)
src/diary.js             sorteio e preenchimento das frases
src/items.js             recompensas e armário
src/sprites.js           desenho do bichinho e dos itens (pixel art 16×16 em texto)
src/storage.js           leitura e gravação no localStorage
src/data/                as 100 frases e os 25 itens
tests/                   testes automáticos e o checklist manual
gallery.html             página de desenvolvimento para revisar a arte
```

## Documentação

- [`SPEC.md`](SPEC.md): o que o app faz e como saber que está pronto.
- [`tasks/`](tasks): o plano e as 17 tarefas da implementação.
- [`docs/ideas/`](docs/ideas): a ideia original e as frases.

## Acessibilidade

Funciona só com teclado, com anel de foco visível, diálogos nativos que prendem o foco e o devolvem ao fechar, região `aria-live` para o diário, contraste de texto de pelo menos 4,5:1 e respeito a `prefers-reduced-motion`. Não foi testado com leitor de tela de verdade.

## Licença

Ainda não definida.
