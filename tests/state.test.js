import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TASK_LENGTH,
  STAGES,
  stageFor,
  createInitialState,
  addTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from "../src/state.js";

const withTask = (text = "lavar a louça", id = "t1") =>
  addTask(createInitialState(), text, id).state;

test("estado inicial está zerado", () => {
  const s = createInitialState();
  assert.equal(s.schema, 1);
  assert.deepEqual(s.tasks, []);
  assert.equal(s.completed, 0);
  assert.equal(s.rewardsGranted, 0);
  assert.deepEqual(s.owned, []);
  assert.deepEqual(s.equipped, { head: null, face: null, hold: null });
});

// ---- addTask ----

test("addTask apara o texto e cria tarefa não concluída", () => {
  const { state, error } = addTask(createInitialState(), "  regar a planta  ", "a");
  assert.equal(error, null);
  assert.deepEqual(state.tasks, [{ id: "a", text: "regar a planta", done: false, doneAt: null }]);
});

test("addTask rejeita texto vazio ou só espaços", () => {
  const s = createInitialState();
  for (const text of ["", "   ", "\n\t"]) {
    const r = addTask(s, text, "a");
    assert.equal(r.error, "empty");
    assert.equal(r.state, s);
  }
});

test("addTask aceita 80 caracteres e rejeita 81", () => {
  const s = createInitialState();
  assert.equal(MAX_TASK_LENGTH, 80);
  assert.equal(addTask(s, "x".repeat(80), "a").error, null);
  const r = addTask(s, "x".repeat(81), "b");
  assert.equal(r.error, "too_long");
  assert.equal(r.state, s);
});

test("addTask mede o limite depois de aparar", () => {
  const s = createInitialState();
  assert.equal(addTask(s, "  " + "x".repeat(80) + "  ", "a").error, null);
});

test("addTask não muta o estado recebido", () => {
  const s = createInitialState();
  const r = addTask(s, "algo", "a");
  assert.equal(s.tasks.length, 0);
  assert.notEqual(r.state, s);
});

test("addTask gera id quando não recebe um", () => {
  const a = addTask(createInitialState(), "um").state.tasks[0].id;
  const b = addTask(createInitialState(), "dois").state.tasks[0].id;
  assert.ok(a && b && a !== b);
});

// ---- completeTask ----

test("completeTask marca como feita, grava doneAt e soma 1", () => {
  const s = completeTask(withTask(), "t1", 1000);
  assert.equal(s.completed, 1);
  assert.equal(s.tasks[0].done, true);
  assert.equal(s.tasks[0].doneAt, 1000);
});

test("completeTask numa tarefa já concluída não muda nada", () => {
  const once = completeTask(withTask(), "t1", 1000);
  const twice = completeTask(once, "t1", 2000);
  assert.equal(twice, once);
  assert.equal(twice.completed, 1);
  assert.equal(twice.tasks[0].doneAt, 1000);
});

test("completeTask com id desconhecido não muda nada", () => {
  const s = withTask();
  assert.equal(completeTask(s, "nope", 1), s);
});

test("completeTask não muta o estado recebido", () => {
  const s = withTask();
  completeTask(s, "t1", 1);
  assert.equal(s.completed, 0);
  assert.equal(s.tasks[0].done, false);
});

// ---- uncompleteTask ----

test("uncompleteTask desfaz a conclusão e subtrai 1", () => {
  const done = completeTask(withTask(), "t1", 1000);
  const s = uncompleteTask(done, "t1");
  assert.equal(s.completed, 0);
  assert.equal(s.tasks[0].done, false);
  assert.equal(s.tasks[0].doneAt, null);
});

test("uncompleteTask numa tarefa não concluída não muda nada", () => {
  const s = withTask();
  assert.equal(uncompleteTask(s, "t1"), s);
});

test("uncompleteTask com id desconhecido não muda nada", () => {
  const s = withTask();
  assert.equal(uncompleteTask(s, "nope"), s);
});

test("uncompleteTask nunca deixa completed abaixo de 0", () => {
  // estado inconsistente de propósito: tarefa feita, contador zerado
  const bad = { ...withTask(), completed: 0 };
  bad.tasks = [{ ...bad.tasks[0], done: true, doneAt: 1 }];
  assert.equal(uncompleteTask(bad, "t1").completed, 0);
});

test("uncompleteTask não muta o estado recebido", () => {
  const done = completeTask(withTask(), "t1", 1000);
  uncompleteTask(done, "t1");
  assert.equal(done.completed, 1);
  assert.equal(done.tasks[0].done, true);
});

// ---- deleteTask ----

test("deleteTask remove a tarefa", () => {
  const s = deleteTask(withTask(), "t1");
  assert.deepEqual(s.tasks, []);
});

test("deleteTask de tarefa concluída NÃO altera completed", () => {
  const done = completeTask(withTask(), "t1", 1000);
  const s = deleteTask(done, "t1");
  assert.equal(s.tasks.length, 0);
  assert.equal(s.completed, 1);
});

test("deleteTask com id desconhecido não muda nada", () => {
  const s = withTask();
  assert.equal(deleteTask(s, "nope"), s);
});

test("deleteTask não muta o estado recebido", () => {
  const s = withTask();
  deleteTask(s, "t1");
  assert.equal(s.tasks.length, 1);
});

// ---- stageFor ----

test("STAGES tem os 5 estágios com os limites da spec", () => {
  assert.deepEqual(
    STAGES.map((s) => [s.id, s.from]),
    [["egg", 0], ["baby", 3], ["pup", 10], ["young", 30], ["adult", 60]],
  );
});

test("stageFor muda exatamente nos limites", () => {
  const cases = [
    [0, "egg"], [2, "egg"],
    [3, "baby"], [9, "baby"],
    [10, "pup"], [29, "pup"],
    [30, "young"], [59, "young"],
    [60, "adult"], [200, "adult"],
  ];
  for (const [completed, stage] of cases) {
    assert.equal(stageFor(completed), stage, `completed=${completed}`);
  }
});

test("stageFor trata valor negativo como ovo", () => {
  assert.equal(stageFor(-5), "egg");
});

// ---- nome da raposa ----

import { MAX_PET_NAME_LENGTH, setPetName } from "../src/state.js";

test("o nome tem no máximo 20 caracteres", () => {
  assert.equal(MAX_PET_NAME_LENGTH, 20);
});

test("setPetName apara o nome e grava", () => {
  const { state, error } = setPetName(createInitialState(), "  Fuyu  ");
  assert.equal(error, null);
  assert.equal(state.petName, "Fuyu");
});

test("setPetName rejeita vazio ou só espaços e devolve o estado idêntico", () => {
  const s = createInitialState();
  for (const name of ["", "   ", "\n\t"]) {
    const r = setPetName(s, name);
    assert.equal(r.error, "empty");
    assert.equal(r.state, s);
  }
});

test("setPetName aceita 20 caracteres e rejeita 21 (medindo depois de aparar)", () => {
  const s = createInitialState();
  assert.equal(setPetName(s, "x".repeat(20)).error, null);
  assert.equal(setPetName(s, "  " + "x".repeat(20) + "  ").error, null);
  const r = setPetName(s, "x".repeat(21));
  assert.equal(r.error, "too_long");
  assert.equal(r.state, s);
});

test("setPetName guarda <script> e {pet} como texto literal", () => {
  for (const name of ["<script>x</script>", "{pet}", "{tarefa}", "$&"]) {
    assert.equal(setPetName(createInitialState(), name).state.petName, name);
  }
});

test("setPetName permite trocar o nome e não muta o estado recebido", () => {
  const first = setPetName(createInitialState(), "Fuyu").state;
  const second = setPetName(first, "Kitsune").state;
  assert.equal(first.petName, "Fuyu");
  assert.equal(second.petName, "Kitsune");
});
