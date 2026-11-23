// Budget : dépenses récurrentes, versements automatiques vers les objectifs, import de relevés.
import { addMonths, monthKey, num, today } from './util.js';

/**
 * Ajoute les dépenses récurrentes du mois en cours dont le jour est arrivé.
 * Les identifiants sont déterministes (rec:<id>:<mois>) : deux appareils qui
 * les ajoutent en même temps produisent la même dépense, fusionnée à la synchronisation.
 * @param {object} d Brouillon de l'état (modifié sur place).
 * @returns {number} Nombre de dépenses ajoutées.
 */
export const applyRecurring = (d) => {
  const t = today();
  const m = monthKey(t);
  const dayNow = Number(t.slice(8, 10));
  let n = 0;
  (d.budget.recurring || []).forEach((r) => {
    if (r.since && r.since > m) return;
    if ((r.skip || []).includes(m) || r.day > dayNow) return;
    const id = `rec:${r.id}:${m}`;
    if (d.budget.expenses.some((e) => e.id === id)) return;
    d.budget.expenses.push({ id, date: `${m}-${String(r.day).padStart(2, '0')}`, cat: r.cat, label: r.label, amount: r.amount, recurringId: r.id });
    n += 1;
  });
  return n;
};

/** Nombre de mois écoulés (mois courant inclus) depuis `from`. */
const monthsSince = (from) => {
  if (!from) return 0;
  let k = from; let n = 0;
  const m = monthKey(today());
  while (k <= m && n < 600) { n += 1; k = addMonths(k, 1); }
  return n;
};

/** Montant épargné d'un objectif, versements automatiques compris. */
export const goalSaved = (g) => g.saved + (g.monthly > 0 ? g.monthly * monthsSince(g.autoFrom) : 0);

/** Fige les versements passés avant de changer le montant mensuel. */
export const setGoalMonthly = (g, monthly) => {
  g.saved = goalSaved(g);
  g.monthly = monthly;
  g.autoFrom = monthly > 0 ? addMonths(monthKey(today()), 1) : null;
};

// ---------- Import de relevé bancaire (CSV) ----------

const KEYWORDS = [
  ['logement', /loyer|bailleur|habitat|syndic|immobili/i],
  ['courses', /carrefour|leclerc|auchan|lidl|aldi|intermarch|monoprix|franprix|casino|super ?u|picard|march[eé]|boulang/i],
  ['transport', /sncf|ratp|navigo|uber|total|esso|shell|bp |essence|carburant|p[eé]age|parking|blablacar|transport/i],
  ['energie', /edf|engie|total ?energ|eau |veolia|suez|gaz|electricit/i],
  ['abos', /free|orange|sfr|bouygues|netflix|spotify|deezer|disney|amazon prime|canal|apple\.com|google|abonnement/i],
  ['dons', /d[iî]me|don |dons|[eé]glise|offrande|association/i],
  ['sante', /pharma|m[eé]decin|docteur|dentist|mutuelle|h[oô]pital|kin[eé]|ophtalm|laborato/i],
  ['loisirs', /cin[eé]ma|fnac|steam|playstation|concert|th[eé][aâ]tre|sport|salle|decathlon|loisir/i],
  ['resto', /restaurant|resto|mcdo|mcdonald|burger|kfc|pizza|sushi|caf[eé]|bar |deliveroo|uber ?eats|just ?eat/i],
  ['vetements', /zara|h&m|kiabi|primark|uniqlo|v[eê]tement|chauss/i],
  ['cadeaux', /cadeau|fleur|interflora/i],
  ['education', /[eé]cole|cours|formation|universit|librairie|scolar/i]
];

export const guessCategory = (label) => (KEYWORDS.find(([, re]) => re.test(label)) || ['loisirs'])[0];

const parseDate = (s) => {
  const v = s.trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return null;
};

const amount = (s) => {
  if (s == null) return 0;
  let v = String(s).replace(/[€\s ]/g, '').replace(/"/g, '');
  if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.');
  return num(v);
};

const splitLine = (line, sep) => {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

/**
 * Lit un relevé bancaire CSV et renvoie les dépenses (montants négatifs ou colonne débit).
 * @param {string} text Contenu du fichier.
 * @returns {{id: string, date: string, label: string, amount: number, cat: string}[]}
 */
export const parseBankCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headerIdx = lines.findIndex((l) => /date/i.test(l));
  if (headerIdx < 0) return [];
  const head = splitLine(lines[headerIdx], sep).map((h) => h.toLowerCase());
  const col = (re) => head.findIndex((h) => re.test(h));
  const iDate = col(/date/);
  const iLabel = col(/libell|label|description|d[eé]tail|op[eé]ration|intitul/);
  const iAmount = col(/^montant|amount|^valeur|somme/);
  const iDebit = col(/d[eé]bit/);
  const iCredit = col(/cr[eé]dit/);
  const out = [];
  lines.slice(headerIdx + 1).forEach((l) => {
    const c = splitLine(l, sep);
    const date = parseDate(c[iDate] || '');
    if (!date) return;
    let a = 0;
    if (iAmount >= 0) a = amount(c[iAmount]);
    else if (iDebit >= 0) a = -Math.abs(amount(c[iDebit])) + (iCredit >= 0 ? Math.abs(amount(c[iCredit])) : 0);
    if (a >= 0) return;
    const label = (c[iLabel] || 'Dépense').replace(/\s+/g, ' ').slice(0, 60);
    out.push({ id: `csv:${date}:${Math.abs(a).toFixed(2)}:${label.slice(0, 20)}`, date, label, amount: Math.round(Math.abs(a) * 100) / 100, cat: guessCategory(label) });
  });
  return out;
};
