// Calculs dérivés de l'état (budget du mois, niveaux, séries…).
import { LEVELS, LEVEL_MIN } from '../data/catalog.js';
import { addDays, monthKey, streakOf, today } from './util.js';

export const incomeFor = (s, key) => s.budget.incomeByMonth[key] ?? s.budget.income ?? 0;

export const monthBudget = (s, key = monthKey()) => {
  const expenses = s.budget.expenses.filter((e) => e.date.startsWith(key));
  const spent = expenses.reduce((t, e) => t + e.amount, 0);
  const income = incomeFor(s, key);
  return { key, income, spent, savings: income - spent, expenses };
};

export const skillStats = (sk) => {
  const total = sk.sessions.reduce((t, x) => t + x.min, 0);
  const t = today();
  const from = addDays(t, -6);
  const week = sk.sessions.filter((x) => x.date >= from).reduce((a, x) => a + x.min, 0);
  const level = Math.floor(total / LEVEL_MIN);
  const into = total % LEVEL_MIN;
  const doneSteps = sk.steps.filter((x) => x.doneAt).length;
  const current = sk.steps.find((x) => !x.doneAt);
  return {
    total, week, level, levelName: LEVELS[Math.min(level, LEVELS.length - 1)], into, toNext: LEVEL_MIN - into,
    levelPct: Math.round((into / LEVEL_MIN) * 100), streak: streakOf(sk.sessions.map((x) => x.date)),
    doneSteps, current, todayMin: sk.sessions.filter((x) => x.date === t).reduce((a, x) => a + x.min, 0)
  };
};

/** Série globale : jours où au moins une séance a eu lieu, tous apprentissages confondus. */
export const globalStreak = (s) => streakOf(s.skills.flatMap((k) => k.sessions.map((x) => x.date)));

/** Minutes pratiquées pour chacun des 7 derniers jours (le dernier = aujourd'hui). */
export const last7 = (s) => Array.from({ length: 7 }, (_, i) => {
  const d = addDays(today(), i - 6);
  return { date: d, min: s.skills.reduce((t, k) => t + k.sessions.filter((x) => x.date === d).reduce((a, x) => a + x.min, 0), 0) };
});

export const finishedThisYear = (s) => {
  const y = today().slice(0, 4);
  return s.books.filter((b) => b.status === 'done' && (b.finishedAt || '').startsWith(y)).length;
};
