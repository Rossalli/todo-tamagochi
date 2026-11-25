import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../src/data/items.js";
import {
  REWARD_EVERY,
  CHOICES,
  pendingRewards,
  rewardCandidates,
  grantReward,
  consumeRewardWithoutItem,
  isEligible,
  equip,
  unequip,
  activeItems,
} from "../src/items.js";
import { createInitialState } from "../src/state.js";

const byId = (id) => CATALOG.find((i) => i.id === id);
const withState = (patch) => ({ ...createInitialState(), ...patch });
const first = () => 0;

// ---- catálogo ----

test("catálogo: 25 itens, ids únicos, slots e escopos válidos", () => {
  assert.equal(CATALOG.length, 25);
  assert.equal(new Set(CATALOG.map((i) => i.id)).size, 25);
  for (const i of CATALOG) {
    assert.ok(i.name && typeof i.name === "string", i.id);
    assert.ok(["head", "face", "hold"].includes(i.slot), `${i.id}: slot`);
    assert.ok(["general", "baby", "pup"].includes(i.scope), `${i.id}: scope`);
  }
});

test("catálogo: 17 gerais, 4 de bebê e 4 de filhote", () => {
  const count = (scope) => CATALOG.filter((i) => i.scope === scope).length;
  assert.deepEqual([count("general"), count("baby"), count("pup")], [17, 4, 4]);
});

test("catálogo: gerais por slot são 7 head, 5 face e 5 hold", () => {
  const gen = CATALOG.filter((i) => i.scope === "general");
  const count = (slot) => gen.filter((i) => i.slot === slot).length;
  assert.deepEqual([count("head"), count("face"), count("hold")], [7, 5, 5]);
});

test("catálogo: nomes sem artigo para caber em {item}", () => {
  for (const i of CATALOG) assert.ok(!/^(o|a|os|as|um|uma) /i.test(i.name), i.name);
});

// ---- pendência ----

test("recompensa a cada 5 tarefas concluídas", () => {
  assert.equal(REWARD_EVERY, 5);
  assert.equal(CHOICES, 3);
  const p = (completed, rewardsGranted = 0) => pendingRewards(withState({ completed, rewardsGranted }));
  assert.equal(p(0), 0);
  assert.equal(p(4), 0);
  assert.equal(p(5), 1);
  assert.equal(p(9), 1);
  assert.equal(p(10), 2);
  assert.equal(p(10, 1), 1);
  assert.equal(p(10, 2), 0);
});

test("desmarcar abaixo do marco e marcar de novo não gera recompensa extra", () => {
  const granted = { completed: 5, rewardsGranted: 1 };
  assert.equal(pendingRewards(withState(granted)), 0);
  assert.equal(pendingRewards(withState({ ...granted, completed: 4 })), 0);
  assert.equal(pendingRewards(withState({ ...granted, completed: 5 })), 0);
  assert.equal(pendingRewards(withState({ ...granted, completed: 10 })), 1);
});

// ---- elegibilidade ----

test("isEligible: gerais valem de bebê em diante; de estágio só no seu estágio; ovo nunca", () => {
  const general = byId("festa");
  const baby = CATALOG.find((i) => i.scope === "baby");
  const pup = CATALOG.find((i) => i.scope === "pup");
  assert.equal(isEligible(general, "egg"), false);
  for (const s of ["baby", "pup", "young", "adult"]) assert.equal(isEligible(general, s), true, s);
  assert.equal(isEligible(baby, "baby"), true);
  assert.equal(isEligible(baby, "pup"), false);
  assert.equal(isEligible(pup, "pup"), true);
  assert.equal(isEligible(pup, "baby"), false);
  assert.equal(isEligible(pup, "young"), false);
});

// ---- candidatos ----

test("no bebê: 3 candidatos, 2 do bebê e 1 geral", () => {
  const s = withState({ completed: 5 });
  const c = rewardCandidates(s, first);
  assert.equal(c.length, 3);
  assert.equal(c.filter((i) => i.scope === "baby").length, 2);
  assert.equal(c.filter((i) => i.scope === "general").length, 1);
  assert.equal(new Set(c.map((i) => i.id)).size, 3);
});

test("no filhote só aparecem itens de filhote e gerais", () => {
  const s = withState({ completed: 10 });
  for (let k = 0; k < 20; k++) {
    const c = rewardCandidates(s, () => k / 20);
    assert.ok(c.every((i) => i.scope === "pup" || i.scope === "general"));
  }
});

test("no jovem e no adulto só aparecem itens gerais", () => {
  for (const completed of [30, 60]) {
    const c = rewardCandidates(withState({ completed }), first);
    assert.equal(c.length, 3);
    assert.ok(c.every((i) => i.scope === "general"));
  }
});

test("candidatos nunca incluem itens já possuídos", () => {
  const owned = CATALOG.filter((i) => i.scope === "general").slice(0, 10).map((i) => i.id);
  const c = rewardCandidates(withState({ completed: 30, owned }), first);
  assert.ok(c.every((i) => !owned.includes(i.id)));
});

test("sobrando 1 item de bebê, vêm 1 de bebê e 2 gerais", () => {
  const babyIds = CATALOG.filter((i) => i.scope === "baby").map((i) => i.id);
  const c = rewardCandidates(withState({ completed: 5, owned: babyIds.slice(1) }), first);
  assert.equal(c.length, 3);
  assert.equal(c.filter((i) => i.scope === "baby").length, 1);
});

test("sem itens de bebê sobrando, completa com gerais", () => {
  const babyIds = CATALOG.filter((i) => i.scope === "baby").map((i) => i.id);
  const c = rewardCandidates(withState({ completed: 5, owned: babyIds }), first);
  assert.equal(c.length, 3);
  assert.ok(c.every((i) => i.scope === "general"));
});

test("poucos itens sobrando: devolve só os que restam; nenhum: lista vazia", () => {
  const all = CATALOG.map((i) => i.id);
  const general = CATALOG.filter((i) => i.scope === "general").map((i) => i.id);
  const owned2Left = all.filter((id) => id !== general[0] && id !== general[1]);
  assert.equal(rewardCandidates(withState({ completed: 30, owned: owned2Left }), first).length, 2);
  assert.deepEqual(rewardCandidates(withState({ completed: 30, owned: all }), first), []);
});

test("no ovo não há candidatos", () => {
  assert.deepEqual(rewardCandidates(withState({ completed: 2 }), first), []);
});

test("o rng muda o sorteio, e o mesmo rng dá o mesmo resultado", () => {
  const s = withState({ completed: 30 });
  const a = rewardCandidates(s, () => 0).map((i) => i.id);
  const b = rewardCandidates(s, () => 0.99).map((i) => i.id);
  assert.notDeepEqual(a, b);
  assert.deepEqual(rewardCandidates(s, () => 0).map((i) => i.id), a);
});

// ---- conceder ----

test("grantReward: adiciona o item e consome o marco", () => {
  const s = withState({ completed: 5 });
  const pick = rewardCandidates(s, first)[0];
  const next = grantReward(s, pick.id);
  assert.deepEqual(next.owned, [pick.id]);
  assert.equal(next.rewardsGranted, 1);
  assert.equal(pendingRewards(next), 0);
});

test("grantReward sem marco pendente não faz nada", () => {
  const s = withState({ completed: 4 });
  assert.equal(grantReward(s, "festa"), s);
});

test("grantReward rejeita item inexistente, já possuído ou fora do estágio", () => {
  const s = withState({ completed: 5, owned: ["festa"] });
  assert.equal(grantReward(s, "nao-existe"), s);
  assert.equal(grantReward(s, "festa"), s);
  const pup = CATALOG.find((i) => i.scope === "pup");
  assert.equal(grantReward(s, pup.id), s);
});

test("grantReward não muta o estado recebido", () => {
  const s = withState({ completed: 5 });
  grantReward(s, rewardCandidates(s, first)[0].id);
  assert.deepEqual(s.owned, []);
  assert.equal(s.rewardsGranted, 0);
});

test("com vários marcos pendentes, cada concessão consome um", () => {
  let s = withState({ completed: 10 });
  assert.equal(pendingRewards(s), 2);
  s = grantReward(s, rewardCandidates(s, first)[0].id);
  assert.equal(pendingRewards(s), 1);
  s = grantReward(s, rewardCandidates(s, first)[0].id);
  assert.equal(pendingRewards(s), 0);
  assert.equal(s.owned.length, 2);
});

test("consumeRewardWithoutItem só vale quando não restam candidatos", () => {
  const all = CATALOG.map((i) => i.id);
  const empty = withState({ completed: 30, rewardsGranted: 5, owned: all });
  const next = consumeRewardWithoutItem(empty);
  assert.equal(next.rewardsGranted, 6);
  assert.deepEqual(next.owned, all);

  const hasChoices = withState({ completed: 5 });
  assert.equal(consumeRewardWithoutItem(hasChoices), hasChoices);
  const noPending = withState({ completed: 4 });
  assert.equal(consumeRewardWithoutItem(noPending), noPending);
});

// ---- equipar ----

test("equip põe o item no slot dele", () => {
  const s = withState({ completed: 30, owned: ["festa"] });
  const next = equip(s, "festa");
  assert.equal(next.equipped.head, "festa");
  assert.equal(next.equipped.face, null);
});

test("equip em slot ocupado troca o item (nunca dois no mesmo slot)", () => {
  const s = withState({ completed: 30, owned: ["festa", "coroa"], equipped: { head: "festa", face: null, hold: null } });
  const next = equip(s, "coroa");
  assert.equal(next.equipped.head, "coroa");
  assert.deepEqual(Object.values(next.equipped).filter(Boolean), ["coroa"]);
});

test("equip rejeita item não possuído, inexistente, de outro estágio ou no ovo", () => {
  const pup = CATALOG.find((i) => i.scope === "pup");
  const s = withState({ completed: 30, owned: [pup.id, "festa"] });
  assert.equal(equip(s, "coroa"), s);
  assert.equal(equip(s, "nao-existe"), s);
  assert.equal(equip(s, pup.id), s);
  const egg = withState({ completed: 2, owned: ["festa"] });
  assert.equal(equip(egg, "festa"), egg);
});

test("equip do item já equipado não muda nada", () => {
  const s = withState({ completed: 30, owned: ["festa"], equipped: { head: "festa", face: null, hold: null } });
  assert.equal(equip(s, "festa"), s);
});

test("unequip esvazia o slot", () => {
  const s = withState({ equipped: { head: "festa", face: "bigode", hold: null } });
  assert.deepEqual(unequip(s, "head").equipped, { head: null, face: "bigode", hold: null });
  assert.equal(unequip(s, "hold"), s);
  assert.equal(unequip(s, "slot-invalido"), s);
});

test("equip e unequip não mutam o estado recebido", () => {
  const s = withState({ completed: 30, owned: ["festa"] });
  equip(s, "festa");
  assert.equal(s.equipped.head, null);
});

// ---- itens ativos ----

test("activeItems devolve os itens equipados válidos no estágio atual", () => {
  const baby = CATALOG.find((i) => i.scope === "baby");
  const equipped = { head: "festa", face: null, hold: null };
  equipped[baby.slot] = baby.id;
  const s = withState({ completed: 5, owned: ["festa", baby.id], equipped });
  const active = activeItems(s);
  assert.equal(active[baby.slot].id, baby.id);
});

test("ao crescer, o item de bebê deixa de estar ativo mas continua equipado no estado", () => {
  const baby = CATALOG.find((i) => i.scope === "baby");
  const equipped = { head: null, face: null, hold: null, [baby.slot]: baby.id };
  const grown = withState({ completed: 10, owned: [baby.id], equipped });
  assert.equal(activeItems(grown)[baby.slot], null);
  assert.equal(grown.equipped[baby.slot], baby.id);
});

test("no ovo nenhum item está ativo", () => {
  const s = withState({ completed: 1, owned: ["festa"], equipped: { head: "festa", face: null, hold: null } });
  assert.deepEqual(activeItems(s), { head: null, face: null, hold: null });
});

// ---- nome do item para as frases ----

import { pickItemName } from "../src/items.js";

test("pickItemName: sem item ativo devolve undefined", () => {
  assert.equal(pickItemName(withState({ completed: 30 })), undefined);
  const egg = withState({ completed: 1, owned: ["festa"], equipped: { head: "festa", face: null, hold: null } });
  assert.equal(pickItemName(egg), undefined);
});

test("pickItemName: devolve o nome de um item ativo, escolhido pelo rng", () => {
  const s = withState({
    completed: 30,
    owned: ["festa", "bigode"],
    equipped: { head: "festa", face: "bigode", hold: null },
  });
  assert.equal(pickItemName(s, () => 0), "chapéu de festa");
  assert.equal(pickItemName(s, () => 0.99), "bigode");
  assert.equal(pickItemName(s, () => 1), "bigode");
});

test("pickItemName ignora item equipado que não vale mais no estágio", () => {
  const babyItem = CATALOG.find((i) => i.scope === "baby");
  const grown = withState({
    completed: 10,
    owned: [babyItem.id],
    equipped: { head: null, face: null, hold: null, [babyItem.slot]: babyItem.id },
  });
  assert.equal(pickItemName(grown), undefined);
});
