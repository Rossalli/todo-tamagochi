import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../src/data/items.js";
import { FRAME_MARGIN, FRAME_WIDTH, PALETTE, SPRITES, composeFrame } from "../src/sprites.js";

const M = FRAME_MARGIN;
const STAGES_WITH_BODY = ["baby", "pup", "young", "adult"];
const ALLOWED_ART_STAGES = {
  general: ["baby", "pup", "young", "adult"],
  baby: ["baby"],
  pup: ["pup"],
};

// Sprite base já com a margem lateral, como composeFrame devolve sem itens.
const padded = (grid) => grid.map((row) => ".".repeat(M) + row + ".".repeat(M));

// x da arte é relativo à raposa (0 a 15); a margem permite x de -M a 15+M.
const fake = (grid, x, y) => ({ art: { adult: { grid, x, y } } });

test("o quadro tem 2 colunas de margem de cada lado (20x16)", () => {
  assert.equal(FRAME_MARGIN, 2);
  assert.equal(FRAME_WIDTH, 20);
});

// ---- composeFrame ----

test("sem itens, composeFrame devolve o sprite base com margem", () => {
  for (const [stage, grid] of Object.entries(SPRITES)) {
    assert.deepEqual(composeFrame(stage), padded(grid), stage);
    assert.deepEqual(composeFrame(stage, {}), padded(grid), stage);
    assert.deepEqual(composeFrame(stage, { head: null, face: null, hold: null }), padded(grid), stage);
  }
});

test("composeFrame devolve 16 linhas de 20 colunas", () => {
  const frame = composeFrame("adult", { head: fake(["rr", "rr"], 5, 1) });
  assert.equal(frame.length, 16);
  frame.forEach((row) => assert.equal(row.length, FRAME_WIDTH));
});

test("o item sobrepõe os pixels do sprite na posição da âncora (relativa à raposa)", () => {
  const frame = composeFrame("adult", { head: fake(["rb"], 2, 3) });
  assert.equal(frame[3].slice(2 + M, 4 + M), "rb");
  assert.equal(frame[3][1 + M], SPRITES.adult[3][1]);
  assert.equal(frame[3][4 + M], SPRITES.adult[3][4]);
});

test("'.' na arte do item é transparente", () => {
  const frame = composeFrame("adult", { head: fake(["r.r"], 5, 5) });
  assert.equal(frame[5][6 + M], SPRITES.adult[5][6]);
  assert.equal(frame[5][5 + M], "r");
  assert.equal(frame[5][7 + M], "r");
});

test("ordem das camadas: cabeça sobre rosto sobre mão", () => {
  const frame = composeFrame("adult", {
    hold: fake(["h"], 7, 7),
    face: fake(["fh", "f."], 6, 7),
    head: fake(["g"], 7, 7),
  });
  assert.equal(frame[7][7 + M], "g"); // cabeça vence
  assert.equal(frame[7][6 + M], "f"); // rosto onde só ele desenha
  assert.equal(frame[8][6 + M], "f");
});

test("rosto cobre a mão onde se sobrepõem", () => {
  const frame = composeFrame("adult", { hold: fake(["h"], 7, 7), face: fake(["f"], 7, 7) });
  assert.equal(frame[7][7 + M], "f");
});

test("a margem é usada: x negativo cai na coluna da margem esquerda", () => {
  const frame = composeFrame("adult", { hold: fake(["r"], -M, 10) });
  assert.equal(frame[10][0], "r");
  const right = composeFrame("adult", { hold: fake(["r"], 15 + M, 10) });
  assert.equal(right[10][FRAME_WIDTH - 1], "r");
});

test("pixels além da margem ou fora das linhas são cortados sem lançar erro", () => {
  const frame = composeFrame("adult", {
    head: fake(["rr", "rr"], 15 + M, -1),
    face: fake(["bb"], -M - 1, 15),
  });
  assert.equal(frame.length, 16);
  assert.equal(frame[0][FRAME_WIDTH - 1], "r");
  assert.equal(frame[15][0], "b");
  frame.forEach((row) => assert.equal(row.length, FRAME_WIDTH));
});

test("item sem arte para o estágio não muda nada", () => {
  const noArt = { name: "sem arte" };
  const onlyPup = { art: { pup: { grid: ["r"], x: 0, y: 0 } } };
  assert.deepEqual(composeFrame("adult", { head: noArt, face: onlyPup }), padded(SPRITES.adult));
});

test("composeFrame não muta o sprite base", () => {
  const before = [...SPRITES.adult];
  composeFrame("adult", { head: fake(["rr"], 5, 5) });
  assert.deepEqual(SPRITES.adult, before);
});

// ---- arte do catálogo ----

test("itens de prova (festa, óculos de sol, pirulito) têm arte nos 4 estágios com corpo", () => {
  for (const id of ["festa", "oculos-sol", "pirulito"]) {
    const item = CATALOG.find((i) => i.id === id);
    assert.ok(item?.art, `${id} sem arte`);
    for (const stage of STAGES_WITH_BODY) assert.ok(item.art[stage], `${id} sem arte no ${stage}`);
  }
});

test("arte só existe nos estágios em que o item pode ser usado (nunca no ovo)", () => {
  for (const item of CATALOG.filter((i) => i.art)) {
    for (const stage of Object.keys(item.art)) {
      assert.ok(ALLOWED_ART_STAGES[item.scope].includes(stage), `${item.id} tem arte no ${stage}`);
    }
    assert.ok(!("egg" in item.art), `${item.id} tem arte no ovo`);
  }
});

test("toda arte usa só '.' ou cores da paleta, com linhas do mesmo tamanho", () => {
  for (const item of CATALOG.filter((i) => i.art)) {
    for (const [stage, art] of Object.entries(item.art)) {
      const width = art.grid[0].length;
      art.grid.forEach((row, i) => {
        assert.equal(row.length, width, `${item.id}/${stage}: linha ${i}`);
        for (const ch of row) assert.ok(ch === "." || ch in PALETTE, `${item.id}/${stage}: '${ch}'`);
      });
    }
  }
});

test("toda arte cabe no quadro: cabeça e rosto dentro da raposa, mão podendo usar a margem", () => {
  for (const item of CATALOG.filter((i) => i.art)) {
    const [minX, maxX] = item.slot === "hold" ? [-M, 16 + M] : [0, 16];
    for (const [stage, art] of Object.entries(item.art)) {
      const w = art.grid[0].length;
      const h = art.grid.length;
      assert.ok(art.x >= minX && art.x + w <= maxX, `${item.id}/${stage}: x=${art.x} largura=${w}`);
      assert.ok(art.y >= 0 && art.y + h <= 16, `${item.id}/${stage}: y=${art.y} altura=${h}`);
    }
  }
});

test("item de mão nunca cobre pixels da raposa (fica ao lado do corpo)", () => {
  for (const item of CATALOG.filter((i) => i.art && i.slot === "hold")) {
    for (const [stage, art] of Object.entries(item.art)) {
      const base = padded(SPRITES[stage]);
      art.grid.forEach((line, dy) => {
        [...line].forEach((ch, dx) => {
          if (ch === ".") return;
          const under = base[art.y + dy][art.x + M + dx];
          assert.equal(under, ".", `${item.id}/${stage}: cobre a raposa em (${art.x + dx}, ${art.y + dy})`);
        });
      });
    }
  }
});

test("a arte realmente aparece no quadro composto de cada estágio", () => {
  for (const item of CATALOG.filter((i) => i.art)) {
    for (const stage of Object.keys(item.art)) {
      const frame = composeFrame(stage, { [item.slot]: item });
      assert.notDeepEqual(frame, padded(SPRITES[stage]), `${item.id}/${stage}`);
    }
  }
});

const EYE_ROW = { adult: 6, young: 6, pup: 9, baby: 12 };

test("os 7 itens de cabeça gerais têm arte nos 4 estágios com corpo", () => {
  const ids = ["festa", "coroa", "gorro", "bone", "pirata", "laco", "flor"];
  for (const id of ids) {
    const item = CATALOG.find((i) => i.id === id);
    assert.equal(item?.slot, "head", id);
    for (const stage of STAGES_WITH_BODY) assert.ok(item.art?.[stage], `${id} sem arte no ${stage}`);
  }
});

test("todo item geral com arte tem arte nos 4 estágios com corpo", () => {
  for (const item of CATALOG.filter((i) => i.art && i.scope === "general")) {
    for (const stage of STAGES_WITH_BODY) assert.ok(item.art[stage], `${item.id} sem arte no ${stage}`);
  }
});

test("nenhum item de cabeça invade a linha dos olhos, em nenhum estágio", () => {
  for (const item of CATALOG.filter((i) => i.art && i.slot === "head")) {
    for (const [stage, art] of Object.entries(item.art)) {
      assert.ok(art.y + art.grid.length - 1 < EYE_ROW[stage], `${item.id} invade os olhos no ${stage}`);
    }
  }
});

const NOSE_ROW = { adult: 8, young: 8, pup: 11, baby: 13 };
const CHIN_ROW = { adult: 9, young: 9, pup: 12, baby: 14 };

test("os 5 itens de rosto e os 5 de mão gerais têm arte nos 4 estágios com corpo", () => {
  const ids = [
    "oculos-sol", "oculos-redondos", "bigode", "mascara", "monoculo",
    "balao", "pirulito", "livro", "cafe", "estrelinha",
  ];
  for (const id of ids) {
    const item = CATALOG.find((i) => i.id === id);
    for (const stage of STAGES_WITH_BODY) assert.ok(item.art?.[stage], `${id} sem arte no ${stage}`);
  }
});

test("itens de rosto ficam entre a testa e o queixo (podem pender uma linha abaixo dele)", () => {
  for (const item of CATALOG.filter((i) => i.art && i.slot === "face")) {
    for (const [stage, art] of Object.entries(item.art)) {
      assert.ok(art.y >= EYE_ROW[stage] - 1, `${item.id} sobe demais no ${stage}`);
      assert.ok(art.y + art.grid.length - 1 <= CHIN_ROW[stage] + 1, `${item.id} desce demais no ${stage}`);
    }
  }
});

test("itens de rosto nunca cobrem o nariz", () => {
  for (const item of CATALOG.filter((i) => i.art && i.slot === "face")) {
    for (const stage of Object.keys(item.art)) {
      const frame = composeFrame(stage, { face: item });
      const base = padded(SPRITES[stage]);
      for (const col of [7, 8]) {
        assert.equal(
          frame[NOSE_ROW[stage]][col + M],
          base[NOSE_ROW[stage]][col + M],
          `${item.id} cobre o nariz no ${stage}`,
        );
      }
    }
  }
});

test("óculos, máscara e monóculo cobrem a linha dos olhos; o bigode não", () => {
  for (const id of ["oculos-sol", "oculos-redondos", "mascara", "monoculo"]) {
    const item = CATALOG.find((i) => i.id === id);
    for (const [stage, art] of Object.entries(item.art)) {
      const eye = EYE_ROW[stage];
      assert.ok(art.y <= eye && eye < art.y + art.grid.length, `${id} fora dos olhos no ${stage}`);
    }
  }
  const bigode = CATALOG.find((i) => i.id === "bigode");
  for (const [stage, art] of Object.entries(bigode.art)) {
    assert.ok(art.y > EYE_ROW[stage], `bigode alcança os olhos no ${stage}`);
  }
});

test("itens de rosto do mesmo estágio não são visualmente idênticos", () => {
  for (const stage of STAGES_WITH_BODY) {
    const faces = itemsAt("face", stage);
    const frames = faces.map((i) => composeFrame(stage, { face: i }).join("\n"));
    assert.equal(new Set(frames).size, faces.length, `dois itens de rosto iguais no ${stage}`);
  }
});

test("itens de mão do mesmo estágio não são visualmente idênticos", () => {
  for (const stage of STAGES_WITH_BODY) {
    const holds = itemsAt("hold", stage);
    const frames = holds.map((i) => composeFrame(stage, { hold: i }).join("\n"));
    assert.equal(new Set(frames).size, holds.length, `dois itens de mão iguais no ${stage}`);
  }
});

// Itens de um slot que existem naquele estágio (os de outro estágio não têm arte nele).
const itemsAt = (slot, stage) => CATALOG.filter((i) => i.slot === slot && i.art?.[stage]);

test("itens de cabeça do mesmo estágio não são visualmente idênticos", () => {
  for (const stage of STAGES_WITH_BODY) {
    const heads = itemsAt("head", stage);
    const frames = heads.map((i) => composeFrame(stage, { head: i }).join("\n"));
    assert.equal(new Set(frames).size, heads.length, `dois itens de cabeça iguais no ${stage}`);
  }
});

test("os 8 itens exclusivos de estágio têm arte só no estágio deles", () => {
  const expected = {
    touquinha: "baby", chupeta: "baby", chocalho: "baby", ursinho: "baby",
    fita: "pup", "bigode-leite": "pup", bola: "pup", osso: "pup",
  };
  for (const [id, stage] of Object.entries(expected)) {
    const item = CATALOG.find((i) => i.id === id);
    assert.equal(item.scope, stage, `${id}: escopo`);
    assert.deepEqual(Object.keys(item.art ?? {}), [stage], `${id}: estágios com arte`);
  }
});

test("cada estágio com item exclusivo tem um de cada tipo (cabeça, rosto e 2 de mão)", () => {
  for (const stage of ["baby", "pup"]) {
    const own = CATALOG.filter((i) => i.scope === stage);
    assert.deepEqual(own.map((i) => i.slot).sort(), ["face", "head", "hold", "hold"]);
  }
});
