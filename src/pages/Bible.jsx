import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { ALL_BOOKS, NT, OT, THEMES, buildDays, buildYearDays, passageUrl } from '../data/bible.js';
import { PALETTE } from '../data/catalog.js';
import { nextIndex } from '../lib/reminders.js';
import { addDays, fmtDay, parseISO, streakOf, today, uid } from '../lib/util.js';
import { Icon, PATHS } from '../ui/icons.jsx';
import { DeleteButton, Field, Header, Ring, Sheet, go, toast } from '../ui/kit.jsx';

const WEEK = [['L', 'Lundi', 1], ['M', 'Mardi', 2], ['M', 'Mercredi', 3], ['J', 'Jeudi', 4], ['V', 'Vendredi', 5], ['S', 'Samedi', 6], ['D', 'Dimanche', 0]];

export const ReadingTabs = ({ on }) => (
  <div class="seg">
    <a href="#/lecture" class={on === 'bible' ? 'on' : ''}>Bible</a>
    <a href="#/lecture/livres" class={on === 'livres' ? 'on' : ''}>Livres</a>
  </div>
);

const validateNext = (plan) => {
  const t = today();
  const i = nextIndex(plan);
  if (i === -1) return;
  update((d) => {
    const p = d.plans.find((x) => x.id === plan.id);
    p.done[i] = t;
    if (nextIndex(p) === -1) p.completedAt = t;
  });
  toast(i === plan.days.length - 1 ? 'Plan accompli, bravo !' : `Jour ${i + 1} validé`);
};

const startTheme = (th) => {
  const id = uid();
  update((d) => {
    d.plans.unshift({ id, kind: 'theme', themeId: th.id, name: th.name, color: th.color, icon: th.icon, key: th.key, desc: th.desc, days: th.days, done: {}, start: today(), time: '07:00', remind: true, weekdays: [0, 1, 2, 3, 4, 5, 6] });
  });
  go(`/lecture/plan/${id}`);
};

const startYear = () => {
  const id = uid();
  update((d) => {
    d.plans.unshift({ id, kind: 'year', name: 'Bible en un an', color: '#0F6E86', icon: 'book', key: '', desc: 'Toute la Bible en 365 lectures de 3 à 4 chapitres.', days: buildYearDays(), done: {}, start: today(), time: '07:00', remind: true, weekdays: [0, 1, 2, 3, 4, 5, 6] });
  });
  go(`/lecture/plan/${id}`);
};

const KIND_LABEL = { theme: 'Plan thématique', custom: 'Plan personnalisé', year: 'Plan annuel' };

/** Feuille de méditation : notes personnelles sur une lecture. */
const NoteSheet = ({ plan, idx, onClose }) => {
  const [txt, setTxt] = useState((plan.notes || {})[idx] || '');
  const save = () => {
    update((d) => { const p = d.plans.find((x) => x.id === plan.id); p.notes = { ...(p.notes || {}) }; if (txt.trim()) p.notes[idx] = txt.trim(); else delete p.notes[idx]; });
    toast(txt.trim() ? 'Méditation enregistrée' : 'Note effacée');
    onClose();
  };
  const url = passageUrl(plan.days[idx].ref);
  return (
    <Sheet title={plan.days[idx].ref} onClose={onClose}>
      {url && <a class="btn soft block" href={url} target="_blank" rel="noopener"><Icon name="book" size={18} />Lire le passage (Louis Segond)</a>}
      <Field label="Ma méditation" hint="Ce qui m'a touché, une prière, une résolution…">
        <textarea class="input" style={{ height: '180px', padding: '12px 14px', lineHeight: 1.5 }} value={txt} onInput={(e) => setTxt(e.target.value)} />
      </Field>
      <button class="btn accent block" onClick={save}>Enregistrer</button>
    </Sheet>
  );
};

const PlanCard = ({ p }) => {
  const n = nextIndex(p);
  const count = Object.keys(p.done).length;
  const readToday = Object.values(p.done).includes(today());
  return (
    <div class="card color" style={{ background: p.color, gap: '12px' }}>
      <svg width="200" height="200" viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', right: '-46px', top: '-40px', opacity: 0.12 }}><path class="ic" d={PATHS[p.icon] || PATHS.book} style={{ strokeWidth: 1.2 }} /></svg>
      <a href={`#/lecture/plan/${p.id}`} class="row" style={{ color: '#FFFFFF', textDecoration: 'none', alignItems: 'flex-start' }}>
        <div class="col grow" style={{ gap: '4px' }}>
          <span class="small b" style={{ textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.85 }}>{KIND_LABEL[p.kind] || 'Plan'}</span>
          <span class="serif" style={{ fontSize: '38px', lineHeight: 0.95 }}>{p.name}</span>
          <span class="sm" style={{ opacity: 0.9 }}>{n === -1 ? 'Accompli' : `Jour ${n + 1} · ${p.days[n].ref}`}</span>
        </div>
        <Ring value={count} max={p.days.length} size={68}><span class="big" style={{ fontSize: '15px' }}>{count}/{p.days.length}</span></Ring>
      </a>
      {n !== -1 && (readToday
        ? <span class="pill" style={{ background: 'rgba(255,255,255,.18)', alignSelf: 'flex-start' }}><Icon name="check" size={14} />Lecture du jour faite</span>
        : <button class="btn" style={{ background: '#FFFFFF', color: p.color }} onClick={() => validateNext(p)}><Icon name="check" size={18} />Valider : {p.days[n].ref}</button>)}
    </div>
  );
};

export const Bible = () => {
  const s = useStore();
  const active = s.plans.filter((p) => nextIndex(p) !== -1);
  const done = s.plans.filter((p) => nextIndex(p) === -1);
  return (
    <div class="page warm">
      <Header kicker="Lecture de la Bible" title={<>Plans <span style={{ fontStyle: 'italic' }}>par thème</span></>} serif />
      <ReadingTabs on="bible" />

      {active.length === 0 && <div class="empty">Aucun plan en cours. Choisissez un thème ci-dessous ou créez votre propre plan.</div>}
      {active.map((p) => <PlanCard p={p} />)}

      <section class="col" style={{ gap: '10px' }}>
        <h2 class="h2">Commencer un thème</h2>
        <div class="grid2">
          {THEMES.map((th) => {
            const existing = active.find((p) => p.themeId === th.id);
            return (
              <button onClick={() => (existing ? go(`/lecture/plan/${existing.id}`) : startTheme(th))}
                style={{ border: 0, borderRadius: '22px', padding: '14px', textAlign: 'left', background: 'var(--surface)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span class="tile" style={{ background: th.color, color: '#FFFFFF' }}><Icon name={th.icon} /></span>
                <span class="serif" style={{ fontSize: '26px', lineHeight: 1 }}>{th.name}</span>
                <span class="small muted">{existing ? 'En cours' : `7 jours · ${th.key}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      {!active.some((p) => p.kind === 'year') && (
        <button onClick={startYear} class="card" style={{ flexDirection: 'row', alignItems: 'center', border: 0, textAlign: 'left', color: 'var(--ink)' }}>
          <span class="tile" style={{ width: '52px', height: '52px', borderRadius: '18px', background: '#0F6E86', color: '#FFFFFF' }}><Icon name="calendar" size={24} /></span>
          <span class="col grow" style={{ gap: '2px' }}><span class="serif" style={{ fontSize: '26px', lineHeight: 1.05 }}>La Bible en un an</span><span class="sm muted">365 lectures, de la Genèse à l'Apocalypse</span></span>
        </button>
      )}
      <a href="#/lecture/carnet" class="card" style={{ flexDirection: 'row', alignItems: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
        <span class="tile" style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'var(--warm-soft)', color: 'var(--warm-ink)' }}><Icon name="edit" size={24} /></span>
        <span class="col grow" style={{ gap: '2px' }}><span class="serif" style={{ fontSize: '26px', lineHeight: 1.05 }}>Mon carnet</span><span class="sm muted">{s.plans.reduce((t, p) => t + Object.keys(p.notes || {}).length, 0)} méditations</span></span>
        <Icon name="right" />
      </a>
      <a href="#/lecture/nouveau" class="card dark" style={{ flexDirection: 'row', alignItems: 'center', textDecoration: 'none' }}>
        <span class="tile" style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'var(--on-dark)', color: 'var(--dark)' }}><Icon name="plus" size={24} /></span>
        <span class="col grow" style={{ gap: '2px' }}>
          <span class="serif" style={{ fontSize: '26px', lineHeight: 1.05 }}>Créer mon plan</span>
          <span class="sm" style={{ color: 'var(--on-dark-2)' }}>Vos livres, votre rythme, vos rappels</span>
        </span>
      </a>

      {done.length > 0 && (
        <section class="col" style={{ gap: '8px' }}>
          <h2 class="h2">Plans accomplis</h2>
          {done.map((p) => (
            <a href={`#/lecture/plan/${p.id}`} class="row" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
              <span class="check" style={{ background: p.color, borderColor: p.color }}><Icon name="check" size={15} /></span>
              <span class="col grow" style={{ gap: 0 }}><span class="b">{p.name}</span><span class="small muted">{p.days.length} lectures · terminé le {fmtDay(p.completedAt || today())}</span></span>
            </a>
          ))}
        </section>
      )}
      <p class="small muted center" style={{ margin: 0 }}>Le texte biblique n'est pas dans l'application : ouvrez votre Bible ou votre application habituelle.</p>
    </div>
  );
};

export const PlanDetail = ({ id }) => {
  const s = useStore();
  const p = s.plans.find((x) => x.id === id);
  const [note, setNote] = useState(null);
  const [showAll, setShowAll] = useState(false);
  if (!p) return <div class="page"><Header back="/lecture" title="Plan introuvable" /></div>;
  const n = nextIndex(p);
  const count = Object.keys(p.done).length;
  const t = today();
  const readToday = Object.values(p.done).includes(t);
  const streak = streakOf(Object.values(p.done));
  const toggle = (i) => update((d) => {
    const x = d.plans.find((y) => y.id === id);
    if (x.done[i]) delete x.done[i]; else x.done[i] = t;
    x.completedAt = nextIndex(x) === -1 ? t : null;
  });
  return (
    <div class="page warm">
      <Header back="/lecture" kicker={KIND_LABEL[p.kind] || 'Plan'} title={p.name} serif />
      <section class="card color" style={{ background: p.color, borderRadius: '32px', gap: '16px' }}>
        <div class="row" style={{ alignItems: 'flex-start' }}>
          <div class="col grow" style={{ gap: '6px' }}>
            <span class="small b" style={{ textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.85 }}>{p.days.length} lectures</span>
            {p.desc && <span class="sm" style={{ opacity: 0.92 }}>{p.desc}</span>}
            {streak > 1 && <span class="pill" style={{ background: 'rgba(255,255,255,.18)', alignSelf: 'flex-start' }}><Icon name="flame" size={14} />{streak} jours d'affilée</span>}
          </div>
          <Ring value={count} max={p.days.length}><span class="big" style={{ fontSize: '18px' }}>{count}/{p.days.length}</span></Ring>
        </div>
        <div class="wrap">
          {p.key && <span class="pill" style={{ background: 'rgba(255,255,255,.16)', fontSize: '13px' }}>Verset clé · {p.key}</span>}
          <span class="pill" style={{ background: 'rgba(255,255,255,.16)', fontSize: '13px' }}><Icon name="bell" size={14} />{p.remind ? `Rappel à ${p.time}` : 'Sans rappel'}</span>
        </div>
        {n === -1 ? (
          <div class="pop" style={{ background: '#FFFFFF', color: p.color, borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon name="star" size={28} />
            <span class="col grow" style={{ gap: '2px' }}><span class="b" style={{ fontSize: '15px' }}>Plan accompli !</span><span class="small" style={{ color: '#4A4860' }}>Terminé le {fmtDay(p.completedAt || t)}</span></span>
            <button class="btn small" style={{ background: 'rgba(0,0,0,.06)', color: p.color }} onClick={() => update((d) => { const x = d.plans.find((y) => y.id === id); x.done = {}; x.completedAt = null; x.start = t; })}>Recommencer</button>
          </div>
        ) : readToday ? (
          <span class="pill" style={{ background: 'rgba(255,255,255,.18)', alignSelf: 'flex-start', fontSize: '13px' }}><Icon name="check" size={16} />Lecture du jour faite · prochaine : {p.days[n].ref}</span>
        ) : (
          <div class="col" style={{ gap: '8px' }}>
            <button class="btn" style={{ background: '#FFFFFF', color: p.color, height: '52px' }} onClick={() => { validateNext(p); setNote(n); }}><Icon name="check" size={18} />Valider le jour {n + 1} · {p.days[n].ref}</button>
            {passageUrl(p.days[n].ref) && <a class="btn small" style={{ background: 'rgba(255,255,255,.16)', color: '#FFFFFF' }} href={passageUrl(p.days[n].ref)} target="_blank" rel="noopener"><Icon name="book" size={16} />Lire le passage</a>}
          </div>
        )}
      </section>

      <section class="col" style={{ gap: '8px' }}>
        {(() => {
          // Pour les longs plans, on affiche une fenêtre autour de la lecture en cours.
          const from = showAll || p.days.length <= 14 ? 0 : Math.max(0, (n === -1 ? p.days.length : n) - 3);
          const to = showAll || p.days.length <= 14 ? p.days.length : Math.min(p.days.length, from + 10);
          return (
            <>
              {p.days.slice(from, to).map((d, j) => {
                const i = from + j;
                const isDone = !!p.done[i];
                const hasNote = !!(p.notes || {})[i];
                return (
                  <div style={{ border: `2px solid ${i === n ? p.color : 'transparent'}`, background: 'var(--surface)', borderRadius: '20px', padding: '10px 10px 10px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => toggle(i)} aria-pressed={isDone} aria-label={`${d.ref} : ${isDone ? 'lu' : 'à lire'}`} style={{ border: 0, background: 'transparent', padding: 0, display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left', color: 'var(--ink)' }}>
                      <span class="col" style={{ width: '34px', alignItems: 'center', gap: 0 }}><span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Jour</span><span class="big" style={{ fontSize: '20px' }}>{i + 1}</span></span>
                      <span class="col grow" style={{ gap: '2px' }}>
                        <span class="serif" style={{ fontSize: '21px', lineHeight: 1.1 }}>{d.ref}</span>
                        <span class="small muted">{isDone ? `Lu le ${fmtDay(p.done[i])}` : d.focus}{hasNote ? ' · méditation' : ''}</span>
                      </span>
                      <span class="check" style={{ background: isDone ? p.color : 'transparent', borderColor: isDone ? p.color : 'var(--line)' }}>{isDone && <Icon name="check" size={16} />}</span>
                    </button>
                    <button class="icon-btn" style={{ width: '38px', height: '38px', background: hasNote ? `${p.color}22` : 'var(--surface-2)', color: hasNote ? p.color : 'var(--ink)' }} aria-label={`Méditation et lien pour ${d.ref}`} onClick={() => setNote(i)}><Icon name="edit" size={17} /></button>
                  </div>
                );
              })}
              {p.days.length > 14 && <button class="btn soft small" onClick={() => setShowAll(!showAll)}>{showAll ? 'Réduire' : `Voir les ${p.days.length} lectures`}</button>}
            </>
          );
        })()}
      </section>

      <section class="card">
        <h2 class="h2">Rappel</h2>
        <div class="row">
          <input class="input" type="time" value={p.time} style={{ width: '140px' }} onInput={(e) => update((d) => { d.plans.find((y) => y.id === id).time = e.target.value; })} />
          <button class={'btn small ' + (p.remind ? 'accent' : 'soft')} onClick={() => update((d) => { const x = d.plans.find((y) => y.id === id); x.remind = !x.remind; })}>{p.remind ? 'Rappel activé' : 'Rappel désactivé'}</button>
        </div>
      </section>
      <DeleteButton label="Supprimer ce plan" onConfirm={() => { update((d) => { d.plans = d.plans.filter((y) => y.id !== id); }); go('/lecture'); }} />
      {note != null && <NoteSheet plan={p} idx={note} onClose={() => setNote(null)} />}
    </div>
  );
};

export const NewPlan = () => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(0);
  const [books, setBooks] = useState(['Proverbes', 'Jacques', 'Philippiens']);
  const [pace, setPace] = useState(1);
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6]);
  const [time, setTime] = useState('07:00');
  const [testament, setTestament] = useState('NT');
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const plan = buildDays(books, pace);
  const chapters = ALL_BOOKS.filter(([n]) => books.includes(n)).reduce((t, [, c]) => t + c, 0);
  let end = null;
  if (plan.length && days.length) {
    let d = addDays(today(), 1);
    let c = 0;
    for (;;) { if (days.includes(parseISO(d).getDay())) c += 1; if (c >= plan.length) break; d = addDays(d, 1); }
    end = d;
  }
  const accent = PALETTE[color];
  const create = () => {
    if (!plan.length) { toast('Choisissez au moins un livre'); return; }
    if (!days.length) { toast('Choisissez au moins un jour de lecture'); return; }
    const id = uid();
    update((d) => { d.plans.unshift({ id, kind: 'custom', name: name.trim() || 'Mon plan', color: accent, icon: 'book', key: '', desc: books.join(', '), days: plan, done: {}, start: today(), time, remind: true, weekdays: days }); });
    toast('Plan créé !');
    go(`/lecture/plan/${id}`);
  };
  const list = testament === 'AT' ? OT : NT;
  return (
    <div class="page warm" style={{ paddingBottom: '120px' }}>
      <Header back="/lecture" title={<>Mon plan <span style={{ fontStyle: 'italic' }}>personnalisé</span></>} serif />
      <Field label="Nom du plan"><input class="input" value={name} onInput={(e) => setName(e.target.value)} placeholder="ex. Psaumes de l'hiver" /></Field>
      <div class="field">Couleur
        <div class="row" style={{ gap: '10px', flexWrap: 'wrap' }}>
          {PALETTE.map((hex, i) => <button aria-label={`Couleur ${i + 1}`} aria-pressed={i === color} onClick={() => setColor(i)} style={{ width: '40px', height: '40px', borderRadius: '20px', border: `3px solid ${i === color ? 'var(--ink)' : 'transparent'}`, background: hex, padding: 0 }} />)}
        </div>
      </div>
      <div class="field">
        <div class="row between"><span>Livres à lire</span><span class="small muted">{books.length} choisi{books.length > 1 ? 's' : ''} · {chapters} chapitres</span></div>
        <div class="seg"><button class={testament === 'AT' ? 'on' : ''} onClick={() => setTestament('AT')}>Ancien Testament</button><button class={testament === 'NT' ? 'on' : ''} onClick={() => setTestament('NT')}>Nouveau Testament</button></div>
        <div class="wrap">
          {list.map(([n, c]) => {
            const on = books.includes(n);
            return <button onClick={() => setBooks(toggleIn(books, n))} aria-pressed={on} style={{ border: 0, borderRadius: '12px', padding: '9px 12px', fontSize: '14px', fontWeight: 600, background: on ? accent : 'var(--surface)', color: on ? '#FFFFFF' : 'var(--ink)' }}>{n} <span style={{ fontSize: '11px', opacity: 0.75 }}>{c}</span></button>;
          })}
        </div>
      </div>
      <div class="field">Rythme
        <div class="seg">{[1, 2, 3].map((v) => <button class={pace === v ? 'on' : ''} onClick={() => setPace(v)}>{v} chap./jour</button>)}</div>
      </div>
      <div class="field">Jours de lecture
        <div class="grid7">{WEEK.map(([l, full, v]) => <button aria-label={full} aria-pressed={days.includes(v)} onClick={() => setDays(toggleIn(days, v))} style={{ height: '44px', border: 0, borderRadius: '12px', fontWeight: 700, background: days.includes(v) ? 'var(--ink)' : 'var(--surface)', color: days.includes(v) ? 'var(--bg)' : 'var(--muted)' }}>{l}</button>)}</div>
      </div>
      <Field label="Heure du rappel"><input class="input" type="time" value={time} onInput={(e) => setTime(e.target.value)} /></Field>
      <section class="card color" style={{ background: accent }}>
        <span class="small b" style={{ textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.85 }}>Aperçu</span>
        <span class="serif" style={{ fontSize: '32px', lineHeight: 1 }}>{name.trim() || 'Mon plan'}</span>
        <div class="grid3">
          <div class="col" style={{ gap: 0 }}><span class="big" style={{ fontSize: '24px' }}>{chapters}</span><span class="small" style={{ opacity: 0.85 }}>chapitres</span></div>
          <div class="col" style={{ gap: 0 }}><span class="big" style={{ fontSize: '24px' }}>{plan.length}</span><span class="small" style={{ opacity: 0.85 }}>lectures</span></div>
          <div class="col" style={{ gap: 0 }}><span class="big" style={{ fontSize: '24px' }}>{days.length ? Math.ceil(plan.length / days.length) : 0}</span><span class="small" style={{ opacity: 0.85 }}>semaines</span></div>
        </div>
        <span class="sm" style={{ opacity: 0.92 }}>{end ? `Début demain · fin prévue le ${fmtDay(end)} · rappel à ${time}` : 'Choisissez des livres et des jours.'}</span>
      </section>
      <button class="btn block" style={{ height: '54px', fontSize: '16px' }} onClick={create}>Créer le plan</button>
    </div>
  );
};

/** Carnet : toutes les méditations, des plus récentes aux plus anciennes. */
export const Journal = () => {
  const s = useStore();
  const [edit, setEdit] = useState(null);
  const notes = s.plans.flatMap((p) => Object.entries(p.notes || {}).map(([i, txt]) => ({ p, i: Number(i), txt, date: p.done[i] || p.start })))
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div class="page warm">
      <Header back="/lecture" kicker="Lecture" title={<>Mon <span style={{ fontStyle: 'italic' }}>carnet</span></>} serif />
      {notes.length === 0 && <div class="empty">Vos méditations apparaîtront ici. Après avoir validé une lecture, notez ce qui vous a touché.</div>}
      {notes.map((x) => (
        <button class="card" onClick={() => setEdit(x)} style={{ border: 0, textAlign: 'left', color: 'var(--ink)' }}>
          <div class="row between"><span class="pill" style={{ background: `${x.p.color}22`, color: x.p.color }}>{x.p.name}</span><span class="small muted">{fmtDay(x.date)}</span></div>
          <span class="serif" style={{ fontSize: '24px', lineHeight: 1.1 }}>{x.p.days[x.i].ref}</span>
          <span class="sm" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{x.txt}</span>
        </button>
      ))}
      {edit && <NoteSheet plan={edit.p} idx={edit.i} onClose={() => setEdit(null)} />}
    </div>
  );
};
