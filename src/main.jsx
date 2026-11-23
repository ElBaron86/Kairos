import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import './styles.css';
import { getState, update, useStore } from './store.js';
import { notify, upcoming } from './lib/reminders.js';
import { TabBar, Toaster, toast, useRoute } from './ui/kit.jsx';
import { Welcome } from './pages/Welcome.jsx';
import { Home } from './pages/Home.jsx';
import { Settings } from './pages/Settings.jsx';
import { Agenda } from './pages/Agenda.jsx';
import { Budget } from './pages/Budget.jsx';
import { Bible, PlanDetail, NewPlan } from './pages/Bible.jsx';
import { Books } from './pages/Books.jsx';
import { Progress, SkillDetail } from './pages/Progress.jsx';
import { Reminders } from './pages/Reminders.jsx';
import { ConflictSheet } from './ui/Account.jsx';
import { startCloud } from './lib/cloud.js';

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
        if (s.settings.notifications) notify(r.title, `${r.time} · ${r.sub}`);
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

const App = () => {
  const s = useStore();
  const route = useRoute();
  useReminderLoop();
  if (!s.onboarded) return <><Welcome /><ConflictSheet /><Toaster /></>;

  const parts = route.split('/').filter(Boolean);
  let page;
  if (parts[0] === 'agenda') page = <Agenda />;
  else if (parts[0] === 'budget') page = <Budget />;
  else if (parts[0] === 'lecture' && parts[1] === 'livres') page = <Books />;
  else if (parts[0] === 'lecture' && parts[1] === 'plan') page = <PlanDetail id={parts[2]} />;
  else if (parts[0] === 'lecture' && parts[1] === 'nouveau') page = <NewPlan />;
  else if (parts[0] === 'lecture') page = <Bible />;
  else if (parts[0] === 'progres' && parts[1]) page = <SkillDetail id={parts[1]} />;
  else if (parts[0] === 'progres') page = <Progress />;
  else if (parts[0] === 'rappels') page = <Reminders />;
  else if (parts[0] === 'reglages') page = <Settings />;
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
render(<App />, document.getElementById('app'));

// Application installable : le service worker n'existe que sur la version déployée.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
