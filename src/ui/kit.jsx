// Composants d'interface réutilisables.
import { useEffect, useState } from 'preact/hooks';
import { Icon } from './icons.jsx';

/** Navigation par ancre (#/agenda…), compatible avec un hébergement statique. */
export const useRoute = () => {
  const read = () => (location.hash.replace(/^#/, '') || '/');
  const [r, set] = useState(read());
  useEffect(() => {
    const on = () => { set(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
};
export const go = (path) => { location.hash = path; };

/** Feuille qui monte du bas de l'écran. */
export const Sheet = ({ title, onClose, children }) => {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span class="grip" />
        <div class="row between">
          <h2 class="h2" style={{ fontSize: '22px' }}>{title}</h2>
          <button class="icon-btn" aria-label="Fermer" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

/** Anneau de progression. */
export const Ring = ({ value, max, size = 76, stroke = 7, color = '#FFFFFF', track = 'rgba(255,255,255,0.22)', children }) => {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const v = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} style={{ fill: 'none', stroke: track, strokeWidth: stroke }} />
        <circle cx={size / 2} cy={size / 2} r={r} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeDasharray: `${(v * c).toFixed(1)} ${c.toFixed(1)}`, transition: 'stroke-dasharray .5s ease' }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
    </div>
  );
};

export const Bar = ({ value, color = 'var(--accent)', height = 8, track }) => (
  <div class="bar" style={{ height: `${height}px`, background: track }}><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>
);

const TABS = [
  { href: '/', label: 'Accueil', icon: 'home', match: (r) => r === '/' || r.startsWith('/reglages') },
  { href: '/agenda', label: 'Agenda', icon: 'calendar' },
  { href: '/budget', label: 'Budget', icon: 'wallet' },
  { href: '/lecture', label: 'Lecture', icon: 'book' },
  { href: '/progres', label: 'Progrès', icon: 'grow' },
  { href: '/rappels', label: 'Rappels', icon: 'bell' }
];

export const TabBar = ({ route }) => (
  <nav class="tabbar" aria-label="Navigation principale">
    {TABS.map((t) => {
      const on = t.match ? t.match(route) : route.startsWith(t.href);
      return (
        <a href={'#' + t.href} class={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </a>
      );
    })}
  </nav>
);

/** En-tête de page avec bouton retour optionnel. */
export const Header = ({ kicker, title, serif, back, right }) => (
  <header class="row between" style={{ alignItems: 'flex-end' }}>
    <div class="row" style={{ alignItems: 'center' }}>
      {back && <a class="icon-btn" href={'#' + back} aria-label="Retour"><Icon name="left" /></a>}
      <div class="col" style={{ gap: '2px' }}>
        {kicker && <span class="kicker">{kicker}</span>}
        <h1 class={'h1' + (serif ? ' serif' : '')}>{title}</h1>
      </div>
    </div>
    {right}
  </header>
);

// Petit système de notifications dans l'application.
let pushToast = () => {};
export const toast = (msg) => pushToast(msg);
export const Toaster = () => {
  const [msg, set] = useState(null);
  useEffect(() => {
    let t;
    pushToast = (m) => { set(m); clearTimeout(t); t = setTimeout(() => set(null), 3200); };
  }, []);
  return msg ? <div class="toast" role="status">{msg}</div> : null;
};

/** Bouton de suppression qui demande une seconde pression. */
export const DeleteButton = ({ onConfirm, label = 'Supprimer' }) => {
  const [armed, set] = useState(false);
  return (
    <button class="btn danger block" onClick={() => (armed ? onConfirm() : set(true))}>
      <Icon name="trash" size={18} />{armed ? 'Appuyez encore pour confirmer' : label}
    </button>
  );
};

export const Field = ({ label, hint, children }) => (
  <label class="field">{label}{hint && <span class="hint">{hint}</span>}{children}</label>
);
