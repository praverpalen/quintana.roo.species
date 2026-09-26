import { useDeferredValue, useMemo, type RefObject } from 'react';
import type { ColourKey, Lang } from '../data/types';
import { ANY_SWATCH, CATS, COLOURS, catColours, type Labels } from '../i18n';
import { anyFilter, colourName, EMPTY_FILTERS, filterCards, panelFilterCount, type Card, type Filters, type Origin, type Sort, type Status } from '../model';
import { IconSearch, IconSliders, IconX } from '../components/Icons';
import { SpeciesCard } from '../components/SpeciesCard';
import { Paged } from '../components/Paged';

interface Props {
  cards: Card[];
  L: Labels;
  lang: Lang;
  f: Filters;
  setF: (p: Partial<Filters>) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  searchRef: RefObject<HTMLInputElement>;
  onOpen: (id: string) => void;
}

export function CardsScreen({ cards, L, lang, f, setF, showFilters, setShowFilters, searchRef, onOpen }: Props) {
  const li = lang === 'es' ? 1 : 0;
  // Filtering thousands of cards on every keystroke is deferred so typing never lags.
  const deferred = useDeferredValue(f);
  const grid = useMemo(() => filterCards(cards, deferred), [cards, deferred]);
  const nFilt = panelFilterCount(f);
  const pill = (on: boolean) => 'pill-btn ' + (on ? 'on' : 'off');

  const chips = [{ key: 'all' as const, label: L.all, dot: 'var(--color-neutral-500)' }, ...CATS.map((c) => ({ key: c.key, label: li ? c.es : c.en, dot: catColours(c.h).col }))];
  const statuses: [Status, string][] = [['all', L.all], ['spotted', L.spottedF], ['unspotted', L.toFind]];
  const origins: [Origin, string][] = [['all', L.all], ['native', L.native], ['introduced', L.introduced]];
  const sorts: [Sort, string][] = [['no', L.number], ['name', 'A–Z'], ['rarity', L.rarity]];
  const colours: [ColourKey | 'all', string, string][] = [['all', L.any, ANY_SWATCH], ...(Object.entries(COLOURS) as [ColourKey, [string, string, string]][]).map(([k, v]) => [k, v[li], v[2]] as [ColourKey, string, string])];

  return (
    <div className="screen" style={{ gap: 12 }}>
      <h1>{L.cardsTitle}</h1>

      <div className="search">
        <IconSearch size={18} />
        <input ref={searchRef} className="input" type="search" enterKeyHint="search" value={f.q} onChange={(e) => setF({ q: e.target.value })} placeholder={L.searchPh} aria-label={L.searchPh} />
        {f.q && (
          <button className="search-clear" onClick={() => setF({ q: '' })} aria-label={L.clearSearch}>
            <IconX size={14} />
          </button>
        )}
      </div>

      <div className="chips no-scrollbar">
        {chips.map((ch) => (
          <button key={ch.key} className={pill(f.cat === ch.key) + ' chip'} aria-pressed={f.cat === ch.key} onClick={() => setF({ cat: ch.key })}>
            <span className="chip-dot" style={{ background: ch.dot }} />
            {ch.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="seg" style={{ flex: 1 }}>
          {statuses.map(([k, label]) => (
            <button key={k} className={'seg-btn' + (f.status === k ? ' on' : '')} aria-pressed={f.status === k} style={{ flex: 1, height: 32 }} onClick={() => setF({ status: k })}>
              {label}
            </button>
          ))}
        </div>
        <button className={'filt-btn' + (showFilters || nFilt ? ' on' : '')} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
          <IconSliders size={15} />
          {nFilt ? `${L.filters} · ${nFilt}` : L.filters}
        </button>
      </div>

      {showFilters && (
        <div className="panel">
          <div className="panel-group">
            <span className="section-k">{L.origin}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {origins.map(([k, label]) => (
                <button key={k} className={pill(f.origin === k)} aria-pressed={f.origin === k} onClick={() => setF({ origin: k })}>{label}</button>
              ))}
            </div>
          </div>
          <div className="panel-group">
            <span className="section-k">
              {L.colour}{' '}
              <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600, color: 'var(--color-text)' }}>· {f.color === 'all' ? L.any : colourName(f.color, lang)}</span>
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colours.map(([k, label, sw]) => (
                <button key={k} className={'swatch' + (f.color === k ? ' on' : '')} title={label} aria-label={label} aria-pressed={f.color === k} style={{ background: sw }} onClick={() => setF({ color: k })} />
              ))}
            </div>
          </div>
          <div className="panel-group">
            <span className="section-k">{L.sort}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sorts.map(([k, label]) => (
                <button key={k} className={pill(f.sort === k)} aria-pressed={f.sort === k} onClick={() => setF({ sort: k })}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--color-neutral-700)', minHeight: 34 }}>
        <span aria-live="polite">
          {grid.length} {L.results}
        </span>
        {anyFilter(f) && (
          <button className="btn btn-ghost" onClick={() => setF(EMPTY_FILTERS)} style={{ fontSize: 13 }}>
            {L.clear}
          </button>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Paged items={grid} resetKey={JSON.stringify(deferred)} label={L.showMore} render={(c) => <SpeciesCard key={c.id} c={c} L={L} scale="fill" onOpen={onOpen} />} />
      </div>

      {grid.length === 0 && (
        <div className="empty">
          <span className="empty-q">?</span>
          <span className="empty-msg">{L.empty}</span>
          <button className="btn btn-secondary" onClick={() => setF(EMPTY_FILTERS)}>
            {L.clear}
          </button>
        </div>
      )}
    </div>
  );
}
