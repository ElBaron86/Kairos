// Cadran de 24 heures : chaque événement est un arc coloré.
import { useEffect, useState } from 'preact/hooks';
import { EVENT_CATS } from '../data/catalog.js';
import { nowH, toH } from '../lib/util.js';

export const useDark = () => {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [dark, set] = useState(q ? q.matches : false);
  useEffect(() => {
    if (!q) return undefined;
    const on = (e) => set(e.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return dark;
};

export const catColor = (cat, dark) => {
  const c = EVENT_CATS[cat] || EVENT_CATS.perso;
  return dark ? c.night : c.color;
};

/** Heure actuelle, rafraîchie chaque minute. */
export const useNow = () => {
  const [h, set] = useState(nowH());
  useEffect(() => { const id = setInterval(() => set(nowH()), 30000); return () => clearInterval(id); }, []);
  return h;
};

const R = 118, CX = 150, CY = 150;
const pt = (h, r = R) => {
  const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const arc = (s, e) => {
  const [x1, y1] = pt(s);
  const [x2, y2] = pt(e);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 ${e - s > 12 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

/**
 * @param {{events: object[], size?: number, now?: number|null, selected?: number|null, onPick?: Function,
 *          width?: number, track?: string, ticks?: boolean, children?: any}} props
 */
export const Dial = ({ events, size = 300, now = null, selected = null, onPick, width = 24, track = 'var(--line-soft)', ticks = true, children }) => {
  const dark = useDark();
  const tickList = ticks ? Array.from({ length: 24 }, (_, h) => {
    const major = h % 6 === 0;
    const [x1, y1] = pt(h, 98);
    const [x2, y2] = pt(h, major ? 90 : 95);
    return { x1, y1, x2, y2, w: major ? 2.5 : 1.5 };
  }) : [];
  const inner = size * (ticks ? 0.42 : 0.5);
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 300 300" role="img" aria-label={`Cadran de la journée : ${events.length} événement${events.length > 1 ? 's' : ''}`} style={{ position: 'absolute', inset: 0 }}>
        <circle cx="150" cy="150" r={R} style={{ fill: 'none', stroke: track, strokeWidth: width + 6 }} />
        <path d={`${arc(22.5, 23.99)} ${arc(0, 6.5)}`} style={{ fill: 'none', stroke: 'var(--line)', strokeWidth: width + 6, opacity: 0.55 }} />
        {tickList.map((t) => <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} style={{ stroke: 'var(--faint)', strokeWidth: t.w, strokeLinecap: 'round', opacity: 0.6 }} />)}
        {ticks && [0, 6, 12, 18].map((h) => { const [x, y] = pt(h, 79); return <text x={x} y={y} text-anchor="middle" dominant-baseline="middle" style={{ fill: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>{String(h).padStart(2, '0')}h</text>; })}
        {events.map((e, i) => {
          const s = toH(e.start);
          let en = toH(e.end);
          if (en <= s) en = Math.min(24, s + 0.5);
          return (
            <path d={arc(s + 0.1, Math.max(s + 0.2, en - 0.1))} stroke={catColor(e.cat, dark)} onClick={onPick ? () => onPick(i) : undefined}
              style={{ fill: 'none', strokeWidth: selected === i ? width + 10 : width, strokeLinecap: 'round', cursor: onPick ? 'pointer' : 'default', transition: 'stroke-width .2s' }} />
          );
        })}
        {now != null && (() => {
          const [x, y] = pt(now);
          return <>
            {ticks && <line x1="150" y1="150" x2={x} y2={y} style={{ stroke: 'var(--ink)', strokeWidth: 2, strokeDasharray: '3 5' }} />}
            <circle cx={x} cy={y} r={ticks ? 9 : 13} style={{ fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 4 }} />
          </>;
        })()}
      </svg>
      {children && (
        <div style={{ position: 'absolute', left: `${(size - inner) / 2}px`, top: `${(size - inner) / 2}px`, width: `${inner}px`, height: `${inner}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '4px', pointerEvents: 'none' }}>
          {children}
        </div>
      )}
    </div>
  );
};
