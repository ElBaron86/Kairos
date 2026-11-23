// Notifications application fermée (Web Push).
//
// L'application calcule elle-même ses rappels des 14 prochains jours et les dépose
// dans la file `push_queue` de Supabase, avec leur heure exacte (UTC). Une fonction
// planifiée envoie chaque minute ceux qui sont arrivés à échéance. Le serveur n'a
// donc aucun calcul de fuseau horaire ni de récurrence à faire.
import { getState } from '../store.js';
import { supabase } from './cloud.js';
import { upcoming } from './reminders.js';

// Clé publique VAPID (la clé privée n'est que dans les secrets Supabase).
const VAPID_PUBLIC = 'BC42aImpOKrTPstl06wsYE5isAU_gbJBCKtHp3U1rySEXK2cROhnB7GZcX4TB_DTBKuwkjcWMFTV1l-kiw9iwXg';
const FLAG = 'kairos:push';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && location.protocol === 'https:';
export const pushActive = () => { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } };

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Abonne cet appareil aux notifications serveur. Renvoie un message d'erreur ou null. */
export const enablePush = async () => {
  if (!pushSupported()) return 'Notifications serveur indisponibles sur ce navigateur.';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Connectez-vous pour recevoir les rappels application fermée.';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
    const j = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error) return 'Le serveur de notifications n’est pas encore prêt.';
    localStorage.setItem(FLAG, '1');
    await syncQueue();
    return null;
  } catch (e) {
    return 'Abonnement impossible : autorisez les notifications pour Kairos.';
  }
};

export const disablePush = async () => {
  try {
    localStorage.removeItem(FLAG);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  } catch (e) { /* ignoré */ }
};

let timer = null;
/** Remplace les rappels à venir de l'utilisateur dans la file d'envoi. */
export const syncQueue = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const s = getState();
  const items = upcoming(s, 14)
    .filter((r) => !s.muted[r.source] && r.when.getTime() > Date.now())
    .slice(0, 200)
    .map((r) => ({ user_id: session.user.id, key: r.key, title: r.title, body: `${r.time} · ${r.sub}`, send_at: r.when.toISOString() }));
  await supabase.from('push_queue').delete().eq('user_id', session.user.id).eq('sent', false);
  if (items.length) await supabase.from('push_queue').upsert(items, { onConflict: 'user_id,key', ignoreDuplicates: true });
};

/** À appeler après chaque modification : met la file à jour quelques secondes plus tard. */
export const scheduleQueueSync = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { syncQueue().catch(() => {}); }, 4000);
};
