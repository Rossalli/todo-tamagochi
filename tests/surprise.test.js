import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_PET_NAME } from "../src/state.js";
import { FRASES } from "../src/data/frases.js";
import { CATALOG } from "../src/data/items.js";
import { STAGE_LABEL } from "../src/sprites.js";

// O que vai chocar do ovo é surpresa: nenhum texto da interface pode revelar a espécie
// antes da hora. Comentários de código não aparecem para a pessoa, então ficam de fora.
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

function withoutComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|\s)\/\/.*$/, ""))
    .join("\n");
}

const SPECIES = /raposa|raposinha|fox/i;

test("nenhum texto da interface revela a espécie (o ovo é surpresa)", () => {
  const files = [
    "README.md", // a vitrine pública do repositório
    "index.html",
    "src/app.js",
    "src/state.js",
    "src/diary.js",
    "src/sprites.js",
    "src/data/frases.js",
    "src/data/items.js",
  ];
  for (const file of files) {
    const text = withoutComments(read(file));
    const match = text.match(SPECIES);
    assert.ok(!match, `${file} revela a espécie: "${match?.[0]}"`);
  }
});

test("o nome padrão não revela a espécie (ele aparece sob o ovo e nas frases)", () => {
  assert.ok(!SPECIES.test(DEFAULT_PET_NAME), DEFAULT_PET_NAME);
});

test("frases, itens e estágios não citam a espécie", () => {
  for (const group of ["A", "B", "C", "D"]) {
    FRASES[group].forEach((phrase, i) => assert.ok(!SPECIES.test(phrase), `${group}${i}: ${phrase}`));
  }
  for (const item of CATALOG) assert.ok(!SPECIES.test(item.name), item.name);
  for (const label of Object.values(STAGE_LABEL)) assert.ok(!SPECIES.test(label), label);
});
