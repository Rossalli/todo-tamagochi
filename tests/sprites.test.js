import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTE, SPRITES, STAGE_LABEL, spriteFor } from "../src/sprites.js";
import { STAGES } from "../src/state.js";

test("existe um sprite e um rótulo para cada estágio", () => {
  for (const { id } of STAGES) {
    assert.ok(SPRITES[id], `sprite de ${id}`);
    assert.ok(STAGE_LABEL[id], `rótulo de ${id}`);
  }
});

test("todo sprite é uma grade 16x16", () => {
  for (const [id, grid] of Object.entries(SPRITES)) {
    assert.equal(grid.length, 16, `${id}: linhas`);
    grid.forEach((row, i) => assert.equal(row.length, 16, `${id}: linha ${i}`));
  }
});

test("todo sprite só usa '.' ou cores da paleta", () => {
  for (const [id, grid] of Object.entries(SPRITES)) {
    for (const row of grid) {
      for (const ch of row) {
        assert.ok(ch === "." || ch in PALETTE, `${id}: caractere inválido '${ch}'`);
      }
    }
  }
});

test("todo sprite tem pelo menos um pixel desenhado", () => {
  for (const [id, grid] of Object.entries(SPRITES)) {
    assert.ok(grid.join("").replaceAll(".", "").length > 0, id);
  }
});

test("spriteFor devolve a grade do estágio", () => {
  assert.equal(spriteFor("egg"), SPRITES.egg);
  assert.equal(spriteFor("adult"), SPRITES.adult);
});
