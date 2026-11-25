import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("package.json usa ES modules", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.type, "module");
  assert.ok(pkg.scripts.test);
  assert.ok(pkg.scripts.dev);
});

test("index.html carrega styles.css e src/app.js como módulo", () => {
  const html = read("index.html");
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /<script type="module" src="src\/app\.js">/);
});
