import type { CatKey, Lang } from '../data/types';
import { CATS, catColours, type Labels } from '../i18n';
import { sortCards, type Card, type ColSort } from '../model';
import { SpeciesCard } from '../components/SpeciesCard';

interface Props {
  cards: Card[];
  L: Labels;
  lang: Lang;
  cat: CatKey | 'all';
  setCat: (c: CatKey | 'all') => void;
  sort: ColSort;
  setSort: (s: ColSort) => void;
  onExplore: () => void;
  onOpen: (id: string) => void;
}

export function Collection({ cards, L, lang, cat, setCat, sort, setSort, onExplore, onOpen }: Props) {
  const spotted = cards.filter((c) => c.unlocked);
  const chips = [
    { key: 'all' as const, label: L.all, dot: 'var(--color-neutral-500)', count: spotted.length },
    ...CATS.map((c) => ({ key: c.key, label: lang === 'es' ? c.es : c.en, dot: catColours(c.h).col, count: spotted.filter((x) => x.catKey === c.key).length })),
  ].filter((c) => c.key === 'all' || c.count > 0);
  // If the selected category has no spotted cards left (after an undo), fall back to All.
  const activeCat = chips.some((c) => c.key === cat) ? cat : 'all';
  const list = sortCards(spotted.filter((c) => activeCat === 'all' || c.catKey === activeCat), sort);
  const sorts: [ColSort, string][] = [['recent', L.recentSort], ['name', 'A–Z'], ['rarity', L.rarity]];

  return (
    <div className="screen" style={{ gap: 14 }}>
      <div>
        <h1>{L.colTitle}</h1>
        <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
          {spotted.length} {L.of} {cards.length} {L.spottedWord}
        </div>
      </div>

      <div className="chips no-scrollbar">
        {chips.map((ch) => (
          <button key={ch.key} className={'pill-btn chip ' + (activeCat === ch.key ? 'on' : 'off')} aria-pressed={activeCat === ch.key} onClick={() => setCat(ch.key)}>
            <span className="chip-dot" style={{ background: ch.dot }} />
            {ch.label} <span style={{ opacity: 0.7 }}>{ch.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-700)' }}>{L.sort}</span>
        <div className="seg">
          {sorts.map(([k, label]) => (
            <button key={k} className={'seg-btn' + (sort === k ? ' on' : '')} aria-pressed={sort === k} style={{ height: 30, padding: '0 13px' }} onClick={() => setSort(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 12px' }}>
        {list.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <SpeciesCard c={c} L={L} scale="fill" onOpen={onOpen} />
            <span style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', paddingLeft: 4 }}>{c.spottedOn}</span>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="empty">
          <span className="empty-q">?</span>
          <span className="empty-msg">{L.colEmpty}</span>
          <button className="btn btn-primary" onClick={onExplore}>
            {L.explore}
          </button>
        </div>
      )}
    </div>
  );
}
