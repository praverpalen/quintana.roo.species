import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../data/types';
import { COLOURS, HABITATS, IUCN, IUCN_SCALE, type Labels } from '../i18n';
import type { Card } from '../model';
import { useSpeciesPhoto } from '../photos';
import { addMyPhoto, deleteMyPhoto, useBlobUrl, useMyPhotos, type MyPhoto } from '../myPhotos';
import { useDetail } from '../catalog';
import { IconArrowLeft, IconCamera, IconCheck, IconMapPin, IconTrash, IconX } from '../components/Icons';
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
  const det = useDetail(c?.id);
  const photo = useSpeciesPhoto(c?.s, det?.photo, undefined, undefined, { runtime: !!det, size: 'large' });
  const mine = useMyPhotos(c?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<{ url: string; caption: string; own?: MyPhoto } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setViewer(null), [c?.id, open]);

  useEffect(() => {
    if (!open) return;
    if (ref.current) ref.current.scrollTop = 0;
    back.current?.focus({ preventScroll: true });
  }, [open, c?.id]);

  if (!c) return null;
  const s = c.s;
  const pick = (p?: [string, string]) => (p ? p[li] || p[1 - li] : '');
  const fact = pick(det?.fact);
  const desc = pick(det?.desc);
  const hab = det?.hab ?? [];
  const where = det?.where ?? [];
  const credit = photo?.credit ? `${L.photo}: ${photo.credit.attribution} · ${photo.credit.license} · ${photo.credit.source}` : '';
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

        {photo && (
          <div>
            <button className={'d-photo' + (c.unlocked ? '' : ' grey')} onClick={() => setViewer({ url: photo.url, caption: credit })} aria-label={L.enlarge}>
              <img src={photo.url} alt={c.name} loading="lazy" />
            </button>
            {credit && <div className="d-photo-credit">{credit}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0 }}>{L.myPhotos}</h4>
          {mine.length > 0 && (
            <div className="mine-grid">
              {mine.map((m) => (
                <MineThumb key={m.key} m={m} L={L} onOpen={(url) => setViewer({ url, caption: `${L.yourPhoto} · ${m.date}`, own: m })} />
              ))}
            </div>
          )}
          <button className="add-photo" disabled={busy} onClick={() => fileRef.current?.click()}>
            <IconCamera size={18} />
            {L.addPhoto}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setBusy(true);
              try {
                await addMyPhoto(c.id, file);
                if (!c.unlocked) onToggle(c.id);
              } finally {
                setBusy(false);
              }
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{L.photoLocal}</span>
        </div>

        {fact && (
          <div className="callout">
          <div style={{ fontSize: 11, letterSpacing: '.1em', fontWeight: 700, marginBottom: 4, color: c.deep }}>{L.fact}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.3, textWrap: 'pretty' }}>{fact}</div>
          </div>
        )}

        {desc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h4 style={{ margin: 0 }}>{L.about}</h4>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, textWrap: 'pretty' }}>{desc}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div className="stat">
            <div className="stat-k">{L.size}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>{det?.size || '—'}</div>
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

        {s.col.length > 0 && (
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
        )}

        {hab.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ margin: 0 }}>{L.habitat}</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hab.map((h) => (
                <span key={h} className="tag tag-accent-2" style={{ fontSize: 13, padding: '5px 12px', fontWeight: 400 }}>
                  {HABITATS[h][li]}
                </span>
              ))}
            </div>
          </div>
        )}

        {where.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ margin: 0 }}>{L.where}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {where.map((w) => (
                <div key={w} className="where">
                  <IconMapPin size={17} style={{ color: 'var(--color-accent-700)', flex: 'none' }} />
                  {w}
                </div>
              ))}
            </div>
          </div>
        )}

        {det && (det.src !== 'curated' || det.wiki) && (
          <div className="credit" style={{ textAlign: 'left', maxWidth: 'none' }}>
            {det.src === 'claude' && <div>{L.autoNote}</div>}
            {det.wiki && (
              <div>
                {L.text}:{' '}
                {(['en', 'es'] as const)
                  .filter((k) => det.wiki?.[k])
                  .map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' · '}
                      <a href={det.wiki![k]} target="_blank" rel="noreferrer">
                        Wikipedia ({k.toUpperCase()})
                      </a>
                    </span>
                  ))}{' '}
                · CC BY-SA 4.0
              </div>
            )}
          </div>
        )}
      </div>

      {viewer &&
        createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={c.name} onClick={() => setViewer(null)}>
          <button className="lb-close" onClick={() => setViewer(null)} aria-label={L.close}>
            <IconX size={18} />
          </button>
          <img src={viewer.url} alt={c.name} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span style={{ flex: 1 }}>{viewer.caption}</span>
            {viewer.own && (
              <button
                className="lb-btn"
                onClick={async () => {
                  if (!confirm(L.confirmDelete)) return;
                  await deleteMyPhoto(viewer.own!.key);
                  setViewer(null);
                }}
              >
                <IconTrash size={15} /> {L.deletePhoto}
              </button>
            )}
          </div>
        </div>,
          document.querySelector('.shell') ?? document.body,
        )}
    </div>
  );
}

function MineThumb({ m, L, onOpen }: { m: MyPhoto; L: Labels; onOpen: (url: string) => void }) {
  const url = useBlobUrl(m.blob);
  return (
    <button onClick={() => url && onOpen(url)} aria-label={`${L.yourPhoto} ${m.date}`}>
      {url && <img src={url} alt="" />}
    </button>
  );
}
