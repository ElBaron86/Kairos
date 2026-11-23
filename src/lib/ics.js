// Lecture des fichiers d'agenda .ics (export Google Agenda, iCloud, Outlook…).
import { addDays, iso, today, uid } from './util.js';

const DAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const pad = (n) => String(n).padStart(2, '0');

/** Convertit une valeur DTSTART/DTEND en { date, time, allDay } à l'heure locale. */
const parseDate = (params, value) => {
  const v = value.trim();
  if (params.includes('VALUE=DATE') || /^\d{8}$/.test(v)) {
    return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, time: null, allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  // Heure UTC : on la convertit en heure locale. Heure avec TZID ou flottante : on la garde telle quelle.
  const dt = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)) : new Date(+y, +mo - 1, +d, +h, +mi);
  return { date: iso(dt), time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`, allDay: false };
};

const parseRule = (rule) => {
  const p = Object.fromEntries(rule.split(';').map((x) => x.split('=')));
  const freq = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }[p.FREQ];
  if (!freq) return null;
  const r = { freq, days: [], until: null };
  if (p.BYDAY && freq === 'weekly') r.days = p.BYDAY.split(',').map((x) => DAY[x.slice(-2)]).filter((x) => x != null);
  if (p.UNTIL) { const u = parseDate('', p.UNTIL); if (u) r.until = u.date; }
  return r;
};

const unescape = (s) => s.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();

/**
 * Transforme le texte d'un fichier .ics en événements Kairos.
 * Garde les événements des 30 derniers jours et à venir, plus les séries encore actives.
 * @param {string} text Contenu du fichier.
 * @returns {object[]}
 */
export const parseICS = (text) => {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out = [];
  let cur = null;
  const from = addDays(today(), -30);
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur && cur.start && cur.title) {
        const rec = cur.repeat;
        const last = rec ? rec.until || '9999-12-31' : cur.end ? cur.end.date : cur.start.date;
        if (last >= from && cur.status !== 'CANCELLED') {
          const allDay = cur.start.allDay;
          let endDate = null;
          if (allDay && cur.end) { const e = addDays(cur.end.date, -1); if (e > cur.start.date) endDate = e; }
          out.push({
            id: uid(), icsUid: cur.uid || null, title: cur.title, date: cur.start.date,
            endDate: rec ? null : endDate, allDay,
            start: allDay ? '00:00' : cur.start.time,
            end: allDay ? '23:59' : cur.end && cur.end.date === cur.start.date ? cur.end.time : (cur.start.time < '23:00' ? `${pad(+cur.start.time.slice(0, 2) + 1)}:${cur.start.time.slice(3)}` : '23:59'),
            cat: 'perso', remind: null, repeat: rec || { freq: 'none' }, skip: cur.skip || []
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const head = line.slice(0, i);
    const value = line.slice(i + 1);
    const [name, ...params] = head.split(';');
    const ps = params.join(';');
    if (name === 'SUMMARY') cur.title = unescape(value);
    else if (name === 'DTSTART') cur.start = parseDate(ps, value);
    else if (name === 'DTEND') cur.end = parseDate(ps, value);
    else if (name === 'RRULE') cur.repeat = parseRule(value);
    else if (name === 'UID') cur.uid = value.trim();
    else if (name === 'STATUS') cur.status = value.trim();
    else if (name === 'EXDATE') cur.skip = [...(cur.skip || []), ...value.split(',').map((v) => parseDate(ps, v)).filter(Boolean).map((x) => x.date)];
  }
  return out;
};
