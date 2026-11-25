import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../src/data/items.js";
import { FRAME_MARGIN as M, composeFrame } from "../src/sprites.js";

const BODY_STAGES = ["baby", "pup", "young", "adult"];
const EYE_ROW = { adult: 6, young: 6, pup: 9, baby: 12 };
const NOSE_ROW = { adult: 8, young: 8, pup: 11, baby: 13 };

test("dormindo: olhos fechados em traços de 2 pixels, em todos os estágios com corpo", () => {
  for (const stage of BODY_STAGES) {
    const awake = composeFrame(stage);
    const asleep = composeFrame(stage, {}, { asleep: true });
    const y = EYE_ROW[stage];
    assert.equal(awake[y][4 + M], "k", `${stage}: olho aberto`);
    for (const x of [4, 5, 10, 11]) assert.equal(asleep[y][x + M], "o", `${stage}: traço em x=${x}`);
  }
});

test("dormindo: o nariz não muda", () => {
  for (const stage of BODY_STAGES) {
    const awake = composeFrame(stage);
    const asleep = composeFrame(stage, {}, { asleep: true });
    for (const x of [7, 8]) {
      assert.equal(asleep[NOSE_ROW[stage]][x + M], awake[NOSE_ROW[stage]][x + M], `${stage}: x=${x}`);
    }
  }
});

test("dormindo: aparece o Z na margem direita, também no ovo", () => {
  for (const stage of ["egg", ...BODY_STAGES]) {
    const asleep = composeFrame(stage, {}, { asleep: true });
    const awake = composeFrame(stage);
    assert.notDeepEqual(asleep, awake, stage);
    // Um Z de verdade: barra em cima, diagonal descendo para a esquerda, barra embaixo.
    const z = [
      [15, 0], [16, 0], [17, 0],
      [17, 1],
      [16, 2],
      [15, 3],
      [15, 4], [16, 4], [17, 4],
    ];
    for (const [x, y] of z) assert.equal(asleep[y][x + M], "b", `${stage}: Z em (${x}, ${y})`);
    // E não um "I": o meio da barra de cima e o canto oposto da diagonal ficam vazios.
    assert.equal(asleep[1][15 + M], awake[1][15 + M], `${stage}: (15, 1) deve ficar vazio`);
    assert.equal(asleep[3][17 + M], awake[3][17 + M], `${stage}: (17, 3) deve ficar vazio`);
  }
});

test("o ovo dormindo só ganha o Z, o resto do quadro fica igual", () => {
  const awake = composeFrame("egg");
  const asleep = composeFrame("egg", {}, { asleep: true });
  const diff = [];
  awake.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (asleep[y][x] !== ch) diff.push([x - M, y]);
    }),
  );
  assert.ok(diff.length > 0);
  assert.ok(diff.every(([x, y]) => x >= 15 && y <= 4), JSON.stringify(diff));
});

test("acordada é o padrão: sem opções, nada muda", () => {
  assert.deepEqual(composeFrame("adult", {}, {}), composeFrame("adult"));
  assert.deepEqual(composeFrame("adult", {}, { asleep: false }), composeFrame("adult"));
});

test("itens continuam aparecendo com a raposa dormindo, por cima dos olhos fechados", () => {
  const glasses = CATALOG.find((i) => i.id === "oculos-sol");
  const frame = composeFrame("adult", { face: glasses }, { asleep: true });
  assert.equal(frame[6][4 + M], glasses.art.adult.grid[0][1]);
});

test("dormindo não muta o sprite base nem o resultado acordado", () => {
  const before = composeFrame("adult");
  composeFrame("adult", {}, { asleep: true });
  assert.deepEqual(composeFrame("adult"), before);
});
