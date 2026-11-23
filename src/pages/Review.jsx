// Revue de la semaine : bilan des modules et trois intentions pour la semaine suivante.
import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { EVENT_CATS } from '../data/catalog.js';
import { timedOn } from '../lib/events.js';
import { addDays, eur, fmtDay, fmtHours, fmtMin, today, toH, weekStart } from '../lib/util.js';
import { catColor, useDark } from '../ui/Dial.jsx';
import { Icon } from '../ui/icons.jsx';
import { Header, toast } from '../ui/kit.jsx';

/** Chiffres d'une semaine (du lundi `mon` au dimanche). */
export const weekStats = (s, mon) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const end = days[6];
  const inWeek = (d) => d >= mon && d <= end;
  const evs = days.flatMap((d) => timedOn(s.events, d));
  const hoursByCat = {};
  evs.forEach((e) => { hoursByCat[e.cat] = (hoursByCat[e.cat] || 0) + Math.max(0, toH(e.end) - toH(e.start)); });
  const spent = s.budget.expenses.filter((e) => inWeek(e.date)).reduce((t, e) => t + e.amount, 0);
  const readings = s.plans.reduce((t, p) => t + Object.values(p.done).filter(inWeek).length, 0);
  const bookDays = new Set(s.books.flatMap((b) => (b.log || []).filter(inWeek))).size;
  const practice = s.skills.reduce((t, k) => t + k.sessions.filter((x) => inWeek(x.date)).reduce((a, x) => a + x.min, 0), 0);
  const steps = s.skills.reduce((t, k) => t + k.steps.filter((x) => x.doneAt && inWeek(x.doneAt)).length, 0);
  const finished = s.books.filter((b) => b.status === 'done' && b.finishedAt && inWeek(b.finishedAt)).length;
  return { days, evs, hoursByCat, hours: evs.reduce((t, e) => t + Math.max(0, toH(e.end) - toH(e.start)), 0), spent, readings, bookDays, practice, steps, finished };
};

/** Liste d'intentions cochables (utilisée aussi sur l'accueil). */
export const Intentions = ({ s, week, compact }) => {
  const r = (s.reviews || {})[week];
  if (!r || !(r.intentions || []).some(Boolean)) return null;
  const toggle = (i) => update((d) => { const x = d.reviews[week]; x.done = [...(x.done || [false, false, false])]; x.done[i] = !x.done[i]; });
  return (
    <div class="col" style={{ gap: compact ? '6px' : '10px' }}>
      {r.intentions.map((txt, i) => txt && (
        <button onClick={() => toggle(i)} aria-pressed={!!(r.done || [])[i]} class="row" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: 'var(--ink)' }}>
          <span class="check" style={{ background: (r.done || [])[i] ? 'var(--accent)' : 'transparent', borderColor: (r.done || [])[i] ? 'var(--accent)' : 'var(--line)' }}>{(r.done || [])[i] && <Icon name="check" size={15} />}</span>
          <span class="sm b grow" style={{ textDecoration: (r.done || [])[i] ? 'line-through' : 'none', opacity: (r.done || [])[i] ? 0.6 : 1 }}>{txt}</span>
        </button>
      ))}
    </div>
  );
};

export const Review = () => {
  const s = useStore();
  const dark = useDark();
  const t = today();
  const [offset, setOffset] = useState(0);
  const mon = addDays(weekStart(t), -7 * offset);
  const next = addDays(mon, 7);
  const st = weekStats(s, mon);
  const prev = weekStats(s, addDays(mon, -7));
  const cur = (s.reviews || {})[mon] || {};
  const nxt = (s.reviews || {})[next] || {};
  const [intent, setIntent] = useState(nxt.intentions || ['', '', '']);
  const [grat, setGrat] = useState(cur.gratitude || '');
  const save = () => {
    update((d) => {
      d.reviews = d.reviews || {};
      d.reviews[next] = { ...(d.reviews[next] || {}), intentions: intent.map((x) => x.trim()), done: (d.reviews[next] || {}).done || [false, false, false] };
      d.reviews[mon] = { ...(d.reviews[mon] || {}), gratitude: grat.trim(), reviewedAt: t };
    });
    toast('Revue enregistrée. Belle semaine à venir !');
  };
  const delta = (a, b, unit = '') => {
    if (!b) return null;
    const diff = a - b;
    if (Math.abs(diff) < 0.05 * Math.max(a, b)) return 'stable';
    return `${diff > 0 ? '+' : '−'}${unit === '€' ? eur(Math.abs(diff)) : unit === 'min' ? fmtMin(Math.abs(diff)) : Math.round(Math.abs(diff))} vs sem. préc.`;
  };
  const curDone = (cur.done || []).filter(Boolean).length;
  const curCount = (cur.intentions || []).filter(Boolean).length;
  const tiles = [
    { icon: 'calendar', color: '#2F6BDB', v: `${fmtHours(st.hours)} h`, l: `planifiées · ${st.evs.length} événements`, d: delta(st.hours, prev.hours) },
    { icon: 'wallet', color: '#0F7A68', v: eur(st.spent), l: 'dépensés', d: delta(st.spent, prev.spent, '€') },
    { icon: 'book', color: '#B8441F', v: `${st.readings}`, l: `lectures bibliques · ${st.bookDays} j de livres`, d: delta(st.readings, prev.readings) },
    { icon: 'grow', color: '#4B3FD1', v: fmtMin(st.practice), l: `de pratique${st.steps ? ` · ${st.steps} étape${st.steps > 1 ? 's' : ''}` : ''}`, d: delta(st.practice, prev.practice, 'min') }
  ];
  return (
    <div class="page">
      <Header back="/" kicker={`Du ${fmtDay(mon)} au ${fmtDay(addDays(mon, 6))}`} title="Revue de la semaine" />
      <div class="seg">
        <button class={offset === 0 ? 'on' : ''} onClick={() => setOffset(0)}>Cette semaine</button>
        <button class={offset === 1 ? 'on' : ''} onClick={() => setOffset(1)}>Semaine dernière</button>
      </div>

      <div class="grid2">
        {tiles.map((x) => (
          <div class="card tight">
            <span class="tile" style={{ background: `${x.color}22`, color: x.color }}><Icon name={x.icon} /></span>
            <span class="big num" style={{ fontSize: '26px' }}>{x.v}</span>
            <span class="small muted">{x.l}</span>
            {x.d && <span class="small b" style={{ color: 'var(--ink-2)' }}>{x.d}</span>}
          </div>
        ))}
      </div>

      {Object.keys(st.hoursByCat).length > 0 && (
        <section class="card">
          <h2 class="h2">Où est passé votre temps</h2>
          {Object.entries(st.hoursByCat).sort((a, b) => b[1] - a[1]).map(([k, h]) => (
            <div class="row">
              <span class="sm b" style={{ width: '90px' }}>{EVENT_CATS[k].name}</span>
              <div class="bar grow" style={{ height: '10px' }}><span style={{ width: `${(h / st.hours) * 100}%`, background: catColor(k, dark) }} /></div>
              <span class="sm b num" style={{ width: '48px', textAlign: 'right' }}>{fmtHours(h)} h</span>
            </div>
          ))}
        </section>
      )}

      {curCount > 0 && (
        <section class="card">
          <div class="row between"><h2 class="h2">Mes intentions de la semaine</h2><span class="sm b" style={{ color: 'var(--accent)' }}>{curDone}/{curCount}</span></div>
          <Intentions s={s} week={mon} />
        </section>
      )}

      <section class="card">
        <h2 class="h2">Merci pour…</h2>
        <textarea class="input" style={{ height: '100px', padding: '12px 14px', lineHeight: 1.5 }} value={grat} onInput={(e) => setGrat(e.target.value)} placeholder="Trois choses pour lesquelles je suis reconnaissant cette semaine" aria-label="Reconnaissance" />
      </section>

      <section class="card dark">
        <h2 class="h2">3 intentions pour la semaine du {fmtDay(next)}</h2>
        {intent.map((x, i) => (
          <input class="input" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--on-dark)', border: '1px solid rgba(255,255,255,.15)' }} value={x}
            onInput={(e) => setIntent(intent.map((y, j) => (j === i ? e.target.value : y)))}
            placeholder={['ex. Appeler grand-mère', 'ex. 3 séances de piano', 'ex. Pas de restaurant cette semaine'][i]} aria-label={`Intention ${i + 1}`} />
        ))}
        <button class="btn block" style={{ background: 'var(--on-dark)', color: 'var(--dark)' }} onClick={save}><Icon name="check" size={18} />Enregistrer ma revue</button>
      </section>
      <label class="row sm" style={{ justifyContent: 'center' }}>
        <input type="checkbox" checked={s.settings.reviewReminder !== false} onChange={() => update((d) => { d.settings.reviewReminder = d.settings.reviewReminder === false; })} style={{ width: '18px', height: '18px' }} />
        Me rappeler de faire ma revue le dimanche à 19 h
      </label>
    </div>
  );
};
