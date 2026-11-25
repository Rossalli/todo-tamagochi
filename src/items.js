import { CATALOG } from "./data/items.js";
import { REWARD_EVERY, pendingRewards, stageFor } from "./state.js";

// Definidos em state.js (que precisa deles para escolher a frase do marco).
export { REWARD_EVERY, pendingRewards };

export const CHOICES = 3; // quantos itens a pessoa pode escolher
const STAGE_PICKS = 2; // até 2 dos 3 vêm do estágio atual (bebê ou filhote)
export const SLOTS = ["head", "face", "hold"];

// Gerais valem de bebê em diante; itens de estágio só no próprio estágio; ovo nunca.
export function isEligible(item, stage) {
  return stage !== "egg" && (item.scope === "general" || item.scope === stage);
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function rewardCandidates(state, rng = Math.random, catalog = CATALOG) {
  const stage = stageFor(state.completed);
  if (stage === "egg") return [];

  const free = catalog.filter((i) => !state.owned.includes(i.id) && isEligible(i, stage));
  const stageItems = shuffle(free.filter((i) => i.scope === stage), rng);
  const general = shuffle(free.filter((i) => i.scope === "general"), rng);

  const picked = stageItems.slice(0, STAGE_PICKS);
  picked.push(...general.slice(0, CHOICES - picked.length));
  // Faltou geral: completa com os itens de estágio que sobraram.
  picked.push(...stageItems.slice(STAGE_PICKS).slice(0, CHOICES - picked.length));

  return shuffle(picked, rng);
}

export function grantReward(state, itemId, catalog = CATALOG) {
  if (pendingRewards(state) <= 0) return state;
  const item = catalog.find((i) => i.id === itemId);
  if (!item || state.owned.includes(item.id)) return state;
  if (!isEligible(item, stageFor(state.completed))) return state;
  return { ...state, owned: [...state.owned, item.id], rewardsGranted: state.rewardsGranted + 1 };
}

// Catálogo esgotado: o marco é consumido sem escolha.
export function consumeRewardWithoutItem(state, catalog = CATALOG) {
  if (pendingRewards(state) <= 0) return state;
  if (rewardCandidates(state, () => 0, catalog).length > 0) return state;
  return { ...state, rewardsGranted: state.rewardsGranted + 1 };
}

export function equip(state, itemId, catalog = CATALOG) {
  const item = catalog.find((i) => i.id === itemId);
  if (!item || !state.owned.includes(item.id)) return state;
  if (!isEligible(item, stageFor(state.completed))) return state;
  if (state.equipped[item.slot] === item.id) return state;
  return { ...state, equipped: { ...state.equipped, [item.slot]: item.id } };
}

export function unequip(state, slot) {
  if (!SLOTS.includes(slot) || state.equipped[slot] === null) return state;
  return { ...state, equipped: { ...state.equipped, [slot]: null } };
}

// Itens equipados que valem no estágio atual. Ao crescer, um item de bebê
// continua em `state.equipped`, mas deixa de estar ativo.
export function activeItems(state, catalog = CATALOG) {
  const stage = stageFor(state.completed);
  const out = {};
  for (const slot of SLOTS) {
    const item = catalog.find((i) => i.id === state.equipped[slot]);
    out[slot] = item && item.slot === slot && isEligible(item, stage) ? item : null;
  }
  return out;
}

// Nome de um item ativo, sorteado, para a frase do diário ({item}).
export function pickItemName(state, rng = Math.random, catalog = CATALOG) {
  const active = Object.values(activeItems(state, catalog)).filter(Boolean);
  if (active.length === 0) return undefined;
  return active[Math.min(Math.floor(rng() * active.length), active.length - 1)].name;
}
