import { ENERGY_MAX, createInitialState } from "./state.js";

export const STORAGE_KEY = "todo-tamagochi:v1";
const KNOWN_SCHEMA = 1;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isString = (v) => typeof v === "string";
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isTask = (t) =>
  isObject(t) && isString(t.id) && isString(t.text) && typeof t.done === "boolean" &&
  (t.doneAt === null || typeof t.doneAt === "number");
const isDiaryEntry = (e) =>
  isObject(e) && isString(e.id) && isString(e.text) && isString(e.taskId) && typeof e.at === "number";

// Aceita só o que tem o tipo certo; o resto cai no padrão do estado inicial.
function normalize(raw) {
  const base = createInitialState();
  const equipped = isObject(raw.equipped) ? raw.equipped : {};
  const slot = (v) => (isString(v) ? v : null);
  return {
    schema: KNOWN_SCHEMA,
    petName: isString(raw.petName) && raw.petName.trim() !== "" ? raw.petName : base.petName,
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.filter(isTask).map((t) => ({ ...t, doneAt: t.doneAt ?? null }))
      : base.tasks,
    completed: isCount(raw.completed) ? raw.completed : base.completed,
    rewardsGranted: isCount(raw.rewardsGranted) ? raw.rewardsGranted : base.rewardsGranted,
    owned: Array.isArray(raw.owned) ? raw.owned.filter(isString) : base.owned,
    equipped: { head: slot(equipped.head), face: slot(equipped.face), hold: slot(equipped.hold) },
    diary: Array.isArray(raw.diary) ? raw.diary.filter(isDiaryEntry) : base.diary,
    recentPhrases: Array.isArray(raw.recentPhrases) ? raw.recentPhrases.filter(isString) : base.recentPhrases,
    lastOpenAt: typeof raw.lastOpenAt === "number" ? raw.lastOpenAt : base.lastOpenAt,
    energy: isCount(raw.energy) && raw.energy <= ENERGY_MAX ? raw.energy : base.energy,
    lastActivityAt: typeof raw.lastActivityAt === "number" ? raw.lastActivityAt : base.lastActivityAt,
    asleep: typeof raw.asleep === "boolean" ? raw.asleep : base.asleep,
  };
}

// Nunca lança: qualquer problema devolve o estado inicial.
export function load(storage = safeLocalStorage()) {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (!text) return createInitialState();
    const raw = JSON.parse(text);
    if (!isObject(raw) || raw.schema !== KNOWN_SCHEMA) return createInitialState();
    return normalize(raw);
  } catch {
    return createInitialState();
  }
}

// Devolve true se gravou. Nunca lança: o app segue em memória se falhar.
export function save(state, storage = safeLocalStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Acessar localStorage pode lançar (modo privado, cookies bloqueados).
function safeLocalStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

// Confere se dá para gravar (modo privado, cota cheia e armazenamento bloqueado falham)
// sem tocar nos dados do app: usa uma chave de teste e a remove em seguida.
export function canSave(storage = safeLocalStorage()) {
  const probe = `${STORAGE_KEY}:probe`;
  try {
    if (!storage) return false;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
