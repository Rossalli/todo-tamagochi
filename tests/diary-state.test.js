import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PET_NAME,
  createInitialState,
  addTask,
  completeWithDiary,
  uncompleteWithDiary,
  deleteTask,
} from "../src/state.js";
import { RECENT_WINDOW } from "../src/diary.js";

const rng = () => 0.3;
let n = 0;
const opts = (now = 1000) => ({ now, rng, id: `e${++n}` });

function stateWith(...texts) {
  let s = createInitialState();
  texts.forEach((t, i) => {
    s = addTask(s, t, `t${i + 1}`).state;
  });
  return s;
}

test("concluir cria uma entrada no topo do diário", () => {
  const s = completeWithDiary(stateWith("regar a planta"), "t1", opts(5000));
  assert.equal(s.completed, 1);
  assert.equal(s.tasks[0].done, true);
  assert.equal(s.diary.length, 1);
  const e = s.diary[0];
  assert.equal(e.taskId, "t1");
  assert.equal(e.at, 5000);
  assert.ok(e.text.includes("regar a planta"));
  assert.ok(e.id);
});

test("o nome padrão aparece quando a raposa ainda não tem nome", () => {
  const s = completeWithDiary(stateWith("x"), "t1", opts());
  assert.equal(DEFAULT_PET_NAME, "Bichinho");
  assert.ok(s.diary[0].text.includes(DEFAULT_PET_NAME));
});

test("o petName definido entra na frase", () => {
  const base = { ...stateWith("x"), petName: "Fuyu" };
  const s = completeWithDiary(base, "t1", opts());
  assert.ok(s.diary[0].text.includes("Fuyu"));
  assert.ok(!s.diary[0].text.includes(DEFAULT_PET_NAME));
});

test("o id da frase usada vai para recentPhrases (mais recente primeiro)", () => {
  const s = completeWithDiary(stateWith("x"), "t1", opts());
  assert.equal(s.recentPhrases.length, 1);
  assert.match(s.recentPhrases[0], /^[AB]\d+$/);
});

test("duas conclusões ficam em ordem: a mais nova primeiro, sem repetir a frase", () => {
  let s = stateWith("um", "dois");
  s = completeWithDiary(s, "t1", opts(1));
  s = completeWithDiary(s, "t2", opts(2));
  assert.deepEqual(s.diary.map((e) => e.taskId), ["t2", "t1"]);
  assert.notEqual(s.recentPhrases[0], s.recentPhrases[1]);
  assert.notEqual(s.diary[0].text, s.diary[1].text);
});

test("recentPhrases não passa da janela", () => {
  let s = stateWith(..."abcdefghijklmnop".split(""));
  for (let i = 1; i <= 16; i++) s = completeWithDiary(s, `t${i}`, { now: i, rng: Math.random, id: `x${i}` });
  assert.equal(s.recentPhrases.length, RECENT_WINDOW);
});

test("concluir tarefa já concluída ou inexistente não muda nada", () => {
  const done = completeWithDiary(stateWith("x"), "t1", opts());
  assert.equal(completeWithDiary(done, "t1", opts()), done);
  assert.equal(completeWithDiary(done, "nope", opts()), done);
});

test("tarefa com texto malicioso vira texto literal na entrada", () => {
  const s = completeWithDiary(stateWith("<img src=x onerror=1> {pet}"), "t1", opts());
  assert.ok(s.diary[0].text.includes("<img src=x onerror=1> {pet}"));
});

test("desmarcar remove a entrada daquela tarefa e mantém as outras", () => {
  let s = stateWith("um", "dois");
  s = completeWithDiary(s, "t1", opts(1));
  s = completeWithDiary(s, "t2", opts(2));
  s = uncompleteWithDiary(s, "t1");
  assert.equal(s.completed, 1);
  assert.equal(s.tasks[0].done, false);
  assert.deepEqual(s.diary.map((e) => e.taskId), ["t2"]);
});

test("desmarcar não mexe em recentPhrases", () => {
  const done = completeWithDiary(stateWith("x"), "t1", opts());
  const s = uncompleteWithDiary(done, "t1");
  assert.deepEqual(s.recentPhrases, done.recentPhrases);
});

test("desmarcar tarefa não concluída ou inexistente não muda nada", () => {
  const s = stateWith("x");
  assert.equal(uncompleteWithDiary(s, "t1"), s);
  assert.equal(uncompleteWithDiary(s, "nope"), s);
});

test("concluir, desmarcar e concluir de novo deixa exatamente 1 entrada", () => {
  let s = stateWith("x");
  s = completeWithDiary(s, "t1", opts(1));
  s = uncompleteWithDiary(s, "t1");
  s = completeWithDiary(s, "t1", opts(2));
  assert.equal(s.diary.length, 1);
  assert.equal(s.diary[0].at, 2);
  assert.equal(s.completed, 1);
});

test("excluir uma tarefa concluída mantém a entrada no diário", () => {
  const done = completeWithDiary(stateWith("x"), "t1", opts());
  const s = deleteTask(done, "t1");
  assert.equal(s.tasks.length, 0);
  assert.equal(s.diary.length, 1);
});

test("as funções não mutam o estado recebido", () => {
  const base = stateWith("x");
  const done = completeWithDiary(base, "t1", opts());
  assert.equal(base.diary.length, 0);
  assert.equal(base.recentPhrases.length, 0);
  uncompleteWithDiary(done, "t1");
  assert.equal(done.diary.length, 1);
});

// ---- marcos (grupo D) ----

import { pendingRewards } from "../src/state.js";
import { grantReward, rewardCandidates } from "../src/items.js";

function completeN(state, n, from = 1) {
  let s = state;
  for (let i = from; i < from + n; i++) s = completeWithDiary(s, `t${i}`, opts(i));
  return s;
}

const many = (count) => stateWith(...Array.from({ length: count }, (_, i) => `tarefa ${i + 1}`));

test("pendingRewards também é exportado pelo state.js", () => {
  assert.equal(pendingRewards({ completed: 5, rewardsGranted: 0 }), 1);
});

test("a 5ª tarefa concluída escreve uma frase do grupo D e deixa 1 recompensa pendente", () => {
  const s = completeN(many(5), 5);
  assert.equal(pendingRewards(s), 1);
  assert.match(s.recentPhrases[0], /^D\d+$/);
  assert.equal(s.diary[0].taskId, "t5");
  assert.ok(s.diary[0].text.includes(DEFAULT_PET_NAME));
});

test("as 4 primeiras tarefas não usam o grupo D", () => {
  const s = completeN(many(4), 4);
  assert.equal(pendingRewards(s), 0);
  assert.ok(s.recentPhrases.every((id) => /^[AB]/.test(id)));
});

test("a 10ª tarefa cruza o segundo marco", () => {
  const s = completeN(many(10), 10);
  assert.equal(pendingRewards(s), 2);
  assert.match(s.recentPhrases[0], /^D\d+$/);
});

test("desmarcar a 5ª e marcar de novo sem ter escolhido repete o marco (D)", () => {
  let s = completeN(many(5), 5);
  s = uncompleteWithDiary(s, "t5");
  assert.equal(pendingRewards(s), 0);
  s = completeWithDiary(s, "t5", opts(99));
  assert.equal(pendingRewards(s), 1);
  assert.equal(s.diary[0].taskId, "t5");
  assert.equal(s.diary.filter((e) => e.taskId === "t5").length, 1);
});

test("depois de escolher o item, desmarcar e marcar de novo NÃO gera marco nem frase D", () => {
  let s = completeN(many(5), 5);
  s = grantReward(s, rewardCandidates(s, () => 0)[0].id);
  assert.equal(pendingRewards(s), 0);
  s = uncompleteWithDiary(s, "t5");
  s = completeWithDiary(s, "t5", opts(99));
  assert.equal(pendingRewards(s), 0);
  assert.match(s.recentPhrases[0], /^[AB]/);
  assert.equal(s.owned.length, 1);
});

// ---- item equipado nas frases ----

test("com item informado, as frases B entram no sorteio e citam o item", () => {
  let sawB = false;
  for (let k = 0; k < 100; k++) {
    const s = completeWithDiary(stateWith("regar"), "t1", { now: 1, rng: () => k / 100, id: "e", item: "coroa" });
    const id = s.recentPhrases[0];
    assert.match(id, /^[AB]\d+$/);
    if (id.startsWith("B")) {
      sawB = true;
      assert.ok(s.diary[0].text.includes("coroa"));
    }
  }
  assert.ok(sawB);
});

test("sem item informado, nunca sai frase B", () => {
  for (let k = 0; k < 100; k++) {
    const s = completeWithDiary(stateWith("regar"), "t1", { now: 1, rng: () => k / 100, id: "e" });
    assert.match(s.recentPhrases[0], /^A\d+$/);
  }
});

// ---- nome da raposa nas frases ----

import { setPetName } from "../src/state.js";

test("renomear a raposa não reescreve entradas antigas, e as novas usam o nome novo", () => {
  let s = setPetName(stateWith("um", "dois"), "Fuyu").state;
  s = completeWithDiary(s, "t1", opts(1));
  const old = s.diary[0].text;
  assert.ok(old.includes("Fuyu"));
  s = setPetName(s, "Kitsune").state;
  s = completeWithDiary(s, "t2", opts(2));
  assert.equal(s.diary[1].text, old);
  assert.ok(s.diary[0].text.includes("Kitsune"));
  assert.ok(!s.diary[0].text.includes("Fuyu"));
});

test("nome com {tarefa} ou {item} aparece literal na frase e não é reprocessado", () => {
  const s = completeWithDiary(
    setPetName(stateWith("regar a planta"), "{tarefa}").state,
    "t1",
    { now: 1, rng: () => 0.3, id: "e", item: "coroa" },
  );
  assert.ok(s.diary[0].text.includes("{tarefa}"));
  assert.ok(s.diary[0].text.includes("regar a planta"));
});

test("nome com HTML aparece literal na frase", () => {
  const s = completeWithDiary(
    setPetName(stateWith("x"), "<b>Fuyu</b>").state,
    "t1",
    opts(),
  );
  assert.ok(s.diary[0].text.includes("<b>Fuyu</b>"));
});
