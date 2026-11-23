// Calcul des rappels à venir et envoi des notifications.
import { addDays, iso, parseISO, today, toH } from './util.js';
import { occursOn } from './events.js';

const nextMonth = (date) => { const d = parseISO(date); d.setMonth(d.getMonth() + 1); return iso(d); };

const at = (dateISO, hhmm, minusMin = 0) => {
  const d = parseISO(dateISO);
  const h = toH(hhmm);
  d.setHours(Math.floor(h), Math.round((h % 1) * 60) - minusMin, 0, 0);
  return d;
};

const LEAD = (m) => (m >= 1440 ? 'la veille' : m >= 60 ? `${m / 60} h avant` : `${m} min avant`);

/** Prochaine lecture non validée d'un plan, ou -1 s'il est terminé. */
export const nextIndex = (plan) => plan.days.findIndex((_, i) => !plan.done[i]);

/**
 * Liste des rappels entre aujourd'hui et `days` jours plus tard.
 * @returns {{key: string, source: string, when: Date, date: string, time: string, title: string, sub: string, kind: string}[]}
 */
export const upcoming = (s, days = 7) => {
  const from = today();
  const to = addDays(from, days);
  const out = [];

  // Les rappels « la veille » d'un événement de demain + days doivent aussi être vus.
  for (let i = 0; i <= days + 1; i += 1) {
    const date = addDays(from, i);
    s.events.forEach((e) => {
      if (e.remind == null || !occursOn(e, date) || (e.endDate && date !== e.date)) return;
      const time = e.allDay ? '09:00' : e.start;
      const when = at(date, time, e.remind);
      const wd = iso(when);
      if (wd < from || wd > to) return;
      out.push({ key: `ev:${e.id}:${date}`, source: `ev:${e.id}`, when, date: wd, time: e.allDay ? 'Journée' : e.start, title: e.title, sub: LEAD(e.remind), kind: 'agenda' });
    });
  }

  s.plans.forEach((p) => {
    const n = nextIndex(p);
    if (!p.remind || n === -1) return;
    const readToday = Object.values(p.done).includes(from);
    const wd = p.weekdays && p.weekdays.length ? p.weekdays : [0, 1, 2, 3, 4, 5, 6];
    let idx = n;
    for (let i = 0; i <= days; i += 1) {
      const date = addDays(from, i);
      if (!wd.includes(parseISO(date).getDay())) continue;
      if (i === 0 && readToday) continue;
      if (idx >= p.days.length) break;
      const when = at(date, p.time);
      out.push({ key: `plan:${p.id}:${date}`, source: `plan:${p.id}`, when, date, time: p.time, title: `Lecture : ${p.days[idx].ref}`, sub: `Plan ${p.name}`, kind: 'lecture' });
      if (when.getTime() > Date.now()) idx += 1;
    }
  });

  s.skills.forEach((k) => {
    if (!k.remindTime) return;
    const days = k.remindDays && k.remindDays.length ? k.remindDays : [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i <= days.length && i <= 7; i += 1) {
      const date = addDays(from, i);
      if (date > to || !days.includes(parseISO(date).getDay())) continue;
      if (k.sessions.some((x) => x.date === date)) continue;
      out.push({ key: `skill:${k.id}:${date}`, source: `skill:${k.id}`, when: at(date, k.remindTime), date, time: k.remindTime, title: `${k.name} : c’est l’heure de pratiquer`, sub: 'Rappel de pratique', kind: 'progres' });
    }
  });

  if (s.settings.reviewReminder !== false) {
    for (let i = 0; i <= days; i += 1) {
      const date = addDays(from, i);
      if (parseISO(date).getDay() !== 0) continue;
      out.push({ key: `review:${date}`, source: 'review', when: at(date, '19:00'), date, time: '19:00', title: 'Revue de la semaine', sub: 'Bilan et intentions', kind: 'perso' });
    }
  }

  s.reminders.forEach((r) => {
    let date = r.date || from;
    let guard = 0;
    while (date < from && guard < 400) {
      guard += 1;
      if (r.repeat === 'daily') date = addDays(date, 1);
      else if (r.repeat === 'weekly') date = addDays(date, 7);
      else if (r.repeat === 'monthly') date = nextMonth(date);
      else break;
    }
    guard = 0;
    while (date <= to && guard < 40) {
      guard += 1;
      if (date >= from) out.push({ key: `rem:${r.id}:${date}`, source: `rem:${r.id}`, when: at(date, r.time), date, time: r.time, title: r.title, sub: { none: 'Une fois', daily: 'Tous les jours', weekly: 'Chaque semaine', monthly: 'Chaque mois' }[r.repeat || 'none'], kind: r.kind || 'perso', reminderId: r.id });
      if (r.repeat === 'daily') date = addDays(date, 1);
      else if (r.repeat === 'weekly') date = addDays(date, 7);
      else if (r.repeat === 'monthly') date = nextMonth(date);
      else break;
    }
  });

  return out.filter((x) => x.when.getTime() > Date.now() - 60 * 60000).sort((a, b) => a.when - b.when);
};

/** Affiche une notification système si l'utilisateur l'a autorisée. */
export const notify = async (title, body) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg) { await reg.showNotification(title, { body, icon: './icon-192.png', badge: './icon-192.png', tag: title }); return true; }
    new Notification(title, { body });
    return true;
  } catch (e) { return false; }
};

export const askPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
};
