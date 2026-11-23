// Événements : récurrences, journées entières et événements sur plusieurs jours.
import { parseISO } from './util.js';

export const FREQS = [
  ['none', 'Jamais'],
  ['daily', 'Chaque jour'],
  ['weekly', 'Chaque semaine'],
  ['monthly', 'Chaque mois'],
  ['yearly', 'Chaque année']
];

export const isRecurring = (e) => !!(e.repeat && e.repeat.freq && e.repeat.freq !== 'none');

/**
 * L'événement a-t-il lieu ce jour-là ?
 * @param {object} e Événement (date, endDate?, repeat?, skip?).
 * @param {string} date Jour au format AAAA-MM-JJ.
 */
export const occursOn = (e, date) => {
  if (e.skip && e.skip.includes(date)) return false;
  if (date < e.date) return false;
  if (!isRecurring(e)) return date <= (e.endDate || e.date);
  const r = e.repeat;
  if (r.until && date > r.until) return false;
  const d = parseISO(date);
  const s = parseISO(e.date);
  if (r.freq === 'daily') return true;
  if (r.freq === 'weekly') return (r.days && r.days.length ? r.days : [s.getDay()]).includes(d.getDay());
  if (r.freq === 'monthly') return d.getDate() === s.getDate();
  if (r.freq === 'yearly') return d.getDate() === s.getDate() && d.getMonth() === s.getMonth();
  return false;
};

/** Occurrences d'un jour, journées entières d'abord puis par heure. `on` = date de l'occurrence. */
export const eventsOn = (events, date) => events
  .filter((e) => occursOn(e, date))
  .map((e) => ({ ...e, on: date }))
  .sort((a, b) => (a.allDay === b.allDay ? (a.start || '').localeCompare(b.start || '') : a.allDay ? -1 : 1));

/** Occurrences avec horaire (celles qui vont sur le cadran). */
export const timedOn = (events, date) => eventsOn(events, date).filter((e) => !e.allDay);

export const repeatLabel = (e) => {
  if (!isRecurring(e)) return '';
  const r = e.repeat;
  if (r.freq === 'weekly' && r.days && r.days.length) {
    const names = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const order = [1, 2, 3, 4, 5, 6, 0].filter((x) => r.days.includes(x));
    if (order.length === 5 && !r.days.includes(0) && !r.days.includes(6)) return 'En semaine';
    if (order.length === 7) return 'Tous les jours';
    return 'Chaque ' + order.map((x) => names[x]).join(', ');
  }
  return FREQS.find(([k]) => k === r.freq)[1];
};
