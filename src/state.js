import { pushRecent, writeEntry } from "./diary.js";

export const MAX_TASK_LENGTH = 80;

// Conta caracteres, não unidades UTF-16: um emoji vale 1, e não 2.
const charCount = (text) => [...text].length;
export const DEFAULT_PET_NAME = "Bichinho"; // não revela a espécie: o que vai chocar é surpresa
export const MAX_PET_NAME_LENGTH = 20;
export const REWARD_EVERY = 5; // uma recompensa a cada 5 tarefas concluídas

// Energia: cada tarefa soma 1 e reinicia o relógio. Passadas 48h sem concluir
// nenhuma, a energia vai a zero de uma vez e a raposa dorme. Nunca desce aos poucos.
const HOUR_MS = 60 * 60 * 1000;
export const ENERGY_MAX = 10;
export const SLEEP_AFTER_MS = 48 * HOUR_MS;
export const SLEEPY_WINDOW_MS = 12 * HOUR_MS; // aviso discreto nas últimas 12h

// rewardsGranted nunca diminui, então desmarcar e marcar de novo não duplica.
export function pendingRewards(state) {
  return Math.max(0, Math.floor(state.completed / REWARD_EVERY) - state.rewardsGranted);
}

// `from` = menor número de tarefas concluídas em que o estágio começa.
export const STAGES = [
  { id: "egg", from: 0 },
  { id: "baby", from: 3 },
  { id: "pup", from: 10 },
  { id: "young", from: 30 },
  { id: "adult", from: 60 },
];

export function stageFor(completed) {
  const n = Math.max(0, completed);
  return [...STAGES].reverse().find((s) => n >= s.from).id;
}

export function createInitialState() {
  return {
    schema: 1,
    petName: null,
    tasks: [],
    completed: 0,
    rewardsGranted: 0,
    owned: [],
    equipped: { head: null, face: null, hold: null },
    diary: [],
    recentPhrases: [],
    lastOpenAt: null,
    energy: 0,
    lastActivityAt: null, // o relógio só começa na primeira tarefa concluída
    asleep: false,
  };
}

// Retorna { state, error }. Em caso de erro o estado volta idêntico.
export function addTask(state, text, id = crypto.randomUUID()) {
  const clean = String(text).trim();
  if (clean.length === 0) return { state, error: "empty" };
  if (charCount(clean) > MAX_TASK_LENGTH) return { state, error: "too_long" };
  const task = { id, text: clean, done: false, doneAt: null };
  return { state: { ...state, tasks: [...state.tasks, task] }, error: null };
}

export function completeTask(state, taskId, now = Date.now()) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.done) return state;
  return {
    ...state,
    completed: state.completed + 1,
    energy: Math.min(ENERGY_MAX, state.energy + 1),
    lastActivityAt: now,
    asleep: false,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, done: true, doneAt: now } : t)),
  };
}

// Desmarcar tira 1 de energia, mas não devolve o relógio anterior nem faz dormir.
export function uncompleteTask(state, taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || !task.done) return state;
  return {
    ...state,
    completed: Math.max(0, state.completed - 1),
    energy: Math.max(0, state.energy - 1),
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, done: false, doneAt: null } : t)),
  };
}

// Excluir não mexe em `completed`: a tarefa já alimentou a raposa.
export function deleteTask(state, taskId) {
  if (!state.tasks.some((t) => t.id === taskId)) return state;
  return { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
}

// Conclui a tarefa e escreve a entrada do diário (a mais nova fica primeiro).
export function completeWithDiary(
  state,
  taskId,
  { now = Date.now(), rng = Math.random, id = crypto.randomUUID(), item } = {},
) {
  // Se as 48h já passaram, o sono vale antes de concluir (a frase de volta depende disso).
  const base = applyTime(state, now);
  const done = completeTask(base, taskId, now);
  if (done === base) return base;

  const task = done.tasks.find((t) => t.id === taskId);
  const pet = base.petName ?? DEFAULT_PET_NAME;
  let recent = base.recentPhrases;
  let diary = done.diary;

  // Estava dormindo: primeiro a frase de volta (grupo C), depois a da tarefa.
  if (base.asleep) {
    const wake = writeEntry({ kind: "return", pet, tarefa: task.text, recent, rng });
    diary = [{ id: `${id}-wake`, taskId, text: wake.text, at: now }, ...diary];
    recent = pushRecent(recent, wake.phraseId);
  }

  // Cruzou um marco que ainda não foi entregue: frase do baú (grupo D).
  const crossedMilestone = pendingRewards(done) > pendingRewards(base);
  const { phraseId, text } = writeEntry({
    kind: crossedMilestone ? "milestone" : "complete",
    pet,
    tarefa: task.text,
    item,
    recent,
    rng,
  });
  return {
    ...done,
    diary: [{ id, taskId, text, at: now }, ...diary],
    recentPhrases: pushRecent(recent, phraseId),
  };
}

// Desmarca e remove a entrada daquela conclusão. recentPhrases não muda.
export function uncompleteWithDiary(state, taskId) {
  const undone = uncompleteTask(state, taskId);
  if (undone === state) return state;
  return { ...undone, diary: undone.diary.filter((e) => e.taskId !== taskId) };
}

// Retorna { state, error }. Em caso de erro o estado volta idêntico.
// O nome é sempre texto: nunca vira HTML nem variável de template.
export function setPetName(state, name) {
  const clean = String(name).trim();
  if (clean.length === 0) return { state, error: "empty" };
  if (charCount(clean) > MAX_PET_NAME_LENGTH) return { state, error: "too_long" };
  return { state: { ...state, petName: clean }, error: null };
}

// Aplica o relógio: passadas 48h sem concluir tarefa, a energia vai a zero de uma
// vez e a raposa dorme. Sem atividade registrada, nunca dorme. Idempotente.
export function applyTime(state, now = Date.now()) {
  if (state.asleep || state.lastActivityAt === null) return state;
  if (now - state.lastActivityAt < SLEEP_AFTER_MS) return state;
  return { ...state, energy: 0, asleep: true };
}

// Estado para a tela: { kind: "new" | "ok" | "sleepy" | "asleep", hoursLeft? }.
// "sleepy" aparece só nas últimas 12h antes de dormir.
export function energyStatus(state, now = Date.now()) {
  if (state.asleep) return { kind: "asleep" };
  if (state.lastActivityAt === null) return { kind: "new" };
  const left = state.lastActivityAt + SLEEP_AFTER_MS - now;
  if (left <= 0) return { kind: "asleep" };
  if (left <= SLEEPY_WINDOW_MS) return { kind: "sleepy", hoursLeft: Math.ceil(left / HOUR_MS) };
  return { kind: "ok" };
}
