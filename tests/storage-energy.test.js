import { test } from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, load, save } from "../src/storage.js";
import { createInitialState } from "../src/state.js";

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

const storageWith = (value) => new FakeStorage({ [STORAGE_KEY]: JSON.stringify(value) });

test("energia, relógio e sono fazem round-trip", () => {
  const s = { ...createInitialState(), energy: 4, lastActivityAt: 123456, asleep: true };
  const st = new FakeStorage();
  save(s, st);
  const back = load(st);
  assert.equal(back.energy, 4);
  assert.equal(back.lastActivityAt, 123456);
  assert.equal(back.asleep, true);
});

test("energia, relógio e sono inválidos voltam ao padrão", () => {
  const bad = load(storageWith({ schema: 1, energy: -1, lastActivityAt: "ontem", asleep: "sim" }));
  assert.equal(bad.energy, 0);
  assert.equal(bad.lastActivityAt, null);
  assert.equal(bad.asleep, false);
  assert.equal(load(storageWith({ schema: 1, energy: 11 })).energy, 0);
  assert.equal(load(storageWith({ schema: 1, energy: 2.5 })).energy, 0);
});

test("saves antigos, sem os campos de energia, carregam com o padrão", () => {
  const old = load(storageWith({ schema: 1, completed: 7 }));
  assert.equal(old.completed, 7);
  assert.equal(old.energy, 0);
  assert.equal(old.lastActivityAt, null);
  assert.equal(old.asleep, false);
});
