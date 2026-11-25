import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FRASES } from "../src/data/frases.js";
import { CATALOG } from "../src/data/items.js";
import { fillTemplate, phraseIds, templateOf } from "../src/diary.js";
import { activeItems, equip, grantReward, pickItemName, rewardCandidates } from "../src/items.js";
import { STORAGE_KEY, canSave, load, save } from "../src/storage.js";
import {
  addTask,
  completeWithDiary,
  createInitialState,
  setPetName,
  uncompleteWithDiary,
} from "../src/state.js";

const root = fileURLToPath(new URL("../", import.meta.url));

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".js") ? [path] : [];
  });
}
const sources = sourceFiles(join(root, "src")).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const indexHtml = readFileSync(join(root, "index.html"), "utf8");

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
  removeItem(k) {
    delete this.data[k];
  }
}

const HOSTILE = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "</b>{pet}",
  "{pet}",
  "{tarefa}",
  "{item}",
  "$&",
  "$1",
  "$$",
  "$`",
  "😀🦊",
  "x".repeat(80),
  "a\nb",
  "‮abc",
];

// ---- o código nunca cria HTML nem fala com a rede ----

test("o código-fonte não usa APIs que interpretam texto como HTML ou código", () => {
  const forbidden = [
    /\binnerHTML\b/, /\bouterHTML\b/, /insertAdjacentHTML/, /document\.write/,
    /\beval\s*\(/, /new Function\s*\(/, /\bimport\s*\(/,
  ];
  for (const { path, text } of sources) {
    for (const pattern of forbidden) assert.ok(!pattern.test(text), `${path}: ${pattern}`);
  }
});

test("os dados da pessoa nunca saem do navegador: sem rede e sem URLs externas", () => {
  const network = [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /EventSource/, /https?:\/\//];
  for (const { path, text } of sources) {
    for (const pattern of network) assert.ok(!pattern.test(text), `${path}: ${pattern}`);
  }
  assert.ok(!/https?:\/\//.test(indexHtml), "index.html aponta para uma URL externa");
});

test("a página não tem scripts inline nem manipuladores de evento inline", () => {
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(indexHtml), "script inline");
  assert.ok(!/\son[a-z]+\s*=/.test(indexHtml), "manipulador inline (onclick=...)");
});

// ---- texto hostil: nunca vira HTML nem variável ----

test("fillTemplate: toda frase com qualquer combinação hostil bate com a referência literal", () => {
  const reference = (template, v) =>
    template
      .split(/(\{pet\}|\{tarefa\}|\{item\})/)
      .map((p) => (p === "{pet}" ? v.pet : p === "{tarefa}" ? v.tarefa : p === "{item}" ? v.item : p))
      .join("");
  const ids = phraseIds(["A", "B", "C", "D"]);
  assert.equal(ids.length, 100);
  for (const id of ids) {
    const template = templateOf(id);
    for (const pet of HOSTILE) {
      for (const tarefa of HOSTILE) {
        for (const item of ["coroa", ...HOSTILE]) {
          const vars = { pet, tarefa, item };
          assert.equal(fillTemplate(template, vars), reference(template, vars), `${id} pet=${pet} tarefa=${tarefa}`);
        }
      }
    }
  }
});

test("de ponta a ponta: tarefa hostil aparece literal no diário e sobrevive ao armazenamento", () => {
  for (const text of HOSTILE) {
    let s = setPetName(createInitialState(), "Fuyu").state;
    s = addTask(s, text, "t1").state;
    s = completeWithDiary(s, "t1", { now: 1, rng: () => 0.3, id: "e1" });
    assert.ok(s.diary[0].text.includes(text.trim()), `diário não tem o texto literal: ${text}`);

    const storage = new FakeStorage();
    assert.equal(save(s, storage), true);
    assert.deepEqual(load(storage).diary, s.diary, `round-trip mudou o diário: ${text}`);
    assert.equal(load(storage).tasks[0].text, text.trim());
  }
});

test("nome hostil aparece literal nas frases e sobrevive ao armazenamento", () => {
  for (const name of HOSTILE.filter((n) => n.length <= 20)) {
    let s = setPetName(createInitialState(), name).state;
    s = addTask(s, "regar", "t1").state;
    s = completeWithDiary(s, "t1", { now: 1, rng: () => 0.3, id: "e1" });
    assert.ok(s.diary[0].text.includes(name.trim()), name);
    const storage = new FakeStorage();
    save(s, storage);
    assert.equal(load(storage).petName, name.trim());
  }
});

// ---- limites: 80 caracteres de verdade, não unidades UTF-16 ----

test("tarefa: 80 caracteres aceitos, 81 rejeitados, contando emojis como 1", () => {
  const s = createInitialState();
  assert.equal(addTask(s, "😀".repeat(80), "a").error, null);
  assert.equal(addTask(s, "😀".repeat(81), "b").error, "too_long");
  assert.equal(addTask(s, "x".repeat(79) + "🦊", "c").error, null);
});

test("nome: 20 caracteres aceitos, 21 rejeitados, contando emojis como 1", () => {
  const s = createInitialState();
  assert.equal(setPetName(s, "🦊".repeat(20)).error, null);
  assert.equal(setPetName(s, "🦊".repeat(21)).error, "too_long");
});

// ---- armazenamento truncado, incompleto ou malicioso ----

function richState() {
  let s = setPetName(createInitialState(), "Fuyu").state;
  s = addTask(s, "regar a planta", "t1").state;
  s = addTask(s, "lavar a louça", "t2").state;
  s = completeWithDiary(s, "t1", { now: 1000, rng: () => 0.3, id: "e1" });
  return {
    ...s,
    completed: 12,
    rewardsGranted: 2,
    owned: ["festa", "oculos-sol", "chupeta"],
    equipped: { head: "festa", face: "oculos-sol", hold: null },
    energy: 5,
  };
}

const SHAPE = Object.keys(createInitialState()).sort();

test("JSON truncado em qualquer ponto nunca lança e devolve um estado completo", () => {
  const json = JSON.stringify(richState());
  for (let n = 0; n < json.length; n++) {
    const storage = new FakeStorage({ [STORAGE_KEY]: json.slice(0, n) });
    let state;
    assert.doesNotThrow(() => {
      state = load(storage);
    }, `lançou ao truncar em ${n}`);
    assert.deepEqual(Object.keys(state).sort(), SHAPE, `forma errada ao truncar em ${n}`);
  }
});

test("o estado completo carrega idêntico (sanidade do teste acima)", () => {
  const original = richState();
  const storage = new FakeStorage();
  save(original, storage);
  assert.deepEqual(load(storage), original);
});

test("faltando qualquer campo, o app carrega com o valor padrão daquele campo", () => {
  const initial = createInitialState();
  const full = richState();
  for (const key of Object.keys(full).filter((k) => k !== "schema")) {
    const partial = { ...full };
    delete partial[key];
    const state = load(new FakeStorage({ [STORAGE_KEY]: JSON.stringify(partial) }));
    assert.deepEqual(Object.keys(state).sort(), SHAPE, `faltando ${key}`);
    assert.deepEqual(state[key], initial[key], `${key} não voltou ao padrão`);
  }
});

test("campos desconhecidos e chaves perigosas são ignorados, sem poluir Object.prototype", () => {
  const evil =
    '{"schema":1,"completed":3,"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}},"extra":"x"}';
  const state = load(new FakeStorage({ [STORAGE_KEY]: evil }));
  assert.equal(state.completed, 3);
  assert.deepEqual(Object.keys(state).sort(), SHAPE);
  assert.equal({}.polluted, undefined);
  assert.equal({}.x, undefined);
});

test("estado carregado de um armazenamento adulterado ainda deixa o app funcionar", () => {
  const tampered = {
    schema: 1,
    completed: 1e9,
    tasks: [{ id: "t1", text: "<b>x</b>", done: false, doneAt: null }],
    owned: ["nao-existe", "festa", "festa"],
    equipped: { head: "zzz", face: "oculos-sol", hold: "festa" },
    energy: 9999,
  };
  let state = load(new FakeStorage({ [STORAGE_KEY]: JSON.stringify(tampered) }));
  assert.doesNotThrow(() => completeWithDiary(state, "t1", { now: 1, rng: () => 0.3, id: "e" }));
  assert.doesNotThrow(() => uncompleteWithDiary(state, "t1"));
  assert.doesNotThrow(() => activeItems(state));
  assert.doesNotThrow(() => pickItemName(state));
  assert.doesNotThrow(() => rewardCandidates(state));
  assert.doesNotThrow(() => equip(state, "nao-existe"));
  assert.doesNotThrow(() => grantReward(state, "nao-existe"));
  state = completeWithDiary(state, "t1", { now: 1, rng: () => 0.3, id: "e" });
  assert.ok(state.diary[0].text.includes("<b>x</b>"));
});

test("item equipado num slot errado ou desconhecido não fica ativo", () => {
  const state = { ...createInitialState(), completed: 30, owned: ["festa"], equipped: { head: null, face: null, hold: "festa" } };
  assert.deepEqual(activeItems(state), { head: null, face: null, hold: null });
  assert.equal(pickItemName(state), undefined);
});

// ---- falha de gravação não pode ser silenciosa ----

test("a página tem um aviso (role=status, escondido) para quando não for possível salvar", () => {
  const tag = indexHtml.match(/<[^>]*id="save-warning"[^>]*>/)?.[0];
  assert.ok(tag, "elemento #save-warning ausente");
  assert.match(tag, /role="status"/);
  assert.match(tag, /\bhidden\b/);
});

test("canSave detecta armazenamento indisponível sem tocar nos dados do app", () => {
  const storage = new FakeStorage({ [STORAGE_KEY]: "dados-que-nao-podem-mudar" });
  assert.equal(canSave(storage), true);
  assert.equal(storage.data[STORAGE_KEY], "dados-que-nao-podem-mudar");
  assert.deepEqual(Object.keys(storage.data), [STORAGE_KEY], "deixou lixo no armazenamento");

  const full = { getItem: () => null, setItem() { throw new Error("QuotaExceededError"); }, removeItem() {} };
  assert.equal(canSave(full), false);
  assert.equal(canSave(undefined), false);
  assert.equal(canSave(null), false);
});

test("o catálogo e as frases continuam consistentes (nada foi perdido nas correções)", () => {
  assert.equal(CATALOG.length, 25);
  assert.deepEqual(["A", "B", "C", "D"].map((g) => FRASES[g].length), [40, 40, 10, 10]);
});
