import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { EVENT_CATS } from '../data/catalog.js';
import { addDays, cap, fmtDay, fmtHours, fmtLong, fmtMin, fmtWeekday, parseISO, today, toH, uid, weekStart } from '../lib/util.js';
import { Dial, catColor, useDark, useNow } from '../ui/Dial.jsx';
import { Icon } from '../ui/icons.jsx';
import { DeleteButton, Field, Sheet, toast } from '../ui/kit.jsx';

const REMIND = [[null, 'Aucun'], [5, '5 min avant'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant'], [120, '2 h avant'], [1440, 'La veille']];

const EventSheet = ({ initial, onClose }) => {
  const [e, set] = useState(initial);
  const patch = (p) => set({ ...e, ...p });
  const isNew = !initial.id;
  const save = () => {
    if (!e.title.trim()) { toast('Donnez un titre à l’événement'); return; }
    if (e.end <= e.start) { toast('L’heure de fin doit suivre l’heure de début'); return; }
    update((d) => {
      if (isNew) d.events.push({ ...e, id: uid(), title: e.title.trim() });
      else d.events = d.events.map((x) => (x.id === e.id ? { ...e, title: e.title.trim() } : x));
    });
    toast(isNew ? 'Événement ajouté' : 'Événement modifié');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Nouvel événement' : 'Modifier l’événement'} onClose={onClose}>
      <Field label="Titre"><input class="input" value={e.title} onInput={(x) => patch({ title: x.target.value })} placeholder="ex. Réunion, culte, sport…" /></Field>
      <Field label="Date"><input class="input" type="date" value={e.date} onInput={(x) => patch({ date: x.target.value })} /></Field>
      <div class="grid2">
        <Field label="Début"><input class="input" type="time" value={e.start} onInput={(x) => patch({ start: x.target.value })} /></Field>
        <Field label="Fin"><input class="input" type="time" value={e.end} onInput={(x) => patch({ end: x.target.value })} /></Field>
      </div>
      <div class="field">Catégorie
        <div class="wrap">
          {Object.entries(EVENT_CATS).map(([k, c]) => (
            <button class="chip" aria-pressed={e.cat === k} onClick={() => patch({ cat: k })}
              style={{ background: e.cat === k ? c.color : 'var(--surface)', color: e.cat === k ? '#FFFFFF' : 'var(--ink)' }}>
              <Icon name={c.icon} size={16} />{c.name}
            </button>
          ))}
        </div>
      </div>
      <Field label="Rappel">
        <select class="input" value={String(e.remind)} onChange={(x) => patch({ remind: x.target.value === 'null' ? null : Number(x.target.value) })}>
          {REMIND.map(([v, l]) => <option value={String(v)}>{l}</option>)}
        </select>
      </Field>
      <button class="btn accent block" onClick={save}>{isNew ? 'Ajouter' : 'Enregistrer'}</button>
      {!isNew && <DeleteButton onConfirm={() => { update((d) => { d.events = d.events.filter((x) => x.id !== e.id); }); toast('Événement supprimé'); onClose(); }} />}
    </Sheet>
  );
};

export const Agenda = () => {
  const s = useStore();
  const dark = useDark();
  const now = useNow();
  const t = today();
  const [day, setDay] = useState(t);
  const [view, setView] = useState('jour');
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(null);
  const mon = weekStart(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const of = (d) => s.events.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start));
  const events = of(day);
  const isToday = day === t;
  const selected = sel != null ? events[sel] : null;
  const nextEv = isToday ? events.find((e) => toH(e.start) >= now) : null;
  const busy = (list) => list.reduce((a, e) => a + Math.max(0, toH(e.end) - toH(e.start)), 0);

  let center;
  if (selected) center = { k: (EVENT_CATS[selected.cat] || EVENT_CATS.perso).name, t: selected.title, s: `${selected.start} – ${selected.end}`, c: catColor(selected.cat, dark) };
  else if (isToday && nextEv) center = { k: 'À suivre', t: nextEv.title, s: `${nextEv.start} · dans ${fmtMin(Math.round((toH(nextEv.start) - now) * 60))}`, c: catColor(nextEv.cat, dark) };
  else if (events.length) center = { k: isToday ? 'Plus rien' : cap(fmtWeekday(day)), t: `${events.length} événement${events.length > 1 ? 's' : ''}`, s: `${fmtHours(busy(events))} h planifiées`, c: 'var(--accent)' };
  else center = { k: 'Journée libre', t: 'Rien de prévu', s: 'Touchez + pour ajouter', c: 'var(--muted)' };

  const newEvent = () => {
    const h = isToday ? Math.min(22, Math.ceil(now)) : 9;
    setEdit({ title: '', date: day, start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 1).padStart(2, '0')}:00`, cat: 'perso', remind: 15 });
  };
  const used = [...new Set(events.map((e) => e.cat))];
  const weekEvents = week.flatMap(of);
  const hoursByCat = {};
  weekEvents.forEach((e) => { hoursByCat[e.cat] = (hoursByCat[e.cat] || 0) + Math.max(0, toH(e.end) - toH(e.start)); });

  return (
    <div class="page">
      <header class="row between" style={{ alignItems: 'flex-end' }}>
        <div class="col" style={{ gap: '2px' }}>
          <span class="kicker">Semaine du {fmtDay(mon)}</span>
          <h1 class="h1">{cap(parseISO(day).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</h1>
        </div>
        <div class="seg" style={{ width: '150px' }}>
          <button class={view === 'jour' ? 'on' : ''} onClick={() => setView('jour')}>Jour</button>
          <button class={view === 'semaine' ? 'on' : ''} onClick={() => setView('semaine')}>Semaine</button>
        </div>
      </header>

      <div class="row" style={{ gap: '6px' }}>
        <button class="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '12px' }} aria-label="Semaine précédente" onClick={() => { setDay(addDays(day, -7)); setSel(null); }}><Icon name="left" size={18} /></button>
        <div class="grid7 grow">
          {week.map((d) => {
            const on = d === day;
            const dots = [...new Set(of(d).map((e) => catColor(e.cat, dark)))].slice(0, 3);
            return (
              <button onClick={() => { setDay(d); setSel(null); setView('jour'); }} aria-pressed={on}
                style={{ border: d === t && !on ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: '14px', padding: '8px 0 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>{fmtWeekday(d)}</span>
                <span class="big" style={{ fontSize: '17px', fontWeight: 700 }}>{parseISO(d).getDate()}</span>
                <span style={{ display: 'flex', gap: '3px', height: '5px' }}>{dots.map((c) => <span style={{ width: '5px', height: '5px', borderRadius: '3px', background: c }} />)}</span>
              </button>
            );
          })}
        </div>
        <button class="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '12px' }} aria-label="Semaine suivante" onClick={() => { setDay(addDays(day, 7)); setSel(null); }}><Icon name="right" size={18} /></button>
      </div>
      {day !== t && <button class="btn soft small" style={{ alignSelf: 'center' }} onClick={() => { setDay(t); setSel(null); }}>Revenir à aujourd'hui</button>}

      {view === 'jour' ? (
        <>
          <section class="card" style={{ alignItems: 'center', borderRadius: '32px' }}>
            <Dial events={events} size={300} now={isToday ? now : null} selected={sel} onPick={(i) => setSel(sel === i ? null : i)}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: center.c }}>{center.k}</span>
              <span class="big" style={{ fontSize: '19px', fontWeight: 700, lineHeight: 1.15 }}>{center.t}</span>
              <span class="sm muted num">{center.s}</span>
            </Dial>
            {used.length > 0 && (
              <div class="wrap" style={{ justifyContent: 'center' }}>
                {used.map((k) => <span class="pill" style={{ background: 'var(--surface-2)' }}><span style={{ width: '8px', height: '8px', borderRadius: '4px', background: catColor(k, dark) }} />{EVENT_CATS[k].name}</span>)}
              </div>
            )}
          </section>
          <section class="col" style={{ gap: '10px' }}>
            <div class="row between"><h2 class="h2">{isToday ? 'Aujourd’hui' : cap(fmtLong(day))}</h2><span class="sm muted">{events.length} événement{events.length > 1 ? 's' : ''}</span></div>
            {events.map((e, i) => {
              const c = EVENT_CATS[e.cat] || EVENT_CATS.perso;
              return (
                <div class="card tight" style={{ flexDirection: 'row', alignItems: 'center', background: sel === i ? c.tint : 'var(--surface)' }}>
                  <button onClick={() => setSel(sel === i ? null : i)} class="row grow" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: 'var(--ink)' }}>
                    <span class="tile" style={{ background: c.tint, color: catColor(e.cat, dark) }}><Icon name={c.icon} /></span>
                    <span class="col grow" style={{ gap: '2px' }}>
                      <span class="b" style={{ fontSize: '15px' }}>{e.title}</span>
                      <span class="small muted">{c.name}{e.remind != null ? ' · rappel' : ''}</span>
                    </span>
                    <span class="sm b num" style={{ textAlign: 'right' }}>{e.start}<br />{e.end}</span>
                  </button>
                  <button class="icon-btn" style={{ width: '38px', height: '38px', background: 'var(--surface-2)' }} aria-label={`Modifier ${e.title}`} onClick={() => setEdit(e)}><Icon name="edit" size={18} /></button>
                </div>
              );
            })}
            <button class="empty" style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700, flexDirection: 'row', justifyContent: 'center' }} onClick={newEvent}><Icon name="plus" size={18} />Ajouter un événement</button>
          </section>
        </>
      ) : (
        <>
          <section class="card">
            <div class="row between"><span class="sm b muted">Temps planifié</span><span class="big" style={{ fontSize: '22px' }}>{fmtHours(busy(weekEvents))} h</span></div>
            <div style={{ display: 'flex', height: '12px', gap: '3px' }}>
              {Object.entries(hoursByCat).map(([k, h]) => <span style={{ flex: `${h} 1 0`, background: catColor(k, dark), borderRadius: '4px' }} />)}
              {!weekEvents.length && <span style={{ flex: 1, background: 'var(--line-soft)', borderRadius: '4px' }} />}
            </div>
            <div class="wrap" style={{ gap: '6px 14px' }}>
              {Object.entries(hoursByCat).map(([k, h]) => <span class="row small" style={{ gap: '6px', color: 'var(--ink-2)' }}><span style={{ width: '8px', height: '8px', borderRadius: '4px', background: catColor(k, dark) }} />{EVENT_CATS[k].name} · {fmtHours(h)} h</span>)}
            </div>
          </section>
          <div class="grid2">
            {week.map((d) => {
              const list = of(d);
              const td = d === t;
              return (
                <button onClick={() => { setDay(d); setView('jour'); setSel(null); }}
                  style={{ border: 0, borderRadius: '24px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: td ? 'var(--dark)' : 'var(--surface)', color: td ? 'var(--on-dark)' : 'var(--ink)' }}>
                  <span class="row between" style={{ alignSelf: 'stretch' }}><span class="big" style={{ fontSize: '16px', fontWeight: 700 }}>{cap(fmtWeekday(d))} {parseISO(d).getDate()}</span>{td && <span class="small b" style={{ opacity: 0.8 }}>Aujourd'hui</span>}</span>
                  <Dial events={list} size={128} width={30} ticks={false} track={td ? 'var(--dark-2)' : 'var(--line-soft)'}>
                    <span class="big" style={{ fontSize: '26px' }}>{list.length}</span>
                  </Dial>
                  <span class="small b" style={{ opacity: 0.8 }}>{fmtHours(busy(list))} h planifiées</span>
                </button>
              );
            })}
            <button class="empty" style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700, justifyContent: 'center' }} onClick={newEvent}><Icon name="plus" size={26} />Ajouter un événement</button>
          </div>
        </>
      )}
      {edit && <EventSheet initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
};
