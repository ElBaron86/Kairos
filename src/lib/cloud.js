// Compte et synchronisation avec Supabase.
//
// Principe : l'application reste « locale d'abord ». Chaque modification est
// enregistrée sur l'appareil, puis envoyée au serveur ~1,5 s plus tard. À l'ouverture
// et quand l'application revient au premier plan, on récupère la version du serveur
// si elle est plus récente. En cas de modifications simultanées sur deux appareils
// hors ligne, la plus récente l'emporte.
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';
import { applyRemote, getState, subscribe } from '../store.js';

// L'URL et la clé « publishable » sont publiques par nature : la sécurité repose sur
// les règles RLS de la table (voir supabase/migrations). Ne jamais mettre ici la clé secrète.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://coaiwgpbwybgfpebvcns.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_RUrRl7ndBsqrpPUgkdKCWg_npeUXUlE';
const TABLE = 'kairos_state';
const LINK_KEY = 'kairos:sync-user';

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'kairos:auth' }
});

let status = { user: null, state: 'off', at: null, error: null, conflict: null };
const listeners = new Set();
const set = (patch) => { status = { ...status, ...patch }; listeners.forEach((l) => l(status)); };

/** Hook : état du compte et de la synchronisation. */
export const useCloud = () => {
  const [s, setS] = useState(status);
  useEffect(() => { listeners.add(setS); return () => listeners.delete(setS); }, []);
  return s;
};

const linkedUser = () => { try { return localStorage.getItem(LINK_KEY); } catch (e) { return null; } };
const link = (id) => { try { if (id) localStorage.setItem(LINK_KEY, id); else localStorage.removeItem(LINK_KEY); } catch (e) { /* ignoré */ } };

/** L'appareil contient-il des données saisies (et pas seulement un état vide) ? */
const hasLocalData = (s) => s.onboarded && (s.events.length + s.plans.length + s.books.length + s.skills.length + s.budget.expenses.length + s.reminders.length) > 0;

const friendly = (e) => {
  const m = (e && (e.message || e.error_description || String(e))) || '';
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(m)) return 'Confirmez d’abord votre adresse avec le lien reçu par e-mail.';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connectez-vous.';
  if (/Password should be/i.test(m)) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (/rate limit/i.test(m)) return 'Trop de tentatives, réessayez dans quelques minutes.';
  if (/relation .* does not exist|Could not find the table/i.test(m)) return 'La table kairos_state n’existe pas encore dans Supabase (voir le README).';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Pas de connexion au serveur.';
  return m || 'Erreur inconnue.';
};

export const push = async () => {
  if (!status.user) return;
  const s = getState();
  set({ state: 'syncing' });
  const { error } = await supabase.from(TABLE).upsert({ user_id: status.user.id, data: s, updated_at: new Date(s.meta.updatedAt || Date.now()).toISOString() });
  if (error) { set({ state: 'error', error: friendly(error) }); return; }
  link(status.user.id);
  set({ state: 'ok', at: new Date(), error: null });
};

export const pull = async () => {
  if (!status.user) return;
  set({ state: 'syncing' });
  const { data, error } = await supabase.from(TABLE).select('data, updated_at').eq('user_id', status.user.id).maybeSingle();
  if (error) { set({ state: 'error', error: friendly(error) }); return; }
  const local = getState();
  if (!data) { await push(); return; }
  const remoteAt = (data.data.meta && data.data.meta.updatedAt) || Date.parse(data.updated_at) || 0;
  const localAt = local.meta.updatedAt || 0;
  // Premier branchement de cet appareil sur ce compte : on demande avant d'écraser quoi que ce soit.
  if (linkedUser() !== status.user.id && hasLocalData(local)) {
    set({ state: 'conflict', conflict: { remoteAt, remote: data.data } });
    return;
  }
  if (linkedUser() !== status.user.id || remoteAt > localAt) applyRemote(data.data);
  else if (localAt > remoteAt) { await push(); return; }
  link(status.user.id);
  set({ state: 'ok', at: new Date(), error: null });
};

/** Réponse à la question du premier branchement. */
export const resolveConflict = async (keep) => {
  const c = status.conflict;
  if (!c) return;
  set({ conflict: null });
  link(status.user.id);
  if (keep === 'remote') { applyRemote(c.remote); set({ state: 'ok', at: new Date() }); }
  else await push();
};

export const signIn = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error));
};

/** @returns {Promise<boolean>} true si une confirmation par e-mail est nécessaire. */
export const signUp = async (email, password) => {
  const redirect = location.origin + location.pathname;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
  if (error) throw new Error(friendly(error));
  return !data.session;
};

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw new Error(friendly(error));
};

export const signOut = async () => {
  await supabase.auth.signOut();
  link(null);
  set({ user: null, state: 'off', at: null, error: null, conflict: null });
};

let timer = null;
let started = false;

/** Démarre l'écoute du compte et la synchronisation automatique (appelé une fois). */
export const startCloud = () => {
  if (started) return;
  started = true;
  const onUser = (user) => {
    const changed = (user && user.id) !== (status.user && status.user.id);
    set({ user: user || null, state: user ? status.state : 'off' });
    if (user && changed) pull();
  };
  supabase.auth.getSession().then(({ data }) => onUser(data.session && data.session.user)).catch(() => set({ state: 'error', error: 'Pas de connexion au serveur.' }));
  supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => onUser(session && session.user), 0));

  subscribe((_s, source) => {
    if (source !== 'local' || !status.user || status.conflict) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1500);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  window.addEventListener('online', () => pull());
  setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 60000);
};
