import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const workflowPath = new URL(".github/workflows/test.yml", root);

function workflow() {
  assert.ok(existsSync(workflowPath), ".github/workflows/test.yml não existe");
  return readFileSync(workflowPath, "utf8");
}

test("o workflow de testes roda a cada push na main e em todo pull request", () => {
  const yml = workflow();
  assert.match(yml, /^on:/m);
  assert.match(yml, /push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(yml, /pull_request:/);
});

test("o workflow roda npm test", () => {
  assert.match(workflow(), /run:\s*npm test/);
});

test("o workflow testa nas versões 20, 22 e 24 do Node (a spec promete Node 20 ou mais novo)", () => {
  const yml = workflow();
  assert.match(yml, /node:\s*\[20,\s*22,\s*24\]/);
  assert.match(yml, /node-version:\s*\$\{\{\s*matrix\.node\s*\}\}/);
});

test("o workflow usa o mínimo de permissões (só leitura) e não usa segredos", () => {
  const yml = workflow();
  assert.match(yml, /^permissions:\s*\n\s+contents:\s*read/m);
  assert.ok(!/secrets\./.test(yml), "o workflow não precisa de segredos");
  assert.ok(!/write/.test(yml.replace(/#.*$/gm, "")), "nenhuma permissão de escrita");
});

test("o workflow tem tempo limite e não cancela as outras versões se uma falhar", () => {
  const yml = workflow();
  assert.match(yml, /timeout-minutes:\s*\d+/);
  assert.match(yml, /fail-fast:\s*false/);
});

test("o workflow usa as ações oficiais de checkout e de setup do Node", () => {
  const yml = workflow();
  assert.match(yml, /uses:\s*actions\/checkout@v\d+/);
  assert.match(yml, /uses:\s*actions\/setup-node@v\d+/);
});

test("o projeto não tem dependências, então o workflow não precisa instalar nada", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  assert.equal(Object.keys(pkg.devDependencies ?? {}).length, 0);
});

// ---- README ----

test("o README existe e explica como rodar, testar e onde está o app publicado", () => {
  const readmePath = new URL("README.md", root);
  assert.ok(existsSync(readmePath), "README.md não existe");
  const readme = readFileSync(readmePath, "utf8");
  assert.match(readme, /^# /m, "sem título");
  assert.match(readme, /https:\/\/rossalli\.github\.io\/todo-tamagochi\//, "sem o link do app publicado");
  assert.match(readme, /npm run dev/);
  assert.match(readme, /npm test/);
  assert.match(readme, /SPEC\.md/);
  assert.match(readme, /actions\/workflows\/test\.yml\/badge\.svg/, "sem o selo de testes");
});
