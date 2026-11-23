import { render } from 'preact';
import { useEffect } from 'preact/hooks';
// Polices intégrées à l'application (affichage identique hors ligne).
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './styles.css';
import { getState, update, useStore } from './store.js';
import { notify, upcoming } from './lib/reminders.js';
import { TabBar, Toaster, toast, useRoute } from './ui/kit.jsx';
import { Welcome } from './pages/Welcome.jsx';
import { Home } from './pages/Home.jsx';
import { Settings } from './pages/Settings.jsx';
import { Agenda } from './pages/Agenda.jsx';
import { Budget } from './pages/Budget.jsx';
import { Bible, Journal, PlanDetail, NewPlan } from './pages/Bible.jsx';
import { Books } from './pages/Books.jsx';
import { Progress, SkillDetail } from './pages/Progress.jsx';
import { Reminders } from './pages/Reminders.jsx';
import { Review } from './pages/Review.jsx';
import { ConflictSheet } from './ui/Account.jsx';
import { startCloud } from './lib/cloud.js';
import { applyRecurring } from './lib/budget.js';
import { pushActive, scheduleQueueSync } from './lib/push.js';
import { subscribe } from './store.js';

/** Vérifie chaque minute les rappels arrivés à échéance. */
const useReminderLoop = () => {
  useEffect(() => {
    const tick = () => {
      const s = getState();
      const now = Date.now();
      const due = upcoming(s, 1).filter((r) => r.when.getTime() <= now && now - r.when.getTime() < 15 * 60000 && !s.fired[r.key] && !s.muted[r.source]);
      if (!due.length) return;
      due.forEach((r) => {
        toast(`${r.title} · ${r.time}`);
        // Si le serveur envoie déjà les notifications à cet appareil, on évite le doublon.
        if (s.settings.notifications && !pushActive()) notify(r.title, `${r.time} · ${r.sub}`);
      });
      update((d) => {
        due.forEach((r) => { d.fired[r.key] = now; });
        Object.keys(d.fired).forEach((k) => { if (now - d.fired[k] > 3 * 86400000) delete d.fired[k]; });
      }, { silent: true });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
};

/** Ajoute les dépenses récurrentes du mois quand leur jour arrive. */
const useRecurringBudget = () => {
  useEffect(() => {
    const run = () => {
      if (!getState().onboarded) return;
      const probe = structuredClone(getState());
      if (applyRecurring(probe) > 0) update((d) => { applyRecurring(d); });
    };
    run();
    const id = setInterval(run, 3600000);
    return () => clearInterval(id);
  }, []);
};

const App = () => {
  const s = useStore();
  const route = useRoute();
  useReminderLoop();
  useRecurringBudget();
  if (!s.onboarded) return <><Welcome /><ConflictSheet /><Toaster /></>;

  const parts = route.split('/').filter(Boolean);
  let page;
  if (parts[0] === 'agenda') page = <Agenda />;
  else if (parts[0] === 'budget') page = <Budget />;
  else if (parts[0] === 'lecture' && parts[1] === 'livres') page = <Books />;
  else if (parts[0] === 'lecture' && parts[1] === 'plan') page = <PlanDetail id={parts[2]} />;
  else if (parts[0] === 'lecture' && parts[1] === 'nouveau') page = <NewPlan />;
  else if (parts[0] === 'lecture' && parts[1] === 'carnet') page = <Journal />;
  else if (parts[0] === 'lecture') page = <Bible />;
  else if (parts[0] === 'progres' && parts[1]) page = <SkillDetail id={parts[1]} />;
  else if (parts[0] === 'progres') page = <Progress />;
  else if (parts[0] === 'rappels') page = <Reminders />;
  else if (parts[0] === 'reglages') page = <Settings />;
  else if (parts[0] === 'revue') page = <Review />;
  else page = <Home />;

  return (
    <div class="app">
      {page}
      {parts[1] !== 'nouveau' && <TabBar route={route} />}
      <ConflictSheet />
      <Toaster />
    </div>
  );
};

startCloud();
// Rappels serveur : la file d'envoi suit chaque modification.
subscribe((_s, source) => { if (source !== 'silent' && pushActive()) scheduleQueueSync(); });
if (pushActive()) scheduleQueueSync();
render(<App />, document.getElementById('app'));

// Application installable : le service worker n'existe que sur la version déployée.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
