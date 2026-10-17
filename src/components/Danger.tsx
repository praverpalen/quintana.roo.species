import type { DangerTag, Detail, Lang } from '../data/types';
import type { Labels } from '../i18n';
import { GUIDES } from '../firstAid';

/** Short label for the card: only "Can kill" is red; lower levels say how it hurts you. */
export function dangerLabel(d: DangerTag, L: Labels): string {
  return d.l === 3 ? L.tagDeadly : d.k === 'touch' ? L.tagPoisonous : L.tagVenomous;
}

/** Pill on the card photo. Harmless lookalikes (level 0) get none. */
export function DangerPill({ d, L }: { d?: DangerTag; L: Labels }) {
  if (!d || d.l === 0) return null;
  return (
    <span className={`sc-danger dl-${d.l}`}>
      <span aria-hidden="true">{d.l === 3 ? '☠' : '⚠'}</span>
      {dangerLabel(d, L)}
    </span>
  );
}

/** "Danger to people" on the species page: level scale, how fast, who is most at risk, and first aid. */
export function DangerBox({ d, info, L, lang }: { d: DangerTag; info?: Detail['danger']; L: Labels; lang: Lang }) {
  const li = lang === 'es' ? 1 : 0;
  const pick = (p?: [string, string]) => (p ? p[li] || p[1 - li] : '');
  const guide = info?.guide ? GUIDES[lang][info.guide] : undefined;
  const kind = d.l === 0 ? L.kindNone : d.k === 'bite' ? L.kindBite : d.k === 'sting' ? L.kindSting : L.kindTouch;
  const todo = d.k === 'bite' ? L.doBite : d.k === 'sting' ? L.doSting : L.doTouch;
  const speed = pick(info?.speed);
  const risk = pick(info?.risk);

  return (
    <section className={`danger-box dl-${d.l}`} aria-label={L.dangerTitle}>
      <div className="danger-head">
        <span className="danger-sym" aria-hidden="true">{d.l === 3 ? '☠' : d.l === 0 ? '✓' : '⚠'}</span>
        <div>
          <h4 style={{ margin: 0 }}>{L.dangerTitle}</h4>
          <div className="danger-kind">{kind}</div>
        </div>
      </div>

      <div className="danger-scale" role="img" aria-label={`${L.dangerTitle}: ${L.dangerLevels[d.l]}`}>
        {L.dangerLevels.map((label, i) => (
          <span key={label} className={`danger-step dl-${i}` + (i === d.l ? ' on' : '')}>
            {label}
          </span>
        ))}
      </div>

      {speed && <p className="danger-speed">{speed}</p>}
      {risk && (
        <p className="danger-risk">
          <b>{L.riskTitle}:</b> {risk}
        </p>
      )}

      {guide && (
        <details className="first-aid" open={d.l === 3}>
          <summary>
            {todo} · {guide.title}
          </summary>
          <ol>
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {guide.dont && (
            <>
              <div className="fa-k">{L.dontTitle}</div>
              <ul className="fa-dont">
                {guide.dont.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {guide.call911 && (
            <p className="fa-911">
              <b>{L.call911If}</b> {guide.call911}
            </p>
          )}
        </details>
      )}

      {d.l > 0 && (
        <a className="btn call-911" href="tel:911">
          📞 {L.call911}
        </a>
      )}
      {guide && <p className="fa-note">{L.firstAidNote}</p>}
    </section>
  );
}
