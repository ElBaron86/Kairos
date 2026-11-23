// Petites fonctions partagées : dates, heures, montants, identifiants.

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const pad = (n) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJ. */
export const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const monthKey = (s = today()) => s.slice(0, 7);
export const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
/** Lundi de la semaine qui contient la date. */
export const weekStart = (s) => { const d = parseISO(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };

const fr = (s, opts) => parseISO(s).toLocaleDateString('fr-FR', opts);
export const fmtLong = (s) => fr(s, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtDay = (s) => fr(s, { day: 'numeric', month: 'long' });
export const fmtShort = (s) => fr(s, { day: 'numeric', month: 'short' });
export const fmtWeekday = (s) => fr(s, { weekday: 'short' }).replace('.', '');
export const fmtMonth = (key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "HH:MM" -> heures décimales. */
export const toH = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
export const nowH = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
export const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + pad(m % 60) : ''}` : `${Math.round(m)} min`);
export const fmtHours = (h) => (Math.round(h * 10) / 10).toString().replace('.', ',');

export const eur = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: n % 1 ? 2 : 0 }).format(n) + ' €';
export const num = (v) => { const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) ? n : 0; };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const pct = (a, b) => (b > 0 ? clamp(Math.round((a / b) * 100), 0, 100) : 0);

/** Nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) présents dans l'ensemble de dates. */
export const streakOf = (dates) => {
  const set = new Set(dates);
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) { n += 1; d = addDays(d, -1); }
  return n;
};
