import { canSave, load, save } from "./storage.js";
import {
  DEFAULT_PET_NAME,
  ENERGY_MAX,
  MAX_PET_NAME_LENGTH,
  MAX_TASK_LENGTH,
  addTask,
  applyTime,
  completeWithDiary,
  uncompleteWithDiary,
  deleteTask,
  energyStatus,
  pendingRewards,
  setPetName,
  stageFor,
} from "./state.js";
import { CATALOG } from "./data/items.js";
import {
  SLOTS,
  activeItems,
  consumeRewardWithoutItem,
  equip,
  grantReward,
  isEligible,
  pickItemName,
  rewardCandidates,
  unequip,
} from "./items.js";
import { STAGE_LABEL, drawPet } from "./sprites.js";

const ERROR_TEXT = {
  empty: "Escreva alguma coisa.",
  too_long: `No máximo ${MAX_TASK_LENGTH} caracteres.`,
};

const NAME_ERROR_TEXT = {
  empty: "Escolha um nome.",
  too_long: `No máximo ${MAX_PET_NAME_LENGTH} caracteres.`,
};

const SLOT_LABEL = { head: "cabeça", face: "rosto", hold: "mão" };
const SLOT_TITLE = { head: "Cabeça", face: "Rosto", hold: "Mão" };
const SCOPE_HINT = { baby: "só no bebê", pup: "só no filhote" };

const el = {
  form: document.getElementById("add-form"),
  input: document.getElementById("task-input"),
  error: document.getElementById("form-error"),
  count: document.getElementById("count"),
  closet: document.getElementById("closet"),
  closetSummary: document.getElementById("closet-summary"),
  list: document.getElementById("task-list"),
  empty: document.getElementById("empty"),
  pet: document.getElementById("pet"),
  petName: document.getElementById("pet-name"),
  rename: document.getElementById("rename"),
  nameDialog: document.getElementById("name-dialog"),
  nameForm: document.getElementById("name-form"),
  nameInput: document.getElementById("name-input"),
  nameError: document.getElementById("name-error"),
  nameLater: document.getElementById("name-later"),
  stageLabel: document.getElementById("stage-label"),
  saveWarning: document.getElementById("save-warning"),
  energy: document.getElementById("energy"),
  energyBar: document.getElementById("energy-bar"),
  energyText: document.getElementById("energy-text"),
  diaryList: document.getElementById("diary-list"),
  diaryEmpty: document.getElementById("diary-empty"),
  diaryAnnounce: document.getElementById("diary-announce"),
  banner: document.getElementById("reward-banner"),
  bannerText: document.getElementById("reward-banner-text"),
  bannerOpen: document.getElementById("reward-open"),
  dialog: document.getElementById("reward-dialog"),
  dialogDesc: document.getElementById("reward-desc"),
  options: document.getElementById("reward-options"),
  later: document.getElementById("reward-later"),
};

const timeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

// Marco sem itens sobrando (catálogo esgotado) é consumido sem escolha.
function settle(s) {
  let next = s;
  for (;;) {
    const after = consumeRewardWithoutItem(next);
    if (after === next) return next;
    next = after;
  }
}

// O relógio vale já na abertura: se passaram 48h sem tarefa, ela abre dormindo.
const loaded = load();
let state = settle(applyTime(loaded, Date.now()));
if (state !== loaded) save(state);
el.saveWarning.hidden = canSave();

for (let i = 0; i < ENERGY_MAX; i++) el.energyBar.append(document.createElement("span"));

// Os 3 itens oferecidos ficam fixos enquanto o marco está pendente: se a lista
// fosse sorteada a cada render, mudaria sozinha a cada clique.
let offer = [];
let offerKey = null;

function currentOffer() {
  if (pendingRewards(state) === 0) return [];
  const key = `${state.rewardsGranted}:${stageFor(state.completed)}`;
  if (key !== offerKey) {
    offer = rewardCandidates(state);
    offerKey = key;
  }
  return offer;
}

function update(next) {
  state = settle(next);
  // Se não gravou (modo privado, cota cheia), o app segue em memória, mas a pessoa precisa saber.
  el.saveWarning.hidden = save(state);
  render();
}

// Re-renderizar destrói os elementos; devolve o foco ao mesmo controle.
function render() {
  const focused = document.activeElement;
  const focusKey = focused?.dataset?.focusKey;

  const stage = stageFor(state.completed);
  const active = activeItems(state);
  drawPet(el.pet, stage, active, { asleep: state.asleep });
  const wearing = Object.values(active).filter(Boolean).map((i) => i.name);
  el.pet.setAttribute(
    "aria-label",
    `Seu bichinho, estágio ${STAGE_LABEL[stage]}${wearing.length ? `, com ${wearing.join(", ")}` : ""}${
      state.asleep ? ", dormindo" : ""
    }`,
  );
  el.stageLabel.textContent = `Estágio: ${STAGE_LABEL[stage]}`;

  renderEnergy();

  const name = state.petName ?? DEFAULT_PET_NAME;
  el.petName.textContent = name;
  el.rename.textContent = state.petName ? "Mudar nome" : "Dar nome";
  el.rename.setAttribute("aria-label", state.petName ? `Mudar o nome de ${name}` : "Dar um nome ao bichinho");

  el.count.textContent = `Tarefas concluídas: ${state.completed}`;
  renderCloset(stage);

  const pending = pendingRewards(state);
  el.banner.hidden = pending === 0;
  el.bannerText.textContent =
    pending === 1 ? "Você ganhou uma recompensa!" : `Você ganhou ${pending} recompensas!`;

  el.empty.hidden = state.tasks.length > 0;
  el.list.replaceChildren(...state.tasks.map(renderTask));

  el.diaryEmpty.hidden = state.diary.length > 0;
  el.diaryList.replaceChildren(...state.diary.map(renderEntry));

  if (focusKey) document.querySelector(`[data-focus-key="${focusKey}"]`)?.focus();
}

// Armário: itens ganhos por slot. Os que não valem no estágio atual ficam
// visíveis (álbum), mas desabilitados.
function renderCloset(stage) {
  const owned = state.owned.map((id) => CATALOG.find((i) => i.id === id)).filter(Boolean);
  el.closetSummary.textContent = owned.length ? `Armário (${owned.length})` : "Armário";

  if (owned.length === 0) {
    el.closet.replaceChildren(textNote("Nenhum item ainda. A cada 5 tarefas você escolhe um!"));
    return;
  }

  const groups = SLOTS.map((slot) => {
    const items = owned.filter((i) => i.slot === slot);
    if (items.length === 0) return null;

    const group = document.createElement("div");
    group.className = "closet-group";
    const title = document.createElement("h3");
    title.textContent = SLOT_TITLE[slot];
    const list = document.createElement("ul");
    list.className = "closet-items";
    list.append(...items.map((item) => renderClosetItem(item, stage)));
    group.append(title, list);
    return group;
  }).filter(Boolean);

  const nodes = [...groups];
  if (stage === "egg") nodes.push(textNote("O ovo ainda não usa itens."));
  el.closet.replaceChildren(...nodes);
}

function renderClosetItem(item, stage) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.focusKey = `closet-${item.id}`;
  const worn = state.equipped[item.slot] === item.id;
  const usable = isEligible(item, stage);
  button.setAttribute("aria-pressed", String(worn && usable));
  button.disabled = !usable;
  button.textContent = usable || !SCOPE_HINT[item.scope] ? item.name : `${item.name} (${SCOPE_HINT[item.scope]})`;
  button.addEventListener("click", () =>
    update(state.equipped[item.slot] === item.id ? unequip(state, item.slot) : equip(state, item.id)),
  );
  li.append(button);
  return li;
}

function textNote(text) {
  const p = document.createElement("p");
  p.className = "closet-note";
  p.textContent = text;
  return p;
}

// Mostra ou limpa o erro de um campo, e avisa o leitor de tela (aria-invalid).
// O texto do erro já está ligado ao campo por aria-describedby no HTML.
function setFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

// Barra de energia e o aviso de sono. Tons calmos: nunca vermelho, nunca culpa.
function renderEnergy() {
  const status = energyStatus(state, Date.now());
  [...el.energyBar.children].forEach((pip, i) => pip.classList.toggle("on", i < state.energy));
  el.energyBar.setAttribute("aria-valuenow", String(state.energy));
  el.energy.classList.toggle("sleepy", status.kind === "sleepy");
  el.energy.classList.toggle("asleep", status.kind === "asleep");

  const level = `Energia ${state.energy} de ${ENERGY_MAX}.`;
  el.energyText.textContent = {
    new: "Conclua uma tarefa para dar energia ao bichinho.",
    ok: level,
    sleepy: `${level} Com sono: vai dormir em cerca de ${status.hoursLeft}h se nenhuma tarefa for concluída.`,
    asleep: "Dormindo. Conclua uma tarefa para acordar o bichinho.",
  }[status.kind];
  // O medidor fala o mesmo texto que aparece embaixo, e não só o número.
  el.energyBar.setAttribute("aria-valuetext", el.energyText.textContent);
}

// Confere o relógio com a página aberta: o sono chega sem precisar recarregar.
function checkSleep() {
  const next = applyTime(state, Date.now());
  if (next === state) {
    renderEnergy();
    return;
  }
  update(next);
  el.diaryAnnounce.textContent = "O bichinho foi dormir.";
}

function renderTask(task) {
  const li = document.createElement("li");
  li.className = task.done ? "task done" : "task";

  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = task.done;
  box.dataset.focusKey = `check-${task.id}`;
  box.setAttribute("aria-label", task.text);
  box.addEventListener("change", () => {
    if (box.checked) {
      const before = pendingRewards(state);
      update(completeWithDiary(state, task.id, { item: pickItemName(state) }));
      // Só a entrada nova é anunciada: o diário inteiro não é relido.
      el.diaryAnnounce.textContent = state.diary[0]?.text ?? "";
      if (pendingRewards(state) > before) openRewardDialog();
    } else {
      update(uncompleteWithDiary(state, task.id));
    }
  });

  const text = document.createElement("span");
  text.className = "text";
  text.textContent = task.text;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "ghost";
  del.textContent = "Excluir";
  del.setAttribute("aria-label", `Excluir: ${task.text}`);
  del.dataset.focusKey = `del-${task.id}`;
  del.addEventListener("click", () => {
    update(deleteTask(state, task.id));
    el.input.focus();
  });

  li.append(box, text, del);
  return li;
}

function renderEntry(entry) {
  const li = document.createElement("li");
  li.className = "diary-entry";

  const text = document.createElement("span");
  text.textContent = entry.text;

  const time = document.createElement("time");
  time.dateTime = new Date(entry.at).toISOString();
  time.textContent = timeFormat.format(entry.at);

  li.append(text, time);
  return li;
}

// Ao fechar um diálogo, o foco volta para quem o abriu. Mas a tela é redesenhada a cada
// ação, e se esse elemento foi recriado o navegador perde o foco (cai no <body>): quem
// usa teclado voltaria ao topo da página. Aí devolvemos ao mesmo controle pela focusKey,
// ou ao campo de nova tarefa.
function keepFocusAfterClose(dialog, getKey) {
  dialog.addEventListener("close", () => {
    // Espera o navegador acertar o foco: no evento `close`, o botão escondido do
    // próprio diálogo ainda pode contar como focado.
    setTimeout(() => {
      const focused = document.activeElement;
      if (focused && focused !== document.body && !dialog.contains(focused)) return;
      const key = getKey();
      const target = key ? document.querySelector(`[data-focus-key="${key}"]`) : null;
      (target ?? el.input).focus();
    }, 0);
  });
}

let rewardReturnKey = null;
keepFocusAfterClose(el.dialog, () => rewardReturnKey);
keepFocusAfterClose(el.nameDialog, () => null);

function openRewardDialog() {
  const candidates = currentOffer();
  if (candidates.length === 0 || el.dialog.open) return;
  rewardReturnKey = document.activeElement?.dataset?.focusKey ?? null;

  el.dialogDesc.textContent = "Escolha 1 item para o bichinho. O item fica com você para sempre.";
  el.options.replaceChildren(
    ...candidates.map((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = [SLOT_LABEL[item.slot], SCOPE_HINT[item.scope]].filter(Boolean).join(" · ");
      // O espaço mantém o nome acessível legível ("ursinho mão · só no bebê").
      button.append(item.name, " ", hint);
      button.addEventListener("click", () => {
        update(grantReward(state, item.id));
        el.dialog.close();
        el.diaryAnnounce.textContent = `Você escolheu: ${item.name}.`;
      });
      li.append(button);
      return li;
    }),
  );
  el.dialog.showModal();
}

function openNameDialog() {
  if (el.nameDialog.open) return;
  el.nameInput.value = state.petName ?? "";
  setFieldError(el.nameInput, el.nameError, "");
  el.nameLater.textContent = state.petName ? "Cancelar" : "Depois";
  el.nameDialog.showModal();
  el.nameInput.select();
}

el.rename.addEventListener("click", openNameDialog);
el.nameLater.addEventListener("click", () => el.nameDialog.close());
el.nameInput.addEventListener("input", () => setFieldError(el.nameInput, el.nameError, ""));
el.nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = setPetName(state, el.nameInput.value);
  if (result.error) {
    setFieldError(el.nameInput, el.nameError, NAME_ERROR_TEXT[result.error]);
    return;
  }
  update(result.state);
  el.nameDialog.close();
  el.diaryAnnounce.textContent = `O bichinho agora se chama ${result.state.petName}.`;
});

el.bannerOpen.addEventListener("click", openRewardDialog);
el.later.addEventListener("click", () => el.dialog.close());

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = addTask(state, el.input.value);
  if (result.error) {
    setFieldError(el.input, el.error, ERROR_TEXT[result.error]);
    return;
  }
  setFieldError(el.input, el.error, "");
  el.input.value = "";
  update(result.state);
});

el.input.addEventListener("input", () => setFieldError(el.input, el.error, ""));

render();

// Primeiro uso: pede o nome. Esc ou "Depois" mantém o nome padrão, e o botão "Dar nome" fica na tela.
if (state.petName === null) openNameDialog();

setInterval(checkSleep, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkSleep();
});
