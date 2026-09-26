import type { CatKey, Lang } from '../data/types';
import { CATS, catColours, type Labels } from '../i18n';
import { pct, sortCards, type Card } from '../model';
import { IconSearch } from '../components/Icons';
import { SpeciesCard } from '../components/SpeciesCard';

interface Props {
  cards: Card[];
  L: Labels;
  lang: Lang;
  setLang: (l: Lang) => void;
  onSearch: () => void;
  onCollection: () => void;
  onCategory: (cat: CatKey) => void;
  onOpen: (id: string) => void;
}

export function Home({ cards, L, lang, setLang, onSearch, onCollection, onCategory, onOpen }: Props) {
  const spotted = cards.filter((c) => c.unlocked);
  const recent = sortCards(spotted, 'recent').slice(0, 6);
  const li = lang === 'es' ? 'es' : 'en';

  return (
    <div className="screen" style={{ gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent-700)' }}>{L.greeting}</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 30, lineHeight: 1.05, textWrap: 'balance' }}>{L.homeTitle}</h1>
        </div>
        <div className="lang" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} aria-pressed={lang === 'es'} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>

      <button className="fake-search" onClick={onSearch}>
        <IconSearch size={18} />
        {L.searchPh}
      </button>

      <button className="hero" onClick={onCollection}>
        <span className="hero-c1" />
        <span className="hero-c2" />
        <div className="hero-k">{L.progressTitle}</div>
        <div className="hero-n">
          <span className="hero-big">{spotted.length}</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {L.of} {cards.length} {L.spottedWord}
          </span>
        </div>
        <div className="hero-bar">
          <div style={{ width: pct(spotted.length, cards.length) }} />
        </div>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 20 }}>{L.byCat}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CATS.map((c) => {
            const list = cards.filter((x) => x.catKey === c.key);
            const done = list.filter((x) => x.unlocked).length;
            const k = catColours(c.h);
            return (
              <button key={c.key} className="cat-row" onClick={() => onCategory(c.key)}>
                <span className="cat-circle" style={{ background: k.tintStrong, color: k.deep }}>{done}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                    <span>{c[li]}</span>
                    <span style={{ fontWeight: 400, color: 'var(--color-neutral-700)' }}>
                      {done}/{list.length}
                    </span>
                  </span>
                  <span className="bar6">
                    <span style={{ background: k.col, width: pct(done, list.length) }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {recent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>{L.recent}</h3>
            <button className="btn btn-ghost" onClick={onCollection} style={{ fontSize: 13 }}>
              {L.seeAll}
            </button>
          </div>
          <div className="carousel no-scrollbar">
            {recent.map((c) => (
              <SpeciesCard key={c.id} c={c} L={L} scale={0.55} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
