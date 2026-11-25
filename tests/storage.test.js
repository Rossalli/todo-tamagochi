import { test } from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, load, save } from "../src/storage.js";
import { createInitialState, addTask, completeTask } from "../src/state.js";

class FakeStorage {
  constructor(initial = {}) {
    this.data = { ...initial };
  }
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  }
  setItem(k, v) {
    this.data[k] = String(v);
  }
}

const throwing = (which) => ({
  getItem() {
    if (which === "get") throw new Error("SecurityError");
    return null;
  },
  setItem() {
    if (which === "set") throw new Error("QuotaExceededError");
  },
});

const storageWith = (value) => new FakeStorage({ [STORAGE_KEY]: value });
const fresh = createInitialState();

test("a chave é todo-tamagochi:v1", () => {
  assert.equal(STORAGE_KEY, "todo-tamagochi:v1");
});

test("round-trip preserva o estado", () => {
  let s = addTask(createInitialState(), "lavar a louça", "t1").state;
  s = completeTask(s, "t1", 1000);
  s = { ...s, petName: "Fuyu", owned: ["festa"], equipped: { head: "festa", face: null, hold: null } };
  const st = new FakeStorage();
  assert.equal(save(s, st), true);
  assert.deepEqual(load(st), s);
});

test("save grava JSON sob a chave certa", () => {
  const st = new FakeStorage();
  save(fresh, st);
  assert.deepEqual(JSON.parse(st.data[STORAGE_KEY]), fresh);
});

test("storage vazio devolve o estado inicial", () => {
  assert.deepEqual(load(new FakeStorage()), fresh);
});

test("JSON inválido devolve o estado inicial", () => {
  for (const bad of ["{oops", "", "undefined", '{"schema":1,']) {
    assert.deepEqual(load(storageWith(bad)), fresh, bad);
  }
});

test("JSON que não é objeto devolve o estado inicial", () => {
  for (const bad of ["42", "null", "[]", '"texto"', "true"]) {
    assert.deepEqual(load(storageWith(bad)), fresh, bad);
  }
});

test("schema ausente, futuro ou de outro tipo devolve o estado inicial", () => {
  const withSchema = (schema) =>
    JSON.stringify({ ...(schema === undefined ? {} : { schema }), completed: 99 });
  for (const schema of [undefined, 2, 0, "1", null]) {
    assert.deepEqual(load(storageWith(withSchema(schema))), fresh, String(schema));
  }
});

test("campos faltando são preenchidos com o padrão", () => {
  const s = load(storageWith(JSON.stringify({ schema: 1, completed: 4 })));
  assert.equal(s.completed, 4);
  assert.deepEqual(s.tasks, []);
  assert.deepEqual(s.equipped, { head: null, face: null, hold: null });
  assert.equal(s.petName, null);
});

test("campos com tipo errado voltam ao padrão", () => {
  const s = load(
    storageWith(
      JSON.stringify({
        schema: 1,
        tasks: "não sou lista",
        completed: -3,
        rewardsGranted: "5",
        owned: "festa",
        equipped: "nada",
        diary: 7,
        recentPhrases: {},
        lastOpenAt: "ontem",
        petName: 42,
      }),
    ),
  );
  assert.deepEqual(s, fresh);
});

test("completed fracionário ou NaN voltam ao padrão", () => {
  assert.equal(load(storageWith(JSON.stringify({ schema: 1, completed: 2.5 }))).completed, 0);
  assert.equal(load(storageWith('{"schema":1,"completed":null}')).completed, 0);
});

test("tarefas inválidas são descartadas e as válidas ficam", () => {
  const good = { id: "a", text: "ok", done: true, doneAt: 5 };
  const s = load(
    storageWith(
      JSON.stringify({
        schema: 1,
        tasks: [good, null, 7, { id: "b" }, { id: 1, text: "x", done: false }, { id: "c", text: "y", done: "sim" }],
      }),
    ),
  );
  assert.deepEqual(s.tasks, [good]);
});

test("entradas de diário inválidas são descartadas", () => {
  const good = { id: "d1", taskId: "a", text: "frase", at: 10 };
  const s = load(storageWith(JSON.stringify({ schema: 1, diary: [good, {}, "x", { id: "d2", text: 3 }] })));
  assert.deepEqual(s.diary, [good]);
});

test("equipped aceita só strings ou null por slot", () => {
  const s = load(storageWith(JSON.stringify({ schema: 1, equipped: { head: "festa", face: 9, extra: "x" } })));
  assert.deepEqual(s.equipped, { head: "festa", face: null, hold: null });
});

test("sem localStorage disponível: load devolve inicial e save devolve false", () => {
  assert.deepEqual(load(undefined), fresh);
  assert.deepEqual(load(null), fresh);
  assert.equal(save(fresh, undefined), false);
});

test("getItem que lança não quebra o load", () => {
  assert.deepEqual(load(throwing("get")), fresh);
});

test("setItem que lança (cota cheia) não quebra o save", () => {
  assert.equal(save(fresh, throwing("set")), false);
});

test("petName vazio ou só com espaços vindo do storage vira null", () => {
  for (const petName of ["", "   ", "\n"]) {
    assert.equal(load(storageWith(JSON.stringify({ schema: 1, petName }))).petName, null, JSON.stringify(petName));
  }
  assert.equal(load(storageWith(JSON.stringify({ schema: 1, petName: "Fuyu" }))).petName, "Fuyu");
});
