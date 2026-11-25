import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FRASES } from "../src/data/frases.js";
import {
  RECENT_WINDOW,
  phraseIds,
  templateOf,
  fillTemplate,
  pushRecent,
  pickPhraseId,
  writeEntry,
} from "../src/diary.js";

// rng determinístico para os testes (mulberry32)
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- dados ----

test("FRASES tem 40/40/10/10 e bate com docs/ideas/frases.json", () => {
  assert.deepEqual(
    ["A", "B", "C", "D"].map((g) => FRASES[g].length),
    [40, 40, 10, 10],
  );
  const doc = JSON.parse(readFileSync(new URL("../docs/ideas/frases.json", import.meta.url), "utf8"));
  for (const g of ["A", "B", "C", "D"]) assert.deepEqual(FRASES[g], doc[g], g);
});

test("toda frase usa só as variáveis {pet}, {tarefa} e {item}", () => {
  for (const g of ["A", "B", "C", "D"]) {
    FRASES[g].forEach((t, i) => {
      for (const [, name] of t.matchAll(/\{(\w+)\}/g)) {
        assert.ok(["pet", "tarefa", "item"].includes(name), `${g}${i}: {${name}}`);
      }
    });
  }
});

test("só o grupo B usa {item}, e todas as frases de B usam", () => {
  for (const g of ["A", "C", "D"]) {
    FRASES[g].forEach((t, i) => assert.ok(!t.includes("{item}"), `${g}${i}`));
  }
  FRASES.B.forEach((t, i) => assert.ok(t.includes("{item}"), `B${i}`));
});

test("todas as frases de A e B usam {tarefa} e {pet}", () => {
  for (const g of ["A", "B"]) {
    FRASES[g].forEach((t, i) => {
      assert.ok(t.includes("{tarefa}"), `${g}${i} sem {tarefa}`);
      assert.ok(t.includes("{pet}"), `${g}${i} sem {pet}`);
    });
  }
});

test("phraseIds e templateOf usam grupo + índice", () => {
  assert.deepEqual(phraseIds(["C"]), ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]);
  assert.equal(phraseIds(["A", "B"]).length, 80);
  assert.equal(templateOf("B12"), FRASES.B[12]);
});

// ---- fillTemplate ----

test("fillTemplate substitui todas as ocorrências", () => {
  const out = fillTemplate("{pet} e {pet} fizeram “{tarefa}” com {item}", {
    pet: "Fuyu", tarefa: "lavar", item: "coroa",
  });
  assert.equal(out, "Fuyu e Fuyu fizeram “lavar” com coroa");
});

test("fillTemplate não reprocessa valores: {pet} dentro da tarefa fica literal", () => {
  const out = fillTemplate("{pet} fez “{tarefa}”", { pet: "Fuyu", tarefa: "{pet} {item} {tarefa}" });
  assert.equal(out, "Fuyu fez “{pet} {item} {tarefa}”");
});

test("fillTemplate mantém <script> e padrões de replace ($&, $1) como texto", () => {
  const out = fillTemplate("“{tarefa}”", { pet: "x", tarefa: "<script>alert(1)</script> $& $1 $$" });
  assert.equal(out, "“<script>alert(1)</script> $& $1 $$”");
});

test("fillTemplate com nome contendo {tarefa} não é reprocessado", () => {
  assert.equal(fillTemplate("{pet}: {tarefa}", { pet: "{tarefa}", tarefa: "ok" }), "{tarefa}: ok");
});

test("nenhuma frase deixa variável sem substituir", () => {
  const vars = { pet: "Fuyu", tarefa: "regar", item: "coroa" };
  for (const id of phraseIds(["A", "B", "C", "D"])) {
    assert.ok(!/\{\w+\}/.test(fillTemplate(templateOf(id), vars)), id);
  }
});

// ---- pushRecent ----

test("pushRecent põe o mais novo primeiro, sem duplicar, limitado a 10", () => {
  assert.deepEqual(pushRecent(["A1", "A2"], "A3"), ["A3", "A1", "A2"]);
  assert.deepEqual(pushRecent(["A1", "A2", "A3"], "A2"), ["A2", "A1", "A3"]);
  let r = [];
  for (let i = 0; i < 25; i++) r = pushRecent(r, `A${i}`);
  assert.equal(r.length, RECENT_WINDOW);
  assert.equal(r[0], "A24");
});

test("pushRecent não muta a lista recebida", () => {
  const r = ["A1"];
  pushRecent(r, "A2");
  assert.deepEqual(r, ["A1"]);
});

// ---- pickPhraseId ----

test("200 sorteios seguidos nunca repetem dentro das últimas 10", () => {
  const rng = seeded(42);
  let recent = [];
  const history = [];
  for (let i = 0; i < 200; i++) {
    const id = pickPhraseId(["A", "B"], recent, rng);
    assert.ok(!history.slice(-RECENT_WINDOW).includes(id), `repetiu ${id} no sorteio ${i}`);
    history.push(id);
    recent = pushRecent(recent, id);
  }
});

test("só A: nunca sorteia B; A+B: sorteia dos dois", () => {
  const rng = seeded(7);
  const onlyA = new Set();
  const both = new Set();
  for (let i = 0; i < 300; i++) {
    onlyA.add(pickPhraseId(["A"], [], rng)[0]);
    both.add(pickPhraseId(["A", "B"], [], rng)[0]);
  }
  assert.deepEqual([...onlyA], ["A"]);
  assert.deepEqual([...both].sort(), ["A", "B"]);
});

test("rng controla a escolha: 0 pega o primeiro, quase 1 pega o último, 1 não estoura", () => {
  assert.equal(pickPhraseId(["C"], [], () => 0), "C0");
  assert.equal(pickPhraseId(["C"], [], () => 0.999999), "C9");
  assert.equal(pickPhraseId(["C"], [], () => 1), "C9");
});

test("grupo menor que a janela repete só o necessário e nunca lança", () => {
  // C tem 10 frases; as 9 mais recentes de C estão na janela: sobra só C0.
  const recent = ["C9", "C8", "C7", "C6", "C5", "C4", "C3", "C2", "C1", "A1"];
  assert.equal(pickPhraseId(["C"], recent, () => 0.5), "C0");
  // janela cheia de C: o mais recente é o único excluído além dos 8 seguintes
  const allC = ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"];
  const id = pickPhraseId(["C"], allC, () => 0.5);
  assert.ok(id.startsWith("C"));
  assert.ok(!allC.slice(0, 9).includes(id));
});

test("ignora ids recentes de outros grupos ao esvaziar a janela", () => {
  const recent = ["A1", "A2", "B3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];
  const id = pickPhraseId(["C"], recent, seeded(1));
  assert.ok(id.startsWith("C"));
});

// ---- writeEntry ----

test("writeEntry 'complete' sem item usa A e mostra a tarefa e o nome", () => {
  const e = writeEntry({ kind: "complete", pet: "Fuyu", tarefa: "regar a planta", recent: [], rng: seeded(3) });
  assert.ok(e.phraseId.startsWith("A"));
  assert.ok(e.text.includes("regar a planta"));
  assert.ok(e.text.includes("Fuyu"));
});

test("writeEntry 'complete' com item pode usar B e então cita o item", () => {
  const rng = seeded(11);
  let sawB = false;
  for (let i = 0; i < 60; i++) {
    const e = writeEntry({ kind: "complete", pet: "Fuyu", tarefa: "x", item: "coroa", recent: [], rng });
    assert.ok(/^[AB]/.test(e.phraseId));
    if (e.phraseId.startsWith("B")) {
      sawB = true;
      assert.ok(e.text.includes("coroa"));
    }
  }
  assert.ok(sawB);
});

test("writeEntry 'milestone' usa D e 'return' usa C", () => {
  const base = { pet: "Fuyu", tarefa: "x", recent: [], rng: seeded(5) };
  assert.ok(writeEntry({ ...base, kind: "milestone" }).phraseId.startsWith("D"));
  assert.ok(writeEntry({ ...base, kind: "return" }).phraseId.startsWith("C"));
});

test("writeEntry com tarefa maliciosa devolve o texto literal", () => {
  const e = writeEntry({
    kind: "complete", pet: "Fuyu", tarefa: "<img src=x onerror=1> {pet}", recent: [], rng: seeded(9),
  });
  assert.ok(e.text.includes("<img src=x onerror=1> {pet}"));
});

test("writeEntry com kind desconhecido lança erro claro", () => {
  assert.throws(() => writeEntry({ kind: "xyz", pet: "a", tarefa: "b", recent: [] }), /kind/);
});

test("nenhuma frase usa adjetivo ou título com marca de gênero", () => {
  const gendered = /\b(parad[oa]|emocionad[oa]|estilos[oa]|pront[oa]|grat[oa]|orgulhos[oa]|poderos[oa]|ansios[oa]|sozinh[oa]|cansad[oa]|animad[oa]|sortud[oa]|ofuscad[oa]|satisfeit[oa]|convencid[oa]|mestre)\b/i;
  // "concluída" colada ao texto da tarefa não concorda quando ela é um infinitivo
  // ("lavar a louça" concluída). "Tarefa concluída: “…”" está certo.
  const glued = /(”|})\s*,?\s*(recém-)?concluíd[oa]/i;
  for (const g of ["A", "B", "C", "D"]) {
    FRASES[g].forEach((t, i) => {
      assert.ok(!gendered.test(t), `${g}${i}: ${t}`);
      assert.ok(!glued.test(t), `${g}${i}: ${t}`);
    });
  }
});
