import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("styles.css", root), "utf8");
const html = readFileSync(new URL("index.html", root), "utf8");

// ---- contraste (fórmula WCAG 2.x) ----

const channel = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => channel(hex, i) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// Cor efetiva de um texto com opacidade sobre um fundo.
function blend(fg, bg, alpha) {
  const mix = [1, 3, 5].map((i) =>
    Math.round(channel(fg, i) * alpha + channel(bg, i) * (1 - alpha)).toString(16).padStart(2, "0"),
  );
  return `#${mix.join("")}`;
}

const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, name, hex]) => [name, hex.toLowerCase()]),
);

// Cores escritas direto no CSS: se mudarem lá, este teste avisa.
const LITERALS = { sleepyText: "#4a3a82", focusRing: "#1a5fd0" };

test("os tokens de cor existem no CSS", () => {
  for (const name of ["ink", "paper", "card", "accent", "muted", "danger"]) {
    assert.ok(tokens[name], `--${name} ausente`);
  }
  for (const [name, hex] of Object.entries(LITERALS)) {
    assert.ok(css.toLowerCase().includes(hex), `${name} (${hex}) não está mais no CSS`);
  }
});

test("texto tem contraste de pelo menos 4.5:1 em todos os pares usados", () => {
  const { ink, paper, card, accent, muted, danger } = tokens;
  const pairs = [
    ["texto principal na página", ink, paper],
    ["texto principal em cartões e campos", ink, card],
    ["texto principal em botões e destaques (amarelo)", ink, accent],
    ["texto secundário na página (contagem, legenda, aviso de energia)", muted, paper],
    ["texto secundário em cartões (data do diário, dica, nota do armário)", muted, card],
    ["mensagem de erro", danger, paper],
    ["mensagem de erro em cartão", danger, card],
    ["aviso de sono e dormindo", LITERALS.sleepyText, paper],
    ["texto do placeholder (--muted) no campo", muted, card],
  ];
  for (const [label, fg, bg] of pairs) {
    const r = ratio(fg, bg);
    assert.ok(r >= 4.5, `${label}: ${r.toFixed(2)}:1`);
  }
});

test("o anel de foco tem contraste de pelo menos 3:1 com a página e com os cartões", () => {
  for (const bg of [tokens.paper, tokens.card]) {
    const r = ratio(LITERALS.focusRing, bg);
    assert.ok(r >= 3, `anel de foco: ${r.toFixed(2)}:1`);
  }
});

test("botão desabilitado do armário continua legível (≥ 4.5:1): a dica 'só no bebê' é informação", () => {
  const match = css.match(/\.closet-items button:disabled\s*\{[^}]*opacity:\s*([\d.]+)/);
  assert.ok(match, "regra de botão desabilitado não encontrada");
  const effective = blend(tokens.ink, tokens.card, Number(match[1]));
  const r = ratio(effective, tokens.card);
  assert.ok(r >= 4.5, `opacidade ${match[1]} dá ${r.toFixed(2)}:1`);
});

test("o placeholder usa uma cor definida, não o cinza padrão do navegador", () => {
  assert.match(css, /::placeholder\s*\{[^}]*color:\s*var\(--muted\)/);
});

// ---- alvos de toque e foco ----

test("o checkbox da tarefa tem pelo menos 24x24 px (WCAG 2.2, tamanho do alvo)", () => {
  const rule = css.match(/\.task input\[type="checkbox"\]\s*\{([^}]*)\}/);
  assert.ok(rule, "regra do checkbox não encontrada");
  for (const prop of ["width", "height"]) {
    const m = rule[1].match(new RegExp(`${prop}:\\s*([\\d.]+)rem`));
    assert.ok(m, `${prop} do checkbox`);
    assert.ok(Number(m[1]) * 16 >= 24, `${prop} = ${Number(m[1]) * 16}px`);
  }
});

test("existe um anel de foco visível para navegação por teclado", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid/);
  assert.ok(!/outline:\s*(none|0)\b/.test(css), "nenhum outline pode ser removido");
});

test("movimento é desligado com prefers-reduced-motion", () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, "bloco prefers-reduced-motion ausente");
  assert.match(block[1], /animation/);
  assert.match(block[1], /transition/);
});

// ---- estrutura do HTML ----

test("a página declara o idioma e tem um landmark main", () => {
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<main[\s>]/);
});

test("todo <dialog> tem nome acessível apontando para um título que existe", () => {
  const dialogs = [...html.matchAll(/<dialog[^>]*>/g)].map((m) => m[0]);
  assert.ok(dialogs.length >= 2);
  for (const tag of dialogs) {
    const id = tag.match(/aria-labelledby="([^"]+)"/)?.[1];
    assert.ok(id, `dialog sem aria-labelledby: ${tag}`);
    assert.match(html, new RegExp(`id="${id}"`), `título #${id} não existe`);
  }
});

test("campos de texto têm rótulo e ligam a mensagem de erro por aria-describedby", () => {
  const fields = { "task-input": "form-error", "name-input": "name-error" };
  for (const [input, error] of Object.entries(fields)) {
    assert.match(html, new RegExp(`<label for="${input}"`), `rótulo de #${input}`);
    const tag = html.match(new RegExp(`<input[^>]*id="${input}"[^>]*>`))?.[0];
    assert.ok(tag, `input #${input}`);
    assert.match(tag, new RegExp(`aria-describedby="${error}"`), `#${input} sem aria-describedby`);
    assert.match(html, new RegExp(`id="${error}"[^>]*role="alert"`), `#${error} sem role=alert`);
  }
});

test("o canvas é uma imagem com descrição e o medidor de energia tem nome", () => {
  for (const tag of html.matchAll(/<canvas[^>]*>/g)) assert.match(tag[0], /role="img"/);
  const meter = html.match(/<div[^>]*role="meter"[^>]*>/)?.[0];
  assert.ok(meter, "medidor ausente");
  assert.match(meter, /aria-label="[^"]+"/);
  assert.match(meter, /aria-valuemin="0"/);
  assert.match(meter, /aria-valuemax="10"/);
});

test("nenhum tabindex positivo (a ordem de foco segue a ordem do documento)", () => {
  assert.ok(!/tabindex="[1-9]/.test(html));
});

test("regiões vivas: só uma, educada, para anunciar eventos", () => {
  const live = [...html.matchAll(/aria-live="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(live, ["polite"]);
});

// ---- reflow: palavras longas sem espaço (até 80 caracteres na tarefa, 20 no nome) ----

test("todo lugar que mostra texto da pessoa quebra palavras longas (sem rolagem horizontal)", () => {
  const userTextSelectors = [
    ".task .text", // texto da tarefa
    ".diary-entry", // frase do diário: leva a tarefa e o nome da raposa
    ".pet-name-row strong", // nome da raposa
  ];
  for (const selector of userTextSelectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"));
    assert.ok(rule, `regra de ${selector} não encontrada`);
    assert.ok(
      rule.some((r) => /overflow-wrap:\s*anywhere/.test(r)),
      `${selector} sem overflow-wrap: anywhere`,
    );
  }
});
