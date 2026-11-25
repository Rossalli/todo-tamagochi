import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENERGY_MAX,
  SLEEP_AFTER_MS,
  SLEEPY_WINDOW_MS,
  addTask,
  applyTime,
  completeTask,
  createInitialState,
  energyStatus,
  uncompleteTask,
} from "../src/state.js";

const HOUR = 60 * 60 * 1000;
const withTask = () => addTask(createInitialState(), "x", "t1").state;
const done1 = (now) => completeTask(withTask(), "t1", now);

test("constantes de energia: 10 níveis, dorme após 48h, aviso nas últimas 12h", () => {
  assert.equal(ENERGY_MAX, 10);
  assert.equal(SLEEP_AFTER_MS, 48 * HOUR);
  assert.equal(SLEEPY_WINDOW_MS, 12 * HOUR);
});

test("estado inicial: energia 0, sem atividade, acordada", () => {
  const s = createInitialState();
  assert.equal(s.energy, 0);
  assert.equal(s.lastActivityAt, null);
  assert.equal(s.asleep, false);
});

test("concluir soma 1 de energia, reinicia o relógio e acorda", () => {
  const s = done1(5000);
  assert.equal(s.energy, 1);
  assert.equal(s.lastActivityAt, 5000);
  assert.equal(s.asleep, false);
});

test("a energia não passa do máximo", () => {
  let s = createInitialState();
  for (let i = 1; i <= 15; i++) {
    s = addTask(s, `t${i}`, `t${i}`).state;
    s = completeTask(s, `t${i}`, i);
  }
  assert.equal(s.energy, ENERGY_MAX);
});

test("concluir com a raposa dormindo acorda e começa de 1", () => {
  const sleeping = { ...withTask(), energy: 0, asleep: true, lastActivityAt: 1 };
  const s = completeTask(sleeping, "t1", 99);
  assert.equal(s.asleep, false);
  assert.equal(s.energy, 1);
  assert.equal(s.lastActivityAt, 99);
});

test("desmarcar tira 1 de energia (mínimo 0) sem mexer no relógio nem no sono", () => {
  const s = uncompleteTask(done1(5000), "t1");
  assert.equal(s.energy, 0);
  assert.equal(s.lastActivityAt, 5000);
  assert.equal(s.asleep, false);
  const zero = { ...done1(1), energy: 0 };
  assert.equal(uncompleteTask(zero, "t1").energy, 0);
});

// ---- applyTime ----

test("applyTime: sem atividade registrada, nunca dorme", () => {
  const s = createInitialState();
  assert.equal(applyTime(s, 1e15), s);
});

test("applyTime: antes de 48h nada muda; aos 48h exatos zera de uma vez e dorme", () => {
  const s = { ...done1(0), energy: 7 };
  assert.equal(applyTime(s, 48 * HOUR - 1), s);
  const slept = applyTime(s, 48 * HOUR);
  assert.equal(slept.asleep, true);
  assert.equal(slept.energy, 0);
  assert.equal(slept.lastActivityAt, 0);
  assert.equal(applyTime(s, 500 * HOUR).energy, 0);
});

test("applyTime: já dormindo não muda; relógio andando para trás não dorme; não muta", () => {
  const sleeping = { ...done1(0), asleep: true, energy: 0 };
  assert.equal(applyTime(sleeping, 999 * HOUR), sleeping);
  const s = done1(10 * HOUR);
  assert.equal(applyTime(s, 0), s);
  const fresh = done1(0);
  applyTime(fresh, 100 * HOUR);
  assert.equal(fresh.asleep, false);
  assert.equal(fresh.energy, 1);
});

// ---- energyStatus ----

test("energyStatus: nova, ok, com sono, dormindo", () => {
  assert.deepEqual(energyStatus(createInitialState(), 5), { kind: "new" });
  const s = done1(0);
  assert.deepEqual(energyStatus(s, 1 * HOUR), { kind: "ok" });
  assert.deepEqual(energyStatus(s, 36 * HOUR - 60000), { kind: "ok" });
  assert.deepEqual(energyStatus(s, 36 * HOUR), { kind: "sleepy", hoursLeft: 12 });
  assert.deepEqual(energyStatus(s, 47 * HOUR + 30 * 60000), { kind: "sleepy", hoursLeft: 1 });
  assert.deepEqual(energyStatus(s, 48 * HOUR), { kind: "asleep" });
  assert.deepEqual(energyStatus({ ...s, asleep: true }, 1), { kind: "asleep" });
});
