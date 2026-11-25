import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addTask,
  completeWithDiary,
  createInitialState,
  uncompleteWithDiary,
} from "../src/state.js";

const HOUR = 60 * 60 * 1000;
const rng = () => 0.3;

function stateWith(...texts) {
  let s = createInitialState();
  texts.forEach((t, i) => {
    s = addTask(s, t, `t${i + 1}`).state;
  });
  return s;
}

const sleeping = () => ({ ...stateWith("x"), asleep: true, energy: 0, lastActivityAt: 0 });

test("concluir com a raposa dormindo escreve a frase de volta (C) e depois a da tarefa", () => {
  const s = completeWithDiary(sleeping(), "t1", { now: 5 * HOUR, rng, id: "e1" });
  assert.equal(s.asleep, false);
  assert.equal(s.energy, 1);
  assert.equal(s.diary.length, 2);
  assert.equal(s.diary[0].id, "e1");
  assert.equal(s.diary[1].id, "e1-wake");
  assert.deepEqual(s.diary.map((e) => e.taskId), ["t1", "t1"]);
  assert.match(s.recentPhrases[1], /^C\d+$/);
  assert.match(s.recentPhrases[0], /^[ABD]\d+$/);
});

test("sem estar dormindo não há frase C", () => {
  const s = completeWithDiary(stateWith("x"), "t1", { now: 1, rng, id: "e1" });
  assert.equal(s.diary.length, 1);
  assert.ok(s.recentPhrases.every((id) => !id.startsWith("C")));
});

test("se passaram 48h mas o sono ainda não foi aplicado, concluir aplica e acorda (energia volta a 1)", () => {
  const stale = { ...stateWith("x"), energy: 10, lastActivityAt: 0, asleep: false };
  const s = completeWithDiary(stale, "t1", { now: 49 * HOUR, rng, id: "e1" });
  assert.equal(s.energy, 1);
  assert.equal(s.asleep, false);
  assert.equal(s.diary.length, 2);
  assert.equal(s.diary[1].id, "e1-wake");
});

test("desmarcar a tarefa que acordou a raposa remove as duas entradas", () => {
  let s = completeWithDiary(sleeping(), "t1", { now: 5 * HOUR, rng, id: "e1" });
  s = uncompleteWithDiary(s, "t1");
  assert.equal(s.diary.length, 0);
  assert.equal(s.energy, 0);
});

test("tarefa já concluída com o sono pendente: devolve o estado com o sono aplicado", () => {
  const done = completeWithDiary(stateWith("x"), "t1", { now: 0, rng, id: "e1" });
  const s = completeWithDiary(done, "t1", { now: 50 * HOUR, rng, id: "e2" });
  assert.equal(s.asleep, true);
  assert.equal(s.diary.length, 1);
});

test("concluir sem sono pendente e sem mudança devolve o mesmo estado", () => {
  const done = completeWithDiary(stateWith("x"), "t1", { now: 0, rng, id: "e1" });
  assert.equal(completeWithDiary(done, "t1", { now: 1000, rng, id: "e2" }), done);
});
