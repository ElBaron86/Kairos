import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { BOOK_CATS } from '../data/catalog.js';
import { finishedThisYear } from '../lib/stats.js';
import { diffDays, fmtDay, num, pct, streakOf, today, uid } from '../lib/util.js';
import { Icon } from '../ui/icons.jsx';
import { Bar, DeleteButton, Field, Ring, Sheet, toast } from '../ui/kit.jsx';
import { ReadingTabs } from './Bible.jsx';

const patchBook = (id, fn) => update((d) => { fn(d.books.find((b) => b.id === id)); });

const Cover = ({ b, w = 62, h = 92 }) => {
  const c = (BOOK_CATS[b.cat] || BOOK_CATS.autre).color;
  if (b.coverId) return <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} alt="" width={w} height={h} loading="lazy" style={{ width: `${w}px`, height: `${h}px`, objectFit: 'cover', borderRadius: '4px 8px 8px 4px', flexShrink: 0, background: c }} />;
  return (
    <div style={{ width: `${w}px`, height: `${h}px`, borderRadius: '4px 8px 8px 4px', background: c, display: 'flex', flexShrink: 0, overflow: 'hidden' }} aria-hidden="true">
      <span style={{ width: '6px', background: 'rgba(0,0,0,.22)' }} />
      {w > 40 && <span class="serif" style={{ flex: 1, padding: '8px 6px', fontSize: '12px', lineHeight: 1.1, color: '#FFFFFF', overflow: 'hidden' }}>{b.title}</span>}
    </div>
  );
};

/** Recherche dans le catalogue ouvert Open Library (titre, auteur, pages, couverture). */
const BookSearch = ({ onPick }) => {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q.trim())}&limit=6&fields=key,title,author_name,number_of_pages_median,cover_i`);
      const data = await r.json();
      setRes(data.docs || []);
    } catch (e) { toast('Recherche impossible : vérifiez la connexion'); setRes([]); }
    setBusy(false);
  };
  return (
    <div class="col" style={{ gap: '8px' }}>
      <div class="row">
        <input class="input" value={q} onInput={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Rechercher un titre ou un auteur" aria-label="Rechercher un livre" />
        <button class="btn soft" onClick={search} disabled={busy}>{busy ? '…' : 'Chercher'}</button>
      </div>
      {res && res.length === 0 && <span class="small muted">Aucun résultat : remplissez les champs à la main.</span>}
      {res && res.map((d) => (
        <button class="row" onClick={() => { onPick({ title: d.title, author: (d.author_name || [])[0] || '', pages: d.number_of_pages_median || '', coverId: d.cover_i || null }); setRes(null); }}
          style={{ border: 0, background: 'var(--surface)', borderRadius: '14px', padding: '8px', textAlign: 'left', color: 'var(--ink)' }}>
          {d.cover_i ? <img src={`https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg`} alt="" width="34" height="50" style={{ width: '34px', height: '50px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} /> : <span style={{ width: '34px', height: '50px', borderRadius: '4px', background: 'var(--line)', flexShrink: 0 }} />}
          <span class="col grow" style={{ gap: 0 }}><span class="sm b">{d.title}</span><span class="small muted">{(d.author_name || []).slice(0, 2).join(', ')}{d.number_of_pages_median ? ` · ${d.number_of_pages_median} p.` : ''}</span></span>
        </button>
      ))}
    </div>
  );
};

const BookSheet = ({ initial, onClose }) => {
  const [b, set] = useState(initial);
  const isNew = !initial.id;
  const p = (x) => set({ ...b, ...x });
  const save = () => {
    if (!b.title.trim()) { toast('Indiquez le titre'); return; }
    const pages = Math.max(1, Math.round(num(b.pages)) || 1);
    const page = Math.min(pages, Math.max(0, Math.round(num(b.page))));
    update((d) => {
      const clean = { ...b, title: b.title.trim(), author: (b.author || '').trim(), pages, page, target: b.target || null };
      if (isNew) d.books.unshift({ ...clean, id: uid(), log: [] });
      else d.books = d.books.map((x) => (x.id === b.id ? clean : x));
    });
    toast(isNew ? 'Livre ajouté' : 'Livre modifié');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Ajouter un livre' : 'Modifier le livre'} onClose={onClose}>
      {isNew && <BookSearch onPick={(x) => set({ ...b, ...x })} />}
      <Field label="Titre"><input class="input" value={b.title} onInput={(e) => p({ title: e.target.value })} /></Field>
      <Field label="Auteur"><input class="input" value={b.author} onInput={(e) => p({ author: e.target.value })} /></Field>
      <div class="field">Catégorie
        <div class="wrap">{Object.entries(BOOK_CATS).map(([k, c]) => <button class="chip" aria-pressed={b.cat === k} onClick={() => p({ cat: k })} style={{ background: b.cat === k ? c.color : 'var(--surface)', color: b.cat === k ? '#FFFFFF' : 'var(--ink)' }}>{c.name}</button>)}</div>
      </div>
      <div class="grid2">
        <Field label="Nombre de pages"><input class="input" inputMode="numeric" value={b.pages} onInput={(e) => p({ pages: e.target.value })} /></Field>
        <Field label="Page actuelle"><input class="input" inputMode="numeric" value={b.page} onInput={(e) => p({ page: e.target.value })} /></Field>
      </div>
      <Field label="Finir avant le" hint="Facultatif : Kairos calcule le nombre de pages à lire par jour."><input class="input" type="date" value={b.target || ''} onInput={(e) => p({ target: e.target.value || null })} /></Field>
      <div class="field">Statut
        <div class="seg">{[['todo', 'À lire'], ['reading', 'En cours'], ['done', 'Terminé']].map(([v, l]) => <button class={b.status === v ? 'on' : ''} onClick={() => p({ status: v, finishedAt: v === 'done' ? b.finishedAt || today() : null })}>{l}</button>)}</div>
      </div>
      <button class="btn accent block" onClick={save}>{isNew ? 'Ajouter' : 'Enregistrer'}</button>
      {!isNew && <DeleteButton onConfirm={() => { update((d) => { d.books = d.books.filter((x) => x.id !== b.id); }); onClose(); }} />}
    </Sheet>
  );
};

export const Books = () => {
  const s = useStore();
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState(null);
  const [goalEdit, setGoalEdit] = useState(false);
  const t = today();
  const inCat = (b) => filter === 'all' || b.cat === filter;
  const reading = s.books.filter((b) => b.status === 'reading' && inCat(b));
  const todo = s.books.filter((b) => b.status === 'todo' && inCat(b));
  const done = s.books.filter((b) => b.status === 'done' && inCat(b)).sort((a, z) => (z.finishedAt || '').localeCompare(a.finishedAt || ''));
  const fin = finishedThisYear(s);
  const left = s.bookGoal - fin;
  const usedCats = [...new Set(s.books.map((b) => b.cat))];

  return (
    <div class="page warm">
      <header class="row between" style={{ alignItems: 'flex-end' }}>
        <div class="col" style={{ gap: '2px' }}><span class="kicker">Lecture</span><h1 class="h1 serif">Ma <span style={{ fontStyle: 'italic' }}>bibliothèque</span></h1></div>
        <button class="icon-btn ink" aria-label="Ajouter un livre" onClick={() => setEdit({ title: '', author: '', cat: 'dev', pages: '', page: 0, status: 'reading', target: null })}><Icon name="plus" size={22} /></button>
      </header>
      <ReadingTabs on="livres" />

      <button class="card dark" onClick={() => setGoalEdit(true)} style={{ flexDirection: 'row', alignItems: 'center', border: 0, textAlign: 'left' }}>
        <Ring value={fin} max={s.bookGoal} size={72} color="#F2A25B" track="var(--dark-2)"><span class="big" style={{ fontSize: '16px' }}>{fin}/{s.bookGoal}</span></Ring>
        <div class="col grow" style={{ gap: '3px' }}>
          <span class="small b" style={{ color: 'var(--on-dark-2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Défi {t.slice(0, 4)}</span>
          <span class="serif" style={{ fontSize: '24px', lineHeight: 1.05 }}>{s.bookGoal} livres cette année</span>
          <span class="sm" style={{ color: 'var(--on-dark-2)' }}>{left <= 0 ? 'Défi relevé, bravo !' : `Encore ${left} livre${left > 1 ? 's' : ''} d'ici le 31 décembre`}</span>
        </div>
      </button>

      {usedCats.length > 1 && (
        <div class="hscroll hide-scroll" role="tablist">
          <button class={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Tous</button>
          {usedCats.map((k) => <button class={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}><span style={{ width: '8px', height: '8px', borderRadius: '4px', background: BOOK_CATS[k].color }} />{BOOK_CATS[k].name}</button>)}
        </div>
      )}

      <section class="col" style={{ gap: '10px' }}>
        <h2 class="h2">En cours</h2>
        {reading.length === 0 && <div class="empty">Aucune lecture en cours. Ajoutez un livre avec le bouton +.</div>}
        {reading.map((b) => {
          const c = BOOK_CATS[b.cat] || BOOK_CATS.autre;
          const p = pct(b.page, b.pages);
          const doneToday = (b.log || []).includes(t);
          const streak = streakOf(b.log || []);
          let plan = 'Pas de date de fin · touchez Modifier pour en fixer une';
          if (b.target) {
            const days = Math.max(1, diffDays(t, b.target));
            plan = b.target < t ? `Date prévue dépassée (${fmtDay(b.target)})` : `Objectif : fini le ${fmtDay(b.target)} → ${Math.ceil((b.pages - b.page) / days)} pages/jour`;
          }
          return (
            <article class="card">
              <div class="row" style={{ alignItems: 'flex-start', gap: '14px' }}>
                <Cover b={b} />
                <div class="col grow" style={{ gap: '4px' }}>
                  <span class="pill" style={{ alignSelf: 'flex-start', background: `${c.color}22`, color: c.color, padding: '3px 8px', fontSize: '11px' }}>{c.name}</span>
                  <span class="serif" style={{ fontSize: '22px', lineHeight: 1.05 }}>{b.title}</span>
                  <span class="sm muted">{b.author}</span>
                </div>
                <button class="icon-btn" style={{ width: '38px', height: '38px', background: 'var(--surface-2)' }} aria-label={`Modifier ${b.title}`} onClick={() => setEdit(b)}><Icon name="edit" size={18} /></button>
              </div>
              <div class="col" style={{ gap: '6px' }}>
                <div class="row between sm b"><span>Page {b.page} / {b.pages}</span><span>{p} %</span></div>
                <Bar value={p} color={c.color} />
                <span class="small muted">{plan}</span>
              </div>
              <div class="row" style={{ gap: '8px' }}>
                <button class="btn ghost small" style={{ height: '44px', width: '52px' }} aria-label="Retirer 10 pages" onClick={() => patchBook(b.id, (x) => { x.page = Math.max(0, x.page - 10); })}>−10</button>
                <button class="btn ghost small" style={{ height: '44px', width: '52px' }} aria-label="Ajouter 10 pages" onClick={() => patchBook(b.id, (x) => { x.page = Math.min(x.pages, x.page + 10); if (!x.log.includes(t)) x.log.push(t); })}>+10</button>
                <button class="btn small grow" aria-pressed={doneToday} style={{ height: '44px', background: doneToday ? c.color : `${c.color}22`, color: doneToday ? '#FFFFFF' : c.color }}
                  onClick={() => patchBook(b.id, (x) => { x.log = doneToday ? x.log.filter((d) => d !== t) : [...x.log, t]; })}>
                  <Icon name="check" size={16} />{doneToday ? `Lu aujourd'hui${streak > 1 ? ` · ${streak} j d'affilée` : ''}` : 'Valider la lecture du jour'}
                </button>
              </div>
              <button class="btn small" style={{ background: 'transparent', color: c.color }} onClick={() => { patchBook(b.id, (x) => { x.status = 'done'; x.page = x.pages; x.finishedAt = t; }); toast(`« ${b.title} » terminé, bravo !`); }}>Marquer comme terminé</button>
            </article>
          );
        })}
      </section>

      {todo.length > 0 && (
        <section class="col" style={{ gap: '8px' }}>
          <h2 class="h2">À lire ensuite</h2>
          {todo.map((b) => {
            const c = BOOK_CATS[b.cat] || BOOK_CATS.autre;
            return (
              <div class="card tight" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Cover b={b} w={34} h={50} />
                <button class="col grow" style={{ gap: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: 'var(--ink)' }} onClick={() => setEdit(b)}><span class="b" style={{ fontSize: '15px' }}>{b.title}</span><span class="small muted">{b.author} · {c.name}</span></button>
                <button class="btn small" style={{ background: `${c.color}22`, color: c.color }} onClick={() => patchBook(b.id, (x) => { x.status = 'reading'; })}>Commencer</button>
              </div>
            );
          })}
        </section>
      )}

      {done.length > 0 && (
        <section class="col" style={{ gap: '8px' }}>
          <h2 class="h2">Terminés</h2>
          {done.map((b) => (
            <button class="row" style={{ border: 0, background: 'transparent', padding: '4px 2px', textAlign: 'left', color: 'var(--ink)' }} onClick={() => setEdit(b)}>
              <span class="check" style={{ background: (BOOK_CATS[b.cat] || BOOK_CATS.autre).color, borderColor: 'transparent' }}><Icon name="check" size={15} /></span>
              <span class="col grow" style={{ gap: 0 }}><span class="b sm">{b.title}</span><span class="small muted">{b.author}{b.finishedAt ? ` · terminé le ${fmtDay(b.finishedAt)}` : ''}</span></span>
            </button>
          ))}
        </section>
      )}

      {edit && <BookSheet initial={edit} onClose={() => setEdit(null)} />}
      {goalEdit && (
        <Sheet title="Défi de l'année" onClose={() => setGoalEdit(false)}>
          <Field label="Nombre de livres à lire cette année"><input class="input" inputMode="numeric" value={s.bookGoal} onInput={(e) => update((d) => { d.bookGoal = Math.max(1, Math.round(num(e.target.value)) || 1); })} /></Field>
          <button class="btn accent block" onClick={() => setGoalEdit(false)}>OK</button>
        </Sheet>
      )}
    </div>
  );
};
