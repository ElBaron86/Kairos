import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { EVENT_CATS } from '../data/catalog.js';
import { FREQS, eventsOn, isRecurring, repeatLabel } from '../lib/events.js';
import { parseICS } from '../lib/ics.js';
import { addDays, addMonths, cap, fmtDay, fmtHours, fmtLong, fmtMin, fmtMonth, fmtWeekday, monthKey, parseISO, today, toH, uid, weekStart } from '../lib/util.js';
import { Dial, catColor, useDark, useNow } from '../ui/Dial.jsx';
import { Icon } from '../ui/icons.jsx';
import { DeleteButton, Field, Sheet, toast } from '../ui/kit.jsx';

const REMIND = [[null, 'Aucun'], [5, '5 min avant'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant'], [120, '2 h avant'], [1440, 'La veille']];
const WEEK = [['L', 1], ['M', 2], ['M', 3], ['J', 4], ['V', 5], ['S', 6], ['D', 0]];

/** Importe un fichier .ics choisi par l'utilisateur. */
export const importICS = (file) => file.text().then((txt) => {
  const list = parseICS(txt);
  if (!list.length) { toast('Aucun événement à venir trouvé dans ce fichier'); return; }
  let added = 0;
  update((d) => {
    const known = new Set(d.events.map((e) => e.icsUid).filter(Boolean));
    list.forEach((e) => { if (!e.icsUid || !known.has(e.icsUid)) { d.events.push(e); added += 1; } });
  });
  toast(`${added} événement${added > 1 ? 's' : ''} importé${added > 1 ? 's' : ''}`);
});

const EventSheet = ({ initial, onClose }) => {
  const [e, set] = useState({ repeat: { freq: 'none', days: [], until: null }, allDay: false, endDate: null, skip: [], ...initial });
  const patch = (p) => set({ ...e, ...p });
  const isNew = !initial.id;
  const r = e.repeat || { freq: 'none' };
  const setRepeat = (p) => patch({ repeat: { ...r, ...p } });
  const save = () => {
    if (!e.title.trim()) { toast('Donnez un titre à l’événement'); return; }
    if (!e.allDay && e.end <= e.start) { toast('L’heure de fin doit suivre l’heure de début'); return; }
    if (e.allDay && e.endDate && e.endDate < e.date) { toast('La date de fin doit suivre la date de début'); return; }
    const { on, ...clean } = e;
    clean.title = e.title.trim();
    if (clean.allDay) { clean.start = '00:00'; clean.end = '23:59'; } else clean.endDate = null;
    if (isRecurring(clean)) clean.endDate = null;
    update((d) => {
      if (isNew) d.events.push({ ...clean, id: uid() });
      else d.events = d.events.map((x) => (x.id === e.id ? clean : x));
    });
    toast(isNew ? 'Événement ajouté' : isRecurring(clean) ? 'Série modifiée' : 'Événement modifié');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Nouvel événement' : 'Modifier l’événement'} onClose={onClose}>
      <Field label="Titre"><input class="input" value={e.title} onInput={(x) => patch({ title: x.target.value })} placeholder="ex. Réunion, culte, sport…" /></Field>
      <div class="seg">
        <button class={!e.allDay ? 'on' : ''} onClick={() => patch({ allDay: false })}>Avec horaire</button>
        <button class={e.allDay ? 'on' : ''} onClick={() => patch({ allDay: true })}>Toute la journée</button>
      </div>
      {e.allDay ? (
        <div class="grid2">
          <Field label="Du"><input class="input" type="date" value={e.date} onInput={(x) => patch({ date: x.target.value })} /></Field>
          <Field label="Au" hint={isRecurring(e) ? 'Non disponible pour une série' : undefined}><input class="input" type="date" disabled={isRecurring(e)} value={e.endDate || e.date} onInput={(x) => patch({ endDate: x.target.value === e.date ? null : x.target.value })} /></Field>
        </div>
      ) : (
        <>
          <Field label="Date"><input class="input" type="date" value={e.date} onInput={(x) => patch({ date: x.target.value })} /></Field>
          <div class="grid2">
            <Field label="Début"><input class="input" type="time" value={e.start} onInput={(x) => patch({ start: x.target.value })} /></Field>
            <Field label="Fin"><input class="input" type="time" value={e.end} onInput={(x) => patch({ end: x.target.value })} /></Field>
          </div>
        </>
      )}
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
      <Field label="Répéter">
        <select class="input" value={r.freq} onChange={(x) => setRepeat({ freq: x.target.value, days: x.target.value === 'weekly' && !(r.days || []).length ? [parseISO(e.date).getDay()] : r.days || [] })}>
          {FREQS.map(([v, l]) => <option value={v}>{l}</option>)}
        </select>
      </Field>
      {r.freq === 'weekly' && (
        <div class="field">Les jours
          <div class="grid7">{WEEK.map(([l, v]) => { const on = (r.days || []).includes(v); return <button aria-pressed={on} onClick={() => setRepeat({ days: on ? r.days.filter((x) => x !== v) : [...(r.days || []), v] })} style={{ height: '42px', border: 0, borderRadius: '12px', fontWeight: 700, background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--muted)' }}>{l}</button>; })}</div>
        </div>
      )}
      {r.freq !== 'none' && <Field label="Jusqu'au" hint="Facultatif : laissez vide pour une série sans fin."><input class="input" type="date" value={r.until || ''} onInput={(x) => setRepeat({ until: x.target.value || null })} /></Field>}
      <Field label="Rappel">
        <select class="input" value={String(e.remind)} onChange={(x) => patch({ remind: x.target.value === 'null' ? null : Number(x.target.value) })}>
          {REMIND.map(([v, l]) => <option value={String(v)}>{l}</option>)}
        </select>
      </Field>
      <button class="btn accent block" onClick={save}>{isNew ? 'Ajouter' : 'Enregistrer'}</button>
      {!isNew && isRecurring(initial) && initial.on && (
        <button class="btn ghost block" onClick={() => { update((d) => { const x = d.events.find((y) => y.id === e.id); x.skip = [...(x.skip || []), initial.on]; }); toast('Occurrence supprimée'); onClose(); }}>
          Supprimer seulement le {fmtDay(initial.on)}
        </button>
      )}
      {!isNew && <DeleteButton label={isRecurring(initial) ? 'Supprimer toute la série' : 'Supprimer'} onConfirm={() => { update((d) => { d.events = d.events.filter((x) => x.id !== e.id); }); toast('Supprimé'); onClose(); }} />}
    </Sheet>
  );
};

const AllDayStrip = ({ list, onEdit, dark }) => (list.length ? (
  <div class="col" style={{ gap: '6px' }}>
    {list.map((e) => (
      <button onClick={() => onEdit(e)} class="row" style={{ border: 0, borderRadius: '14px', padding: '10px 12px', background: (EVENT_CATS[e.cat] || EVENT_CATS.perso).tint, color: 'var(--ink)', textAlign: 'left' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '5px', background: catColor(e.cat, dark), flexShrink: 0 }} />
        <span class="b grow" style={{ fontSize: '14px' }}>{e.title}</span>
        <span class="small muted">{e.endDate ? `jusqu'au ${fmtDay(e.endDate)}` : 'Toute la journée'}</span>
      </button>
    ))}
  </div>
) : null);

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
  const all = (d) => eventsOn(s.events, d);
  const timed = (d) => all(d).filter((e) => !e.allDay);
  const events = timed(day);
  const allDay = all(day).filter((e) => e.allDay);
  const isToday = day === t;
  const selected = sel != null ? events[sel] : null;
  const nowEv = isToday ? events.find((e) => toH(e.start) <= now && toH(e.end) > now) : null;
  const nextEv = isToday ? events.find((e) => toH(e.start) >= now) : null;
  const busy = (list) => list.reduce((a, e) => a + Math.max(0, toH(e.end) - toH(e.start)), 0);

  let center;
  if (selected) center = { k: (EVENT_CATS[selected.cat] || EVENT_CATS.perso).name, t: selected.title, s: `${selected.start} – ${selected.end}`, c: catColor(selected.cat, dark) };
  else if (nowEv) center = { k: 'En ce moment', t: nowEv.title, s: `jusqu'à ${nowEv.end}`, c: catColor(nowEv.cat, dark) };
  else if (isToday && nextEv) center = { k: 'À suivre', t: nextEv.title, s: `${nextEv.start} · dans ${fmtMin(Math.round((toH(nextEv.start) - now) * 60))}`, c: catColor(nextEv.cat, dark) };
  else if (events.length) center = { k: isToday ? 'Plus rien' : cap(fmtWeekday(day)), t: `${events.length} événement${events.length > 1 ? 's' : ''}`, s: `${fmtHours(busy(events))} h planifiées`, c: 'var(--accent)' };
  else center = { k: 'Journée libre', t: 'Rien de prévu', s: 'Touchez + pour ajouter', c: 'var(--muted)' };

  const newEvent = (date = day) => {
    const h = date === t ? Math.min(22, Math.ceil(now)) : 9;
    setEdit({ title: '', date, start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 1).padStart(2, '0')}:00`, cat: 'perso', remind: 15 });
  };
  const used = [...new Set(events.map((e) => e.cat))];
  const weekEvents = week.flatMap(timed);
  const hoursByCat = {};
  weekEvents.forEach((e) => { hoursByCat[e.cat] = (hoursByCat[e.cat] || 0) + Math.max(0, toH(e.end) - toH(e.start)); });
  const shift = (n) => { setDay(view === 'mois' ? `${addMonths(monthKey(day), n)}-01` : addDays(day, 7 * n)); setSel(null); };

  // Vue mois : grille de 6 semaines à partir du lundi qui précède le 1er.
  const first = `${monthKey(day)}-01`;
  const gridStart = weekStart(first);
  const grid = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div class="page">
      <header class="row between" style={{ alignItems: 'flex-end' }}>
        <div class="col" style={{ gap: '2px' }}>
          <span class="kicker">{view === 'mois' ? 'Vue du mois' : `Semaine du ${fmtDay(mon)}`}</span>
          <h1 class="h1">{cap(fmtMonth(monthKey(day)))}</h1>
        </div>
      </header>
      <div class="seg">
        {[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']].map(([k, l]) => <button class={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {view !== 'mois' && (
        <div class="row" style={{ gap: '6px' }}>
          <button class="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '12px' }} aria-label="Semaine précédente" onClick={() => shift(-1)}><Icon name="left" size={18} /></button>
          <div class="grid7 grow">
            {week.map((d) => {
              const on = d === day;
              const dots = [...new Set(all(d).map((e) => catColor(e.cat, dark)))].slice(0, 3);
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
          <button class="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '12px' }} aria-label="Semaine suivante" onClick={() => shift(1)}><Icon name="right" size={18} /></button>
        </div>
      )}
      {day !== t && view !== 'mois' && <button class="btn soft small" style={{ alignSelf: 'center' }} onClick={() => { setDay(t); setSel(null); }}>Revenir à aujourd'hui</button>}

      {view === 'jour' && (
        <>
          <AllDayStrip list={allDay} onEdit={setEdit} dark={dark} />
          <section class="card" style={{ alignItems: 'center', borderRadius: '32px' }}>
            <Dial events={events} size={300} now={isToday ? now : null} selected={sel} onPick={(i) => setSel(sel === i ? null : i)}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: center.c }}>{center.k}</span>
              <span class="big" style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.15, maxWidth: '140px' }}>{center.t}</span>
              <span class="sm muted num">{center.s}</span>
            </Dial>
            {used.length > 0 && (
              <div class="wrap" style={{ justifyContent: 'center' }}>
                {used.map((k) => <span class="pill" style={{ background: 'var(--surface-2)' }}><span style={{ width: '8px', height: '8px', borderRadius: '4px', background: catColor(k, dark) }} />{EVENT_CATS[k].name}</span>)}
              </div>
            )}
          </section>
          <section class="section">
            <div class="section-head"><h2 class="h2">{isToday ? 'Aujourd’hui' : cap(fmtLong(day))}</h2><span class="sm muted">{events.length} événement{events.length > 1 ? 's' : ''}</span></div>
            {events.map((e, i) => {
              const c = EVENT_CATS[e.cat] || EVENT_CATS.perso;
              const rep = repeatLabel(e);
              return (
                <div class="card tight" style={{ flexDirection: 'row', alignItems: 'center', background: sel === i ? c.tint : 'var(--surface)' }}>
                  <button onClick={() => setSel(sel === i ? null : i)} class="row grow" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: 'var(--ink)' }}>
                    <span class="tile" style={{ background: c.tint, color: catColor(e.cat, dark) }}><Icon name={c.icon} /></span>
                    <span class="col grow" style={{ gap: '2px' }}>
                      <span class="b" style={{ fontSize: '15px' }}>{e.title}</span>
                      <span class="small muted">{c.name}{rep ? ` · ${rep}` : ''}{e.remind != null ? ' · rappel' : ''}</span>
                    </span>
                    <span class="sm b num" style={{ textAlign: 'right' }}>{e.start}<br />{e.end}</span>
                  </button>
                  <button class="icon-btn" style={{ width: '38px', height: '38px', background: 'var(--surface-2)' }} aria-label={`Modifier ${e.title}`} onClick={() => setEdit(e)}><Icon name="edit" size={18} /></button>
                </div>
              );
            })}
            <button class="empty" style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700, flexDirection: 'row', justifyContent: 'center' }} onClick={() => newEvent()}><Icon name="plus" size={18} />Ajouter un événement</button>
          </section>
        </>
      )}

      {view === 'semaine' && (
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
              const list = timed(d);
              const td = d === t;
              const extra = all(d).length - list.length;
              return (
                <button onClick={() => { setDay(d); setView('jour'); setSel(null); }}
                  style={{ border: 0, borderRadius: '24px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: td ? 'var(--dark)' : 'var(--surface)', color: td ? 'var(--on-dark)' : 'var(--ink)' }}>
                  <span class="row between" style={{ alignSelf: 'stretch' }}><span class="big" style={{ fontSize: '16px', fontWeight: 700 }}>{cap(fmtWeekday(d))} {parseISO(d).getDate()}</span>{td && <span class="small b" style={{ opacity: 0.8 }}>Aujourd'hui</span>}</span>
                  <Dial events={list} size={128} width={30} ticks={false} track={td ? 'var(--dark-2)' : 'var(--line-soft)'}>
                    <span class="big" style={{ fontSize: '26px' }}>{list.length}</span>
                  </Dial>
                  <span class="small b" style={{ opacity: 0.8 }}>{fmtHours(busy(list))} h{extra ? ` · +${extra} journée` : ''}</span>
                </button>
              );
            })}
            <button class="empty" style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700, justifyContent: 'center' }} onClick={() => newEvent()}><Icon name="plus" size={26} />Ajouter un événement</button>
          </div>
        </>
      )}

      {view === 'mois' && (
        <>
          <div class="row between">
            <button class="icon-btn" aria-label="Mois précédent" onClick={() => shift(-1)}><Icon name="left" /></button>
            {monthKey(day) !== monthKey(t) && <button class="btn soft small" onClick={() => setDay(t)}>Ce mois-ci</button>}
            <button class="icon-btn" aria-label="Mois suivant" onClick={() => shift(1)}><Icon name="right" /></button>
          </div>
          <section class="card" style={{ padding: '14px 10px' }}>
            <div class="grid7" style={{ gap: '4px' }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l) => <span class="small b muted center">{l}</span>)}
              {grid.map((d) => {
                const list = all(d);
                const inMonth = monthKey(d) === monthKey(day);
                const td = d === t;
                const cols = [...new Set(list.map((e) => catColor(e.cat, dark)))].slice(0, 4);
                return (
                  <button onClick={() => { setDay(d); setView('jour'); setSel(null); }} aria-label={`${fmtLong(d)} : ${list.length} événement${list.length > 1 ? 's' : ''}`}
                    style={{ border: 0, borderRadius: '12px', minHeight: '54px', padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: td ? 'var(--ink)' : list.length ? 'var(--surface-2)' : 'transparent', color: td ? 'var(--bg)' : 'var(--ink)', opacity: inMonth ? 1 : 0.35 }}>
                    <span class="b" style={{ fontSize: '14px' }}>{parseISO(d).getDate()}</span>
                    <span style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '30px' }}>{cols.map((c) => <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: c }} />)}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section class="card">
            <div class="row"><span class="tile" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="download" /></span>
              <div class="col grow"><span class="b">Importer un agenda</span><span class="small muted">Fichier .ics exporté de Google Agenda, iCloud ou Outlook.</span></div></div>
            <label class="btn soft block">Choisir un fichier .ics<input type="file" accept=".ics,text/calendar" class="sr" onChange={(x) => x.target.files[0] && importICS(x.target.files[0])} /></label>
          </section>
        </>
      )}
      {edit && <EventSheet initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
};
