// État global de l'application, enregistré dans le navigateur (localStorage).
// Toutes les modifications passent par `update`. La synchronisation Supabase
// (src/lib/cloud.js) écoute `subscribe` et envoie l'état au serveur.
import { useEffect, useState } from 'preact/hooks';

const KEY = 'kairos:v1';

export const EMPTY = {
  version: 1,
  meta: { updatedAt: 0 },
  onboarded: false,
  settings: { name: '', notifications: false },
  events: [],
  budget: { income: 0, incomeByMonth: {}, expenses: [], goals: [] },
  plans: [],
  books: [],
  bookGoal: 12,
  skills: [],
  reminders: [],
  muted: {},
  fired: {}
};

const normalize = (raw) => ({ ...structuredClone(EMPTY), ...raw, meta: { ...EMPTY.meta, ...(raw && raw.meta) } });

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* stockage indisponible : on démarre à vide */ }
  return structuredClone(EMPTY);
};

let state = load();
const listeners = new Set();

const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
};

const emit = (source) => listeners.forEach((l) => l(state, source));

export const getState = () => state;

/**
 * Applique une modification locale.
 * @param {(draft: object) => object|void} fn Reçoit une copie de l'état, la modifie ou en renvoie une nouvelle.
 * @param {{silent?: boolean}} [opts] `silent` : ne compte pas comme une modification à synchroniser.
 */
export const update = (fn, opts = {}) => {
  const draft = structuredClone(state);
  const next = fn(draft) || draft;
  if (!opts.silent) next.meta = { ...next.meta, updatedAt: Date.now() };
  state = next;
  save();
  emit(opts.silent ? 'silent' : 'local');
};

export const replaceState = (next) => update(() => normalize(next));

/** Remplace l'état par celui reçu du serveur, sans le renvoyer ensuite. */
export const applyRemote = (data) => {
  // Les rappels déjà affichés sur cet appareil restent marqués, pour ne pas les répéter.
  state = normalize({ ...data, fired: { ...(data.fired || {}), ...state.fired } });
  save();
  emit('remote');
};

/** @param {(state: object, source: 'local'|'remote'|'silent') => void} l */
export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

/** Hook Preact : renvoie l'état courant et se met à jour à chaque changement. */
export const useStore = () => {
  const [s, set] = useState(state);
  useEffect(() => subscribe((x) => set(x)), []);
  return s;
};

// Autre onglet ouvert : on recharge l'état modifié ailleurs.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = load(); emit('remote'); }
  });
}
