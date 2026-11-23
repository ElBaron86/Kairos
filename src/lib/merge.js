// Fusion « à trois voies » de deux versions de l'état à partir de leur ancêtre commun.
//
// - Ce qui n'a changé que d'un côté est repris tel quel.
// - Les listes d'éléments avec identifiant (événements, dépenses, livres…) sont fusionnées
//   élément par élément : ajouts des deux côtés conservés, suppressions respectées.
// - Les listes simples (dates de lecture, exceptions…) sont réunies.
// - Si le même champ a changé des deux côtés, la version la plus récente l'emporte.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const withIds = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => isObj(x) && 'id' in x);

/**
 * @param {*} base Version commune (dernière synchronisation réussie).
 * @param {*} local Version de cet appareil.
 * @param {*} remote Version du serveur.
 * @param {boolean} localWins En cas de vrai conflit sur une même valeur, garder la version locale.
 * @returns {*} Version fusionnée (`undefined` = supprimé).
 */
export const merge3 = (base, local, remote, localWins) => {
  if (eq(local, remote)) return local;
  if (eq(base, local)) return remote;
  if (eq(base, remote)) return local;

  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    new Set([...Object.keys(local), ...Object.keys(remote)]).forEach((k) => {
      const v = merge3(b[k], local[k], remote[k], localWins);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }

  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = Array.isArray(base) ? base : [];
    if (withIds(local) || withIds(remote) || withIds(b)) {
      const byId = (arr) => new Map(arr.filter(isObj).map((x) => [x.id, x]));
      const B = byId(b); const L = byId(local); const R = byId(remote);
      const order = [...remote.map((x) => x.id), ...local.map((x) => x.id).filter((id) => !R.has(id))];
      return order.map((id) => merge3(B.get(id), L.get(id), R.get(id), localWins)).filter((x) => x !== undefined);
    }
    // Liste de valeurs simples : union, moins ce qu'un côté a retiré.
    const key = (x) => JSON.stringify(x);
    const bs = new Set(b.map(key));
    const removed = new Set([...b.filter((x) => !local.some((y) => key(y) === key(x))), ...b.filter((x) => !remote.some((y) => key(y) === key(x)))].map(key));
    const seen = new Set();
    return [...remote, ...local].filter((x) => {
      const k = key(x);
      if (seen.has(k) || (bs.has(k) && removed.has(k))) return false;
      seen.add(k);
      return true;
    });
  }

  return localWins ? local : remote;
};
