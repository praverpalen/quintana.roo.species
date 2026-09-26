import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Labels } from '../i18n';
import type { Card } from '../model';
import { usePhoto } from '../photos';
import { useDetail } from '../catalog';
import { IconCheck } from './Icons';

const W = 240;
const H = 340;

interface Props {
  c: Card;
  L: Labels;
  /** Fixed scale (carousel 0.55, detail 0.85) or 'fill' to fit the parent's width (grid). */
  scale: number | 'fill';
  onOpen?: (id: string) => void;
}

/** Design card 1a at 240×340, scaled with CSS zoom so every inner size stays exact. */
export function SpeciesCard({ c, L, scale, onOpen }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.72);

  useLayoutEffect(() => {
    if (scale !== 'fill' || !box.current) return;
    const el = box.current;
    const ro = new ResizeObserver(() => setFit(el.clientWidth / W || 0.72));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale]);

  const z = scale === 'fill' ? fit : scale;
  const open = onOpen ? () => onOpen(c.id) : undefined;
  const onKey = (e: KeyboardEvent) => {
    if (open && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open();
    }
  };
  const label = `${c.name}, ${c.no}, ${c.unlocked ? L.spotted : L.notSpotted}`;

  return (
    <div ref={box} className="card-box" style={scale === 'fill' ? { width: '100%', aspectRatio: `${W} / ${H}` } : { width: W * z, height: H * z }}>
      <div style={{ zoom: z, width: W, height: H }}>
        {c.unlocked ? <Unlocked c={c} L={L} open={open} onKey={onKey} label={label} /> : <Locked c={c} L={L} open={open} onKey={onKey} label={label} />}
      </div>
    </div>
  );
}

interface Inner {
  c: Card;
  L: Labels;
  open?: () => void;
  onKey: (e: KeyboardEvent) => void;
  label: string;
}

function tilt(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType === 'touch') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.transform = `perspective(700px) rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 14}deg) scale(1.03)`;
  el.style.setProperty('--mx', x * 100 + '%');
  el.style.setProperty('--my', y * 100 + '%');
  el.style.setProperty('--o', '1');
}
function untilt(e: PointerEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.style.transform = '';
  el.style.setProperty('--o', '0');
}

function Unlocked({ c, L, open, onKey, label }: Inner) {
  const detail = useDetail(c.id);
  const photo = usePhoto(c.sci, detail?.photo, !!detail);
  const li = L.lang === 'es' ? 1 : 0;
  const fact = detail ? detail.fact[li] || detail.fact[1 - li] : '';
  const size = detail?.size || '—';
  return (
    <div className="sc sc-foil" role="button" tabIndex={0} aria-label={label} onClick={open} onKeyDown={onKey} onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="sc-in" style={{ background: c.tint }}>
        <div className="sc-top">
          <span className="sc-name" style={{ color: c.deep }}>{c.name}</span>
          <span className="sc-size">
            <span className="sc-size-k" style={{ color: c.deep }}>{L.sizeShort}</span>
            <span className="sc-size-v" style={{ color: c.deep }}>{size}</span>
          </span>
        </div>
        <div className="sc-sci">{c.sci}</div>
        <div className="sc-art" style={{ background: `repeating-linear-gradient(135deg, ${c.stripe} 0 6px, transparent 6px 12px), var(--color-neutral-100)` }}>
          {photo ? (
            <img className="washed" src={photo.url} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="sc-art-label">{c.name.toLowerCase()} photo</span>
          )}
        </div>
        <div className="sc-meta">
          <span className="sc-no">{c.no} · {c.cat}</span>
          <span className={'sc-origin ' + (c.native ? 'is-native' : 'is-intro')}>{c.origin}</span>
        </div>
        <div className="sc-iucn">
          <span className="sc-iucn-badge" style={{ background: c.deep }}>{c.iucn}</span>
          <span>{c.iucnLabel}</span>
        </div>
        <div className="sc-fact">
          <div className="sc-fact-k" style={{ color: c.deep }}>{L.fact}</div>
          <div className="sc-fact-v">{fact}</div>
        </div>
        <div className="sc-foot">
          <span className="sc-rar">
            <Dots n={c.n} on={c.deep} />
            <span className="sc-rar-v" style={{ color: c.deep }}>{c.rarity}</span>
          </span>
          <span className="sc-spotted" style={{ background: c.deep }}>
            <IconCheck size={11} sw={3.5} />
            {L.spotted}
          </span>
        </div>
      </div>
      <div className="sc-shine" />
    </div>
  );
}

function Locked({ c, L, open, onKey, label }: Inner) {
  return (
    <div className="sc sc-locked" role="button" tabIndex={0} aria-label={label} onClick={open} onKeyDown={onKey}>
      <div className="sc-in">
        <div className="sc-top">
          <span className="sc-name">{c.name}</span>
          <span className="sc-size-v sc-q">?</span>
        </div>
        <div className="sc-sci">{c.sci}</div>
        <div className="sc-art sc-art-locked">
          <span className="sc-art-q">?</span>
        </div>
        <div className="sc-no">{c.no} · {c.cat}</div>
        <div className="sc-unlock">{L.unlock}</div>
        <div className="sc-foot">
          <Dots n={c.n} on="var(--color-neutral-600)" />
          <span className="sc-not">{L.notSpotted}</span>
        </div>
      </div>
    </div>
  );
}

export function Dots({ n, on, size = 7, gap = 3 }: { n: number; on: string; size?: number; gap?: number }) {
  return (
    <span style={{ display: 'flex', gap }}>
      {[0, 1, 2, 3].map((k) => (
        <span key={k} style={{ width: size, height: size, borderRadius: '50%', background: k <= n ? on : 'var(--color-neutral-300)' }} />
      ))}
    </span>
  );
}
