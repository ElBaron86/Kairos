import { update, useStore } from '../store.js';
import { EVENT_CATS } from '../data/catalog.js';
import { eventsOn } from '../lib/events.js';
import { nextIndex, upcoming } from '../lib/reminders.js';
import { globalStreak, monthBudget, skillStats } from '../lib/stats.js';
import { cap, eur, fmtLong, fmtMin, pct, today, toH } from '../lib/util.js';
import { Dial, catColor, useDark, useNow } from '../ui/Dial.jsx';
import { Flame, Icon } from '../ui/icons.jsx';
import { Bar, toast } from '../ui/kit.jsx';
import { Intentions } from './Review.jsx';
import { parseISO, weekStart } from '../lib/util.js';

const greeting = (h) => (h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');

export const Home = () => {
  const s = useStore();
  const now = useNow();
  const dark = useDark();
  const t = today();
  const todayAll = eventsOn(s.events, t);
  const events = todayAll.filter((e) => !e.allDay);
  const allDay = todayAll.filter((e) => e.allDay);
  const next = events.find((e) => toH(e.end) > now);
  const mins = next ? Math.round((toH(next.start) - now) * 60) : 0;
  const b = monthBudget(s);
  const plan = s.plans.find((p) => nextIndex(p) !== -1);
  const pIdx = plan ? nextIndex(plan) : -1;
  const readToday = plan && Object.values(plan.done).includes(t);
  const rem = upcoming(s, 1).filter((r) => !s.muted[r.source]);
  const streak = globalStreak(s);
  const name = s.settings.name;

  const validate = () => {
    update((d) => { const p = d.plans.find((x) => x.id === plan.id); p.done[pIdx] = t; if (nextIndex(p) === -1) p.completedAt = t; });
    toast('Lecture validée, bravo !');
  };

  return (
    <div class="page">
      <header class="row between">
        <div class="col" style={{ gap: '2px' }}>
          <span class="kicker">{cap(fmtLong(t))}</span>
          <h1 class="h1" style={{ fontSize: '34px' }}>{greeting(now)}{name ? `, ${name}` : ''}</h1>
        </div>
        <a class="icon-btn" href="#/reglages" aria-label="Réglages"><Icon name="gear" /></a>
      </header>

      <section class="card dark" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
        <Dial events={events} size={120} now={now} width={26} track="var(--dark-2)" ticks={false}>
          <span class="big num" style={{ fontSize: '22px' }}>{events.length}</span>
          <span class="small" style={{ color: 'var(--on-dark-2)', fontSize: '10px' }}>événement{events.length > 1 ? 's' : ''}</span>
        </Dial>
        <div class="col grow" style={{ gap: '6px' }}>
          <span class="kicker" style={{ color: 'var(--on-dark-2)', fontSize: '12px' }}>{next ? (mins > 0 ? 'À suivre' : 'En ce moment') : 'Journée'}</span>
          <span class="big" style={{ fontSize: '22px', lineHeight: 1.15, fontWeight: 700 }}>{next ? next.title : events.length ? 'Plus rien aujourd’hui' : 'Agenda libre'}</span>
          <span class="sm" style={{ color: 'var(--on-dark-2)' }}>{next ? `${next.start} – ${next.end}${mins > 0 ? ` · dans ${fmtMin(mins)}` : ''}` : 'Profitez-en pour souffler'}</span>
          <a href="#/agenda" class="btn small" style={{ alignSelf: 'flex-start', background: 'var(--on-dark)', color: 'var(--dark)', marginTop: '4px' }}>Ouvrir l'agenda</a>
        </div>
      </section>

      <div class="grid2">
        <a href="#/budget" class="card tight" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span class="tile" style={{ background: 'rgba(20,145,124,.14)', color: '#14917C' }}><Icon name="wallet" /></span>
          <span class="sm b muted">Épargne potentielle</span>
          <span class="big num" style={{ fontSize: '26px', color: b.savings < 0 ? '#C2412B' : undefined }}>{eur(b.savings)}</span>
          <Bar value={pct(Math.max(0, b.savings), b.income)} color="#14917C" height={6} />
          <span class="small muted">{b.income ? `${pct(Math.max(0, b.savings), b.income)} % des revenus` : 'Indiquez vos revenus'}</span>
        </a>
        {plan ? (
          <div class="card tight" style={{ background: plan.color, color: '#FFFFFF', boxShadow: 'none' }}>
            <a href={`#/lecture/plan/${plan.id}`} class="col" style={{ color: '#FFFFFF', textDecoration: 'none', gap: '6px' }}>
              <span class="sm b" style={{ opacity: 0.85 }}>Lecture du jour</span>
              <span class="serif" style={{ fontSize: '26px', lineHeight: 1.05 }}>{plan.days[pIdx].ref}</span>
              <span class="small" style={{ opacity: 0.85 }}>{plan.name} · jour {pIdx + 1} sur {plan.days.length}</span>
            </a>
            {readToday
              ? <span class="pill" style={{ background: 'rgba(255,255,255,.18)', alignSelf: 'flex-start' }}><Icon name="check" size={14} />Déjà lu aujourd'hui</span>
              : <button class="btn small" style={{ background: '#FFFFFF', color: plan.color }} onClick={validate}><Icon name="check" size={16} />Valider</button>}
          </div>
        ) : (
          <a href="#/lecture" class="card tight" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
            <span class="tile" style={{ background: 'rgba(184,68,31,.14)', color: '#B8441F' }}><Icon name="book" /></span>
            <span class="sm b muted">Lecture</span>
            <span class="serif" style={{ fontSize: '24px', lineHeight: 1.05 }}>Choisir un plan</span>
            <span class="small muted">Foi, courage, paix…</span>
          </a>
        )}
      </div>

      <section class="card">
        <div class="row between">
          <h2 class="h2">Aujourd'hui</h2>
          <a href="#/agenda" class="sm b">Voir l'agenda</a>
        </div>
        {allDay.map((e) => <span class="pill" style={{ background: (EVENT_CATS[e.cat] || EVENT_CATS.perso).tint, alignSelf: 'flex-start', fontSize: '13px' }}><span style={{ width: '8px', height: '8px', borderRadius: '4px', background: catColor(e.cat, dark) }} />{e.title} · toute la journée</span>)}
        {events.length === 0 && allDay.length === 0 && <p class="sm muted" style={{ margin: 0 }}>Aucun événement. Ajoutez-en depuis l'agenda.</p>}
        {events.map((e) => (
          <div class="row" style={{ opacity: toH(e.end) < now ? 0.45 : 1 }}>
            <span class="sm b num" style={{ width: '46px' }}>{e.start}</span>
            <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: catColor(e.cat, dark), flexShrink: 0 }} />
            <div class="col grow" style={{ gap: 0 }}>
              <span class="b" style={{ fontSize: '15px' }}>{e.title}</span>
              <span class="small muted">{(EVENT_CATS[e.cat] || EVENT_CATS.perso).name} · jusqu'à {e.end}</span>
            </div>
          </div>
        ))}
      </section>

      {s.skills.length > 0 && (
        <section class="card">
          <div class="row between">
            <h2 class="h2">Progrès</h2>
            {streak > 0 && <span class="streak" style={{ fontSize: '13px', padding: '5px 10px' }}><Flame size={16} />{streak} jour{streak > 1 ? 's' : ''}</span>}
          </div>
          {s.skills.slice(0, 3).map((k) => {
            const st = skillStats(k);
            return (
              <a href={`#/progres/${k.id}`} class="row" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                <span class="tile" style={{ background: k.color, color: '#FFFFFF' }}><Icon name={k.icon} /></span>
                <div class="col grow" style={{ gap: '5px' }}>
                  <div class="row between"><span class="b">{k.name}</span><span class="small muted">Niv. {st.level} · {st.levelPct} %</span></div>
                  <Bar value={st.levelPct} color={k.color} height={6} />
                  <span class="small muted">{st.current ? `Prochaine étape : ${st.current.title}` : 'Parcours terminé !'}</span>
                </div>
              </a>
            );
          })}
        </section>
      )}

      {(() => {
        const wk = weekStart(t);
        const r = (s.reviews || {})[wk];
        const hasIntent = r && (r.intentions || []).some(Boolean);
        const sunday = parseISO(t).getDay() === 0;
        const reviewed = ((s.reviews || {})[wk] || {}).reviewedAt;
        if (!hasIntent && !(sunday && !reviewed)) {
          return <a href="#/revue" class="btn ghost block" style={{ minHeight: '54px' }}><Icon name="sparkles" size={18} />Ma revue de la semaine</a>;
        }
        return (
          <section class="card">
            <div class="section-head"><h2 class="h2">{hasIntent ? 'Mes intentions' : 'C\u2019est dimanche'}</h2><a href="#/revue" class="sm b">{sunday && !reviewed ? 'Faire ma revue' : 'Ma revue'}</a></div>
            {hasIntent ? <Intentions s={s} week={wk} compact /> : <span class="sm muted">Prenez 5 minutes pour faire le bilan de la semaine et choisir 3 intentions.</span>}
          </section>
        );
      })()}

      <a href="#/rappels" class="card tight" style={{ flexDirection: 'row', alignItems: 'center', background: 'var(--accent-soft)', color: 'var(--ink)', textDecoration: 'none', boxShadow: 'none' }}>
        <span class="tile" style={{ width: '42px', height: '42px', background: 'var(--accent)', color: 'var(--accent-ink)' }}><Icon name="bell" /></span>
        <div class="col grow" style={{ gap: '2px' }}>
          <span class="b">{rem.length ? `${rem.length} rappel${rem.length > 1 ? 's' : ''} d'ici demain` : 'Aucun rappel prévu'}</span>
          <span class="sm" style={{ color: 'var(--ink-2)' }}>{rem.slice(0, 2).map((r) => `${r.title} · ${r.time}`).join(' — ') || 'Ajoutez-en depuis l’onglet Rappels'}</span>
        </div>
        <Icon name="right" />
      </a>
    </div>
  );
};
