import { useEffect, useRef } from 'react';
import type { Lang } from '../data/types';
import { COLOURS, HABITATS, IUCN, IUCN_SCALE, type Labels } from '../i18n';
import type { Card } from '../model';
import { usePhoto } from '../photos';
import { IconArrowLeft, IconCheck, IconMapPin } from '../components/Icons';
import { Dots, SpeciesCard } from '../components/SpeciesCard';

interface Props {
  c: Card | undefined;
  open: boolean;
  L: Labels;
  lang: Lang;
  onClose: () => void;
  onToggle: (id: string) => void;
}

export function Detail({ c, open, L, lang, onClose, onToggle }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const li = lang === 'es' ? 1 : 0;
  const photo = usePhoto(c?.s, !!c?.unlocked);

  useEffect(() => {
    if (!open) return;
    if (ref.current) ref.current.scrollTop = 0;
    back.current?.focus({ preventScroll: true });
  }, [open, c?.id]);

  if (!c) return null;
  const s = c.s;
  const statusNote = s.iucn === 'NE' ? L.notEvaluated : IUCN[s.iucn][li] + L.onRedList;

  return (
    <div ref={ref} className={'detail no-scrollbar' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label={c.name} aria-hidden={!open}>
      <div className="d-hero" style={{ background: c.tint }}>
        <span className="d-hero-c1" style={{ background: c.col }} />
        <span className="d-hero-c2" style={{ background: c.col }} />
        <button ref={back} className="back" onClick={onClose} aria-label={L.back}>
          <IconArrowLeft size={20} />
        </button>
        <div style={{ position: 'relative' }}>
          <SpeciesCard c={c} L={L} scale={0.85} />
        </div>
        {c.unlocked && photo && (
          <div className="credit">
            {L.photo}: {photo.attribution} · {photo.license} · {photo.source}
          </div>
        )}
      </div>

      <div className="d-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="d-no">
            {c.no} · {c.cat}
          </div>
          <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.05, color: c.deep }}>{c.name}</h2>
          <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--color-neutral-700)' }}>
            {c.sci}
            {s.maya ? ` · Maya: ${s.maya}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <span className={'tag ' + (c.native ? 'is-native' : 'is-intro')}>{c.origin}</span>
            <span className="tag tag-neutral">{c.rarity}</span>
            <span className="tag tag-neutral">
              {c.iucn} · {c.iucnLabel}
            </span>
          </div>
        </div>

        {c.unlocked ? (
          <div className="spotted-bar">
            <span className="spotted-check">
              <IconCheck size={16} sw={3.5} />
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {L.spottedOn}
              {c.spottedOn}
            </span>
            <button className="btn btn-ghost" onClick={() => onToggle(c.id)} style={{ fontSize: 13, color: 'var(--color-accent-2-800)' }}>
              {L.undo}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => onToggle(c.id)} style={{ height: 52, fontSize: 17, gap: 8 }}>
              <IconCheck size={19} sw={3} />
              {L.markSpotted}
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--color-neutral-700)', textAlign: 'center' }}>{L.notYet}</span>
          </div>
        )}

        <div className="callout">
          <div style={{ fontSize: 11, letterSpacing: '.1em', fontWeight: 700, marginBottom: 4, color: c.deep }}>{L.fact}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.3, textWrap: 'pretty' }}>{c.fact}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h4 style={{ margin: 0 }}>{L.about}</h4>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, textWrap: 'pretty' }}>{c.desc}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div className="stat">
            <div className="stat-k">{L.size}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>{c.size}</div>
          </div>
          <div className="stat">
            <div className="stat-k">{L.rarity}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Dots n={c.n} on={c.deep} size={10} gap={4} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{c.rarity}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0 }}>{L.status}</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {IUCN_SCALE.map((code) => {
              const on = code === s.iucn;
              return (
                <span
                  key={code}
                  className="scale"
                  title={IUCN[code][li]}
                  style={{ background: on ? c.deep : 'var(--color-neutral-200)', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-600)', transform: on ? 'scale(1.08)' : 'none' }}
                >
                  {code}
                </span>
              );
            })}
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{statusNote}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0 }}>{L.colours}</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {s.col.map((k) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--color-neutral-100)', boxShadow: 'var(--shadow-sm)', background: COLOURS[k][2] }} />
                {COLOURS[k][li]}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0 }}>{L.habitat}</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.hab.map((h) => (
              <span key={h} className="tag tag-accent-2" style={{ fontSize: 13, padding: '5px 12px', fontWeight: 400 }}>
                {HABITATS[h][li]}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0 }}>{L.where}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {s.where.map((w) => (
              <div key={w} className="where">
                <IconMapPin size={17} style={{ color: 'var(--color-accent-700)', flex: 'none' }} />
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
