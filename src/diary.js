import { FRASES } from "./data/frases.js";

// Quantos sorteios recentes ficam proibidos (mais recente primeiro).
export const RECENT_WINDOW = 10;

const GROUPS_BY_KIND = {
  complete: (hasItem) => (hasItem ? ["A", "B"] : ["A"]),
  milestone: () => ["D"],
  return: () => ["C"],
};

// Ids são grupo + índice: "A0", "B12"...
export function phraseIds(groups) {
  return groups.flatMap((g) => FRASES[g].map((_, i) => `${g}${i}`));
}

export function templateOf(id) {
  return FRASES[id[0]][Number(id.slice(1))];
}

// Passada única: o texto da pessoa nunca é reprocessado como template.
export function fillTemplate(template, vars) {
  return template.replace(/\{(pet|tarefa|item)\}/g, (_, name) => vars[name] ?? "");
}

// `recent` fica com o mais recente primeiro, sem duplicatas.
export function pushRecent(recent, id) {
  return [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_WINDOW);
}

export function pickPhraseId(groups, recent, rng = Math.random) {
  const pool = phraseIds(groups);
  const blocked = new Set(recent.slice(0, RECENT_WINDOW));
  let candidates = pool.filter((id) => !blocked.has(id));

  if (candidates.length === 0) {
    // Grupo pequeno demais: bloqueia só as mais recentes deste grupo,
    // deixando ao menos uma frase livre.
    const inPool = new Set(pool);
    const relevant = recent.filter((id) => inPool.has(id)).slice(0, pool.length - 1);
    const stillBlocked = new Set(relevant);
    candidates = pool.filter((id) => !stillBlocked.has(id));
  }

  const index = Math.min(Math.floor(rng() * candidates.length), candidates.length - 1);
  return candidates[index];
}

// kind: "complete" | "milestone" | "return". Devolve { phraseId, text }.
export function writeEntry({ kind, pet, tarefa, item, recent, rng = Math.random }) {
  const groupsFor = GROUPS_BY_KIND[kind];
  if (!groupsFor) throw new Error(`kind desconhecido: ${kind}`);
  const phraseId = pickPhraseId(groupsFor(Boolean(item)), recent, rng);
  return { phraseId, text: fillTemplate(templateOf(phraseId), { pet, tarefa, item }) };
}
