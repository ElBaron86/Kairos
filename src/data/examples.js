// Données d'exemple, calculées par rapport à la date du jour.
import { addDays, monthKey, today, uid, weekStart } from '../lib/util.js';
import { theme } from './bible.js';
import { skillTemplate } from './catalog.js';

export const exampleState = (name = '') => {
  const t = today();
  const mon = weekStart(t);
  const d = (i) => addDays(mon, i);
  const E = (day, start, end, title, cat, remind = null) => ({ id: uid(), date: d(day), start, end, title, cat, remind });
  const m = monthKey(t);
  const X = (cat, label, amount) => ({ id: uid(), date: `${m}-01`, cat, label, amount });
  const courage = theme('courage');

  const sessions = [];
  for (let i = 1; i <= 75; i += 1) {
    if (i > 12 && i % 5 === 3) continue;
    sessions.push({ date: addDays(t, -i), min: [20, 30, 30, 45, 25][i % 5], kind: 'pratique' });
  }
  const piano = skillTemplate('instrument');
  const langue = skillTemplate('langue');

  return {
    onboarded: true,
    settings: { name, notifications: false },
    events: [
      E(0, '07:00', '07:30', 'Lecture & prière', 'spirit'), E(0, '09:00', '12:00', 'Réunion projet', 'travail', 15),
      E(0, '12:30', '13:30', 'Déjeuner avec Sarah', 'perso'), E(0, '14:00', '17:30', 'Temps de concentration', 'travail'),
      E(0, '18:00', '18:45', 'Sport', 'sante', 15), E(0, '19:30', '21:00', 'Étude biblique', 'spirit', 30),
      E(1, '08:30', '12:30', 'Atelier client', 'travail'), E(1, '18:30', '19:30', 'Appel avec maman', 'famille', 15),
      E(2, '09:00', '17:00', 'Journée au bureau', 'travail'), E(2, '19:30', '22:00', 'Dîner chez des amis', 'perso', 60),
      E(3, '14:00', '15:00', 'Rendez-vous médecin', 'sante', 60), E(3, '20:00', '21:00', 'Réunion de prière', 'spirit', 30),
      E(4, '09:00', '16:00', 'Travail', 'travail'), E(4, '19:00', '22:00', 'Soirée jeux en famille', 'famille'),
      E(5, '08:00', '09:00', 'Course à pied', 'sante'), E(5, '15:00', '19:00', 'Anniversaire', 'famille', 120),
      E(6, '10:00', '12:00', 'Culte', 'spirit', 45), E(6, '12:30', '15:00', 'Repas en famille', 'famille')
    ],
    budget: {
      income: 2450, incomeByMonth: {},
      expenses: [X('logement', 'Loyer', 780), X('courses', 'Supermarché', 320), X('transport', 'Pass transport', 90), X('transport', 'Essence', 50), X('energie', 'Électricité', 95), X('abos', 'Téléphone & box', 48), X('dons', 'Dîme', 245), X('sante', 'Pharmacie', 30), X('loisirs', 'Cinéma', 60)],
      goals: [
        { id: uid(), name: 'Voyage en Italie', target: 2000, saved: 1240, style: 0 },
        { id: uid(), name: 'Fonds d’urgence', target: 5000, saved: 3100, style: 1 },
        { id: uid(), name: 'Nouvel ordinateur', target: 1200, saved: 450, style: 2 }
      ]
    },
    plans: [{
      id: uid(), kind: 'theme', themeId: 'courage', name: courage.name, color: courage.color, icon: courage.icon, key: courage.key, desc: courage.desc,
      days: courage.days, done: { 0: addDays(t, -2), 1: addDays(t, -1) }, start: addDays(t, -2), time: '07:00', remind: true
    }],
    books: [
      { id: uid(), title: 'Un rien peut tout changer', author: 'James Clear', cat: 'dev', pages: 320, page: 142, status: 'reading', target: addDays(t, 22), log: [addDays(t, -1), addDays(t, -2), addDays(t, -3)] },
      { id: uid(), title: 'Les Fondements du christianisme', author: 'C. S. Lewis', cat: 'spi', pages: 260, page: 88, status: 'reading', target: null, log: [addDays(t, -1)] },
      { id: uid(), title: 'Les Misérables', author: 'Victor Hugo', cat: 'roman', pages: 1500, page: 0, status: 'todo', log: [] },
      { id: uid(), title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', cat: 'roman', pages: 100, page: 100, status: 'done', finishedAt: addDays(t, -21), log: [] }
    ],
    bookGoal: 12,
    skills: [
      { id: uid(), name: 'Piano', type: 'instrument', color: piano.color, icon: piano.icon, weeklyGoal: 150, metric: 3, unit: piano.unit, sessions,
        steps: piano.steps.map((title, i) => ({ id: uid(), title: i === 2 ? 'Premier morceau : Au clair de la lune' : i === 4 ? 'Lettre à Élise, thème principal' : title, doneAt: i < 4 ? addDays(t, -60 + i * 15) : null })) },
      { id: uid(), name: 'Anglais', type: 'langue', color: langue.color, icon: langue.icon, weeklyGoal: 120, metric: 640, unit: langue.unit,
        sessions: sessions.filter((_, i) => i % 2 === 0).map((s) => ({ ...s, kind: 'Application' })),
        steps: langue.steps.map((title, i) => ({ id: uid(), title, doneAt: i < 3 ? addDays(t, -200 + i * 60) : null })) }
    ],
    reminders: [
      { id: uid(), title: 'Payer le loyer', date: `${monthKey(addDays(t, 30))}-01`, time: '09:00', repeat: 'monthly', kind: 'budget' },
      { id: uid(), title: 'Bilan du budget', date: addDays(mon, 6), time: '20:00', repeat: 'weekly', kind: 'budget' }
    ],
    muted: {}, fired: {}
  };
};
