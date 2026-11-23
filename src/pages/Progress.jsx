import { useEffect, useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { LEVEL_MIN, PALETTE, SKILL_TEMPLATES, skillTemplate } from '../data/catalog.js';
import { globalStreak, last7, skillStats } from '../lib/stats.js';
import { addDays, fmtDay, fmtMin, fmtWeekday, num, parseISO, pct, today, uid, weekStart } from '../lib/util.js';
import { Flame, Icon, PATHS } from '../ui/icons.jsx';
import { Bar, DeleteButton, Field, Header, Ring, Sheet, go, toast } from '../ui/kit.jsx';

const CHEERS = ['Belle régularité, continuez !', 'Chaque séance compte.', 'Vous êtes lancé, ne lâchez rien !', 'Encore un pas vers le prochain palier.', 'C’est comme ça qu’on progresse !'];
const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

/** Enregistre une séance et félicite (avec annonce de passage de niveau). */
const logSession = (skill, min, kind = 'pratique', note = '') => {
  const before = Math.floor(skill.sessions.reduce((t, x) => t + x.min, 0) / LEVEL_MIN);
  update((d) => { d.skills.find((k) => k.id === skill.id).sessions.push(note ? { date: today(), min, kind, note } : { date: today(), min, kind }); });
  const after = Math.floor((skill.sessions.reduce((t, x) => t + x.min, 0) + min) / LEVEL_MIN);
  toast(after > before ? `Niveau ${after} atteint en ${skill.name} !` : `+${fmtMin(min)} de ${skill.name} · ${cheer()}`);
};

const SkillSheet = ({ initialTpl = 'instrument', onClose }) => {
  const [tpl, setTpl] = useState(initialTpl);
  const t = skillTemplate(tpl);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('120');
  const [steps, setSteps] = useState(t.steps.join('\n'));
  const pick = (id) => { setTpl(id); setSteps(skillTemplate(id).steps.join('\n')); };
  const create = () => {
    if (!name.trim()) { toast('Donnez un nom à votre apprentissage'); return; }
    const id = uid();
    update((d) => {
      d.skills.push({ id, name: name.trim(), type: tpl, color: t.color, icon: t.icon, weeklyGoal: Math.max(10, Math.round(num(goal)) || 120), metric: 0, unit: t.unit, sessions: [],
        steps: steps.split('\n').map((x) => x.trim()).filter(Boolean).map((title) => ({ id: uid(), title, doneAt: null })) });
    });
    onClose();
    go(`/progres/${id}`);
  };
  return (
    <Sheet title="Nouveau défi" onClose={onClose}>
      <div class="grid3">
        {SKILL_TEMPLATES.map((x) => (
          <button onClick={() => pick(x.id)} aria-pressed={tpl === x.id}
            style={{ border: `2px solid ${tpl === x.id ? x.color : 'transparent'}`, borderRadius: '18px', padding: '12px 4px', background: 'var(--surface)', color: x.color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <Icon name={x.icon} size={26} /><span class="small b" style={{ color: 'var(--ink)' }}>{x.name}</span>
          </button>
        ))}
      </div>
      <Field label="Nom"><input class="input" value={name} onInput={(e) => setName(e.target.value)} placeholder={t.example} /></Field>
      <Field label="Objectif par semaine (minutes)"><input class="input" inputMode="numeric" value={goal} onInput={(e) => setGoal(e.target.value)} /></Field>
      <Field label="Étapes du parcours" hint="Une étape par ligne. Vous pourrez les modifier plus tard.">
        <textarea class="input" style={{ height: '150px', padding: '12px 14px', lineHeight: 1.4 }} value={steps} onInput={(e) => setSteps(e.target.value)} />
      </Field>
      <button class="btn accent block" onClick={create}>Lancer le défi</button>
    </Sheet>
  );
};

export const Progress = () => {
  const s = useStore();
  const [adding, setAdding] = useState(false);
  const days = last7(s);
  const total = days.reduce((t, d) => t + d.min, 0);
  const goal = s.skills.reduce((t, k) => t + (k.weeklyGoal || 0), 0);
  const max = Math.max(60, ...days.map((d) => d.min));
  const streak = globalStreak(s);
  const left = goal - total;
  return (
    <div class="page">
      <Header kicker="Développement" title="Progresser" right={streak > 0 ? <span class="streak"><Flame size={20} /><span class="big" style={{ fontSize: '18px' }}>{streak}</span>jour{streak > 1 ? 's' : ''}</span> : null} />

      <section class="card dark" style={{ gap: '16px' }}>
        <div class="row between" style={{ alignItems: 'flex-end' }}>
          <div class="col" style={{ gap: '4px' }}>
            <span class="small b" style={{ color: 'var(--on-dark-2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>7 derniers jours</span>
            <span class="big" style={{ fontSize: '40px' }}>{fmtMin(total)}</span>
            <span class="sm" style={{ color: 'var(--on-dark-2)' }}>{goal ? `sur un objectif de ${fmtMin(goal)}` : 'Lancez un défi pour commencer'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '84px' }}>
            {days.map((d, i) => (
              <div class="col" style={{ alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '16px', height: `${Math.max(4, Math.round((d.min / max) * 64))}px`, borderRadius: '6px', background: d.min === 0 ? 'var(--dark-2)' : i === 6 ? '#F2A25B' : '#7B70E8', display: 'block' }} title={`${fmtMin(d.min)}`} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: i === 6 ? 'var(--on-dark)' : 'var(--on-dark-2)' }}>{fmtWeekday(d.date).charAt(0).toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
        {goal > 0 && <Bar value={pct(total, goal)} color="#F2A25B" height={10} track="var(--dark-2)" />}
        {goal > 0 && (
          <div class="row" style={{ background: 'rgba(255,255,255,.08)', borderRadius: '14px', padding: '10px 12px', gap: '10px' }}>
            <span style={{ color: '#F2A25B', display: 'flex' }}><Icon name="sparkles" /></span>
            <span class="sm b">{left <= 0 ? 'Objectif de la semaine atteint. Bravo, vous foncez !' : `Plus que ${fmtMin(left)} pour atteindre votre objectif.`}</span>
          </div>
        )}
      </section>

      <section class="col" style={{ gap: '12px' }}>
        <h2 class="h2">Mes apprentissages</h2>
        {s.skills.length === 0 && <div class="empty">Piano, langue, sport… Lancez votre premier défi ci-dessous.</div>}
        {s.skills.map((k) => {
          const st = skillStats(k);
          return (
            <article class="card" style={{ borderRadius: '26px' }}>
              <a href={`#/progres/${k.id}`} class="row" style={{ color: 'var(--ink)', textDecoration: 'none', gap: '14px' }}>
                <span class="tile" style={{ width: '56px', height: '56px', borderRadius: '18px', background: k.color, color: '#FFFFFF' }}><Icon name={k.icon} size={28} /></span>
                <div class="col grow" style={{ gap: '2px' }}><span class="big" style={{ fontSize: '20px', fontWeight: 700 }}>{k.name}</span><span class="sm muted">{st.levelName}</span></div>
                <span class="col" style={{ alignItems: 'center', padding: '6px 10px', borderRadius: '12px', background: `${k.color}22`, color: k.color, gap: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Niv.</span><span class="big" style={{ fontSize: '20px' }}>{st.level}</span>
                </span>
              </a>
              <div class="col" style={{ gap: '6px' }}>
                <div class="row between small b"><span>{st.current ? `Prochaine étape : ${st.current.title}` : 'Parcours terminé !'}</span><span class="muted" style={{ whiteSpace: 'nowrap' }}>{st.levelPct} %</span></div>
                <Bar value={st.levelPct} color={k.color} height={10} />
              </div>
              <div class="grid3">
                {[[`${st.streak} j`, 'd’affilée'], [fmtMin(st.week), 'cette semaine'], [`${st.doneSteps}/${k.steps.length}`, 'étapes']].map(([v, l]) => (
                  <div class="col" style={{ background: 'var(--surface-2)', borderRadius: '14px', padding: '8px 10px', gap: 0 }}><span class="big" style={{ fontSize: '18px' }}>{v}</span><span style={{ fontSize: '11px' }} class="muted">{l}</span></div>
                ))}
              </div>
              <div class="row" style={{ gap: '8px' }}>
                <button class="btn grow" style={{ background: k.color, color: '#FFFFFF' }} onClick={() => logSession(k, 30)}><Icon name="plus" size={16} />Séance de 30 min</button>
                <a class="icon-btn" href={`#/progres/${k.id}`} style={{ background: `${k.color}22`, color: k.color }} aria-label={`Voir ${k.name}`}><Icon name="right" /></a>
              </div>
            </article>
          );
        })}
      </section>

      <section class="card">
        <div class="col" style={{ gap: '2px' }}><h2 class="h2">Lancer un nouveau défi</h2><span class="sm muted">Choisissez un type, Kairos prépare les étapes.</span></div>
        <div class="grid3">
          {SKILL_TEMPLATES.map((x) => (
            <button onClick={() => setAdding(x.id)} style={{ border: 0, borderRadius: '18px', padding: '14px 6px', background: `${x.color}1F`, color: x.color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Icon name={x.icon} size={26} /><span class="small b" style={{ color: 'var(--ink)' }}>{x.name}</span>
            </button>
          ))}
        </div>
      </section>
      {adding && <SkillSheet initialTpl={adding} onClose={() => setAdding(false)} />}
    </div>
  );
};

// Minuteur conservé pendant la navigation dans l'application.
const timers = {};

const Timer = ({ skill }) => {
  const [, tick] = useState(0);
  const [note, setNote] = useState('');
  const tm = timers[skill.id] || { start: null, acc: 0 };
  const running = tm.start != null;
  const secs = Math.floor(tm.acc + (running ? (Date.now() - tm.start) / 1000 : 0));
  useEffect(() => { if (!running) return undefined; const id = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(id); }, [running]);
  const toggle = () => {
    if (running) timers[skill.id] = { start: null, acc: secs };
    else timers[skill.id] = { start: Date.now(), acc: tm.acc };
    tick((x) => x + 1);
  };
  const save = () => {
    if (secs < 30) { toast('Séance trop courte pour être enregistrée'); return; }
    logSession(skill, Math.max(1, Math.round(secs / 60)), 'minuteur', note.trim());
    setNote('');
    timers[skill.id] = { start: null, acc: 0 };
    tick((x) => x + 1);
  };
  const st = skillStats(skill);
  return (
    <section class="card" style={{ alignItems: 'center' }}>
      <span class="h2" style={{ alignSelf: 'flex-start' }}>Séance de pratique</span>
      <span class="big num" style={{ fontSize: '56px', color: running ? skill.color : 'var(--ink)' }}>{String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</span>
      <span class="sm muted">Aujourd'hui : {fmtMin(st.todayMin)}</span>
      <div class="row" style={{ width: '100%', gap: '8px' }}>
        <button class="btn grow" style={{ height: '52px', background: running ? '#B8441F' : skill.color, color: '#FFFFFF' }} onClick={toggle}>
          <Icon name={running ? 'pause' : 'play'} size={18} fill="currentColor" />{running ? 'Pause' : secs > 0 ? 'Reprendre' : 'Démarrer'}
        </button>
        <button class="btn ghost" style={{ height: '52px' }} onClick={save}>Enregistrer</button>
      </div>
      <div class="row" style={{ gap: '6px', width: '100%' }}>
        <span class="small muted" style={{ whiteSpace: 'nowrap' }}>Ajout rapide</span>
        {[15, 30, 45, 60].map((m) => <button class="btn soft small grow" onClick={() => { logSession(skill, m, 'pratique', note.trim()); setNote(''); }}>+{m === 60 ? '1 h' : m}</button>)}
      </div>
      <input class="input" style={{ height: '42px', fontSize: '14px' }} value={note} onInput={(e) => setNote(e.target.value)} placeholder="Note de séance (facultatif) : ex. travaillé la main gauche" aria-label="Note de séance" />
    </section>
  );
};

const W = 314, GAP = 96, XS = [50, 157, 264, 157];
const pathThrough = (pts) => pts.reduce((d, [x, y], i) => (i === 0 ? `M${x} ${y}` : `${d} C${pts[i - 1][0]} ${pts[i - 1][1] + GAP / 2} ${x} ${y - GAP / 2} ${x} ${y}`), '');

const Path = ({ skill }) => {
  const [editing, setEditing] = useState(false);
  const [newStep, setNewStep] = useState('');
  const steps = skill.steps;
  const cur = steps.findIndex((x) => !x.doneAt);
  const pts = steps.map((_, i) => [XS[i % XS.length], 40 + i * GAP]);
  const doneCount = steps.filter((x) => x.doneAt).length;
  const h = steps.length ? 40 + (steps.length - 1) * GAP + 50 : 0;
  const setStep = (id, fn) => update((d) => { fn(d.skills.find((k) => k.id === skill.id).steps.find((x) => x.id === id)); });
  const validate = () => {
    setStep(steps[cur].id, (x) => { x.doneAt = today(); });
    toast(cur === steps.length - 1 ? 'Parcours terminé, félicitations !' : `Étape franchie ! Prochaine : ${steps[cur + 1].title}`);
  };
  return (
    <section class="card">
      <div class="row between"><h2 class="h2">Mon parcours</h2><span class="sm muted">{doneCount}/{steps.length} étapes</span></div>
      {steps.length > 0 && (
        <div style={{ position: 'relative', width: `${W}px`, height: `${h}px`, alignSelf: 'center' }}>
          <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            <path d={pathThrough(pts)} style={{ fill: 'none', stroke: 'var(--line)', strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: '2 12' }} />
            <path d={pathThrough(pts.slice(0, cur === -1 ? pts.length : cur + 1))} style={{ fill: 'none', stroke: skill.color, strokeWidth: 6, strokeLinecap: 'round' }} />
          </svg>
          {steps.map((m, i) => {
            const [x, y] = pts[i];
            const state = m.doneAt ? 'done' : i === cur ? 'current' : 'locked';
            const size = state === 'current' ? 64 : 52;
            const right = x < 200;
            const last = i === steps.length - 1;
            return (
              <>
                <button aria-label={`${m.title}${m.doneAt ? ' (validée)' : ''}`} class={state === 'current' ? 'pulse' : ''}
                  onClick={() => (m.doneAt ? setStep(m.id, (z) => { z.doneAt = null; }) : i === cur ? validate() : null)}
                  style={{ position: 'absolute', left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', border: `4px solid ${state === 'locked' ? 'var(--line)' : skill.color}`, background: state === 'done' ? skill.color : state === 'current' ? 'var(--surface)' : 'var(--surface-2)', color: state === 'done' ? '#FFFFFF' : state === 'current' ? skill.color : 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <Icon name={state === 'done' ? 'check' : last ? 'trophy' : state === 'current' ? 'star' : 'lock'} size={22} />
                </button>
                <span style={{ position: 'absolute', left: `${right ? x + size / 2 + 10 : x - size / 2 - 128}px`, top: `${y - 18}px`, width: '118px', textAlign: right ? 'left' : 'right', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, color: state === 'locked' ? 'var(--muted)' : 'var(--ink)' }}>{m.title}</span>
                  <span class="small muted" style={{ fontSize: '11px' }}>{m.doneAt ? `Validée le ${fmtDay(m.doneAt)}` : state === 'current' ? 'En cours' : last ? 'Objectif final' : 'À venir'}</span>
                </span>
              </>
            );
          })}
        </div>
      )}
      {cur !== -1 && steps.length > 0 && <button class="btn block" onClick={validate}><Icon name="check" size={18} />J'ai réussi : {steps[cur].title}</button>}
      {cur === -1 && steps.length > 0 && <div class="pop" style={{ background: '#F2A25B', color: '#1B1A2E', borderRadius: '14px', padding: '12px', fontWeight: 800, textAlign: 'center' }}>Parcours terminé ! Ajoutez une nouvelle étape pour continuer.</div>}
      <button class="btn soft small" onClick={() => setEditing(!editing)}><Icon name="edit" size={16} />{editing ? 'Terminer' : 'Modifier les étapes'}</button>
      {editing && (
        <div class="col" style={{ gap: '8px' }}>
          {steps.map((m) => (
            <div class="row" style={{ gap: '8px' }}>
              <input class="input" style={{ height: '42px', fontSize: '14px' }} value={m.title} onChange={(e) => setStep(m.id, (z) => { z.title = e.target.value || z.title; })} />
              <button class="icon-btn" style={{ width: '42px', height: '42px', background: 'var(--surface-2)' }} aria-label={`Supprimer ${m.title}`} onClick={() => update((d) => { const k = d.skills.find((z) => z.id === skill.id); k.steps = k.steps.filter((z) => z.id !== m.id); })}><Icon name="trash" size={16} /></button>
            </div>
          ))}
          <div class="row" style={{ gap: '8px' }}>
            <input class="input" style={{ height: '42px', fontSize: '14px' }} value={newStep} onInput={(e) => setNewStep(e.target.value)} placeholder="Nouvelle étape" />
            <button class="icon-btn accent" style={{ width: '42px', height: '42px' }} aria-label="Ajouter l'étape" onClick={() => { if (!newStep.trim()) return; update((d) => { d.skills.find((z) => z.id === skill.id).steps.push({ id: uid(), title: newStep.trim(), doneAt: null }); }); setNewStep(''); }}><Icon name="plus" size={18} /></button>
          </div>
        </div>
      )}
    </section>
  );
};

const Heatmap = ({ skill }) => {
  const t = today();
  const start = addDays(weekStart(t), -77);
  const byDay = {};
  skill.sessions.forEach((x) => { byDay[x.date] = (byDay[x.date] || 0) + x.min; });
  const level = (m) => (!m ? 0 : m < 20 ? 1 : m < 45 ? 2 : 3);
  const shades = ['var(--line-soft)', `${skill.color}55`, `${skill.color}AA`, skill.color];
  const cols = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => { const date = addDays(start, w * 7 + d); return date > t ? null : level(byDay[date]); }));
  const active = Object.keys(byDay).filter((d) => d >= start).length;
  return (
    <section class="card">
      <div class="row between"><h2 class="h2">12 dernières semaines</h2><span class="sm muted">{active} jours de pratique</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '4px' }}>
        {cols.map((c) => <div class="col" style={{ gap: '4px' }}>{c.map((v) => <span style={{ aspectRatio: '1', borderRadius: '5px', background: v == null ? 'transparent' : shades[v], display: 'block' }} />)}</div>)}
      </div>
      <div class="row small muted" style={{ justifyContent: 'flex-end', gap: '4px' }}>Moins{shades.map((c) => <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: c }} />)}Plus</div>
    </section>
  );
};

const Monthly = ({ skill }) => {
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const vals = months.map((m) => skill.sessions.filter((x) => x.date.startsWith(m)).reduce((t, x) => t + x.min, 0));
  const max = Math.max(60, ...vals);
  return (
    <section class="card">
      <div class="row between"><h2 class="h2">Temps par mois</h2><span class="sm muted">{fmtMin(vals[5])} ce mois-ci</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', alignItems: 'end', height: '130px' }}>
        {months.map((m, i) => (
          <div class="col" style={{ alignItems: 'center', gap: '6px', justifyContent: 'flex-end', height: '130px' }}>
            <span class="small b num" style={{ fontSize: '11px' }}>{vals[i] ? fmtMin(vals[i]).replace(' ', '') : ''}</span>
            <span style={{ width: '100%', maxWidth: '34px', height: `${Math.max(3, (vals[i] / max) * 90)}px`, borderRadius: '8px', background: i === 5 ? skill.color : `${skill.color}66` }} />
            <span class="small muted" style={{ textTransform: 'capitalize' }}>{new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const DAYS = [['L', 1], ['M', 2], ['M', 3], ['J', 4], ['V', 5], ['S', 6], ['D', 0]];

export const SkillDetail = ({ id }) => {
  const s = useStore();
  const k = s.skills.find((x) => x.id === id);
  const [settings, setSettings] = useState(false);
  if (!k) return <div class="page"><Header back="/progres" title="Introuvable" /></div>;
  const st = skillStats(k);
  const sessionsDates = new Set(k.sessions.map((x) => x.date));
  let best = 0; let run = 0;
  [...sessionsDates].sort().forEach((d, i, arr) => { run = i && addDays(arr[i - 1], 1) === d ? run + 1 : 1; best = Math.max(best, run); });
  const badges = [
    { name: 'Première séance', icon: 'play', got: k.sessions.length > 0 },
    { name: '7 jours d’affilée', icon: 'flame', got: best >= 7 },
    { name: 'Première étape', icon: 'star', got: st.doneSteps > 0 },
    { name: '10 h de pratique', icon: 'clock', got: st.total >= 600 },
    { name: '30 jours d’affilée', icon: 'flame', got: best >= 30 },
    { name: '50 h de pratique', icon: 'clock', got: st.total >= 3000 },
    { name: 'Parcours terminé', icon: 'trophy', got: k.steps.length > 0 && !st.current }
  ];
  const recent = [...k.sessions].map((x, i) => ({ ...x, i })).reverse().slice(0, 6);
  return (
    <div class="page">
      <header class="row">
        <a class="icon-btn" href="#/progres" aria-label="Retour"><Icon name="left" /></a>
        <h1 class="h1 grow" style={{ fontSize: '30px' }}>{k.name}</h1>
        {st.streak > 0 && <span class="streak"><Flame />{st.streak} j</span>}
        <button class="icon-btn" aria-label="Réglages de l'apprentissage" onClick={() => setSettings(true)}><Icon name="gear" /></button>
      </header>

      <section class="card color" style={{ background: k.color, flexDirection: 'row', alignItems: 'center', gap: '18px', borderRadius: '30px' }}>
        <svg width="190" height="190" viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', right: '-40px', bottom: '-50px', opacity: 0.1 }}><path class="ic" d={PATHS[k.icon]} style={{ strokeWidth: 1.2 }} /></svg>
        <Ring value={st.into} max={LEVEL_MIN} size={104} stroke={10}><span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}>Niveau</span><span class="big" style={{ fontSize: '36px' }}>{st.level}</span></Ring>
        <div class="col" style={{ gap: '4px', position: 'relative' }}>
          <span class="big" style={{ fontSize: '24px' }}>{st.levelName}</span>
          <span class="sm" style={{ opacity: 0.88 }}>{fmtMin(st.toNext)} avant le niveau {st.level + 1}</span>
          <span class="sm" style={{ opacity: 0.88 }}>{fmtMin(st.total)} de pratique au total</span>
        </div>
      </section>

      <Timer skill={k} />

      <section class="card" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <div class="col grow" style={{ gap: '2px' }}><span class="big" style={{ fontSize: '28px' }}>{k.metric || 0}</span><span class="sm muted">{k.unit || 'réussites'}</span></div>
        <button class="icon-btn" style={{ background: 'var(--surface-2)' }} aria-label="Diminuer" onClick={() => update((d) => { const x = d.skills.find((z) => z.id === id); x.metric = Math.max(0, (x.metric || 0) - 1); })}><Icon name="minus" /></button>
        <button class="icon-btn" style={{ background: k.color, color: '#FFFFFF' }} aria-label="Augmenter" onClick={() => update((d) => { const x = d.skills.find((z) => z.id === id); x.metric = (x.metric || 0) + 1; })}><Icon name="plus" /></button>
      </section>

      <Path skill={k} />
      <Heatmap skill={k} />
      <Monthly skill={k} />

      <section class="col" style={{ gap: '10px' }}>
        <h2 class="h2">Badges</h2>
        <div class="hscroll hide-scroll" style={{ gap: '10px' }}>
          {badges.map((b) => (
            <div style={{ flex: '0 0 104px', background: 'var(--surface)', borderRadius: '22px', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center', opacity: b.got ? 1 : 0.5 }}>
              <span class="tile" style={{ width: '54px', height: '54px', borderRadius: '27px', background: b.got ? '#F2A25B' : 'var(--line-soft)', color: b.got ? '#1B1A2E' : 'var(--faint)' }}><Icon name={b.icon} size={26} /></span>
              <span class="small b" style={{ lineHeight: 1.2 }}>{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section class="card">
          <h2 class="h2">Dernières séances</h2>
          {recent.map((x) => (
            <div class="row">
              <span class="col grow" style={{ gap: 0 }}><span class="sm b">{fmtMin(x.min)}</span><span class="small muted">{fmtDay(x.date)} · {x.kind}{x.note ? ` · ${x.note}` : ''}</span></span>
              <button class="icon-btn" style={{ width: '34px', height: '34px', background: 'var(--surface-2)' }} aria-label="Supprimer la séance" onClick={() => update((d) => { d.skills.find((z) => z.id === id).sessions.splice(x.i, 1); })}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </section>
      )}

      {settings && (
        <Sheet title={k.name} onClose={() => setSettings(false)}>
          <Field label="Nom"><input class="input" value={k.name} onChange={(e) => update((d) => { d.skills.find((z) => z.id === id).name = e.target.value || k.name; })} /></Field>
          <Field label="Objectif par semaine (minutes)"><input class="input" inputMode="numeric" value={k.weeklyGoal} onChange={(e) => update((d) => { d.skills.find((z) => z.id === id).weeklyGoal = Math.max(10, Math.round(num(e.target.value)) || 60); })} /></Field>
          <div class="field">Rappel de pratique
            <div class="row">
              <input class="input" type="time" style={{ width: '140px' }} value={k.remindTime || ''} onInput={(e) => update((d) => { const z = d.skills.find((y) => y.id === id); z.remindTime = e.target.value || null; if (!z.remindDays) z.remindDays = [1, 2, 3, 4, 5, 6, 0]; })} aria-label="Heure du rappel" />
              {k.remindTime && <button class="btn soft small" onClick={() => update((d) => { d.skills.find((y) => y.id === id).remindTime = null; })}>Aucun rappel</button>}
            </div>
            {k.remindTime && <div class="grid7">{DAYS.map(([l, v]) => { const on = (k.remindDays || []).includes(v); return <button aria-pressed={on} onClick={() => update((d) => { const z = d.skills.find((y) => y.id === id); z.remindDays = on ? z.remindDays.filter((x) => x !== v) : [...(z.remindDays || []), v]; })} style={{ height: '40px', border: 0, borderRadius: '12px', fontWeight: 700, background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--muted)' }}>{l}</button>; })}</div>}
            <span class="hint">Le rappel ne sonne pas si vous avez déjà pratiqué ce jour-là.</span>
          </div>
          <Field label="Ce que vous comptez" hint="ex. morceaux, mots appris, kilomètres…"><input class="input" value={k.unit} onChange={(e) => update((d) => { d.skills.find((z) => z.id === id).unit = e.target.value; })} /></Field>
          <div class="field">Couleur
            <div class="row" style={{ gap: '10px', flexWrap: 'wrap' }}>{PALETTE.map((hex) => <button aria-label="Couleur" aria-pressed={k.color === hex} onClick={() => update((d) => { d.skills.find((z) => z.id === id).color = hex; })} style={{ width: '40px', height: '40px', borderRadius: '20px', border: `3px solid ${k.color === hex ? 'var(--ink)' : 'transparent'}`, background: hex, padding: 0 }} />)}</div>
          </div>
          <DeleteButton label="Supprimer cet apprentissage" onConfirm={() => { update((d) => { d.skills = d.skills.filter((z) => z.id !== id); }); go('/progres'); }} />
        </Sheet>
      )}
    </div>
  );
};
