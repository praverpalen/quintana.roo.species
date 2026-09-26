import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import raw from './data/species.json';
import type { CatKey, Species } from './data/types';
import { LABELS } from './i18n';
import { buildCards, EMPTY_FILTERS, orderSpecies, type ColSort, type Filters } from './model';
import { usePersisted } from './store';
import { Home } from './screens/Home';
import { CardsScreen } from './screens/Cards';
import { Collection } from './screens/Collection';
import { Detail } from './screens/Detail';
import { TabBar, type Tab } from './components/TabBar';

const SPECIES = orderSpecies(raw as Species[]);

export default function App() {
  const { lang, spotted, setLang, toggleSpotted } = usePersisted();
  const L = LABELS[lang];
  const cards = useMemo(() => buildCards(SPECIES, spotted, lang), [spotted, lang]);

  const [tab, setTab] = useState<Tab>('home');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [colCat, setColCat] = useState<CatKey | 'all'>('all');
  const [colSort, setColSort] = useState<ColSort>('recent');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastDetail, setLastDetail] = useState(SPECIES[0]?.id);
  const [toast, setToast] = useState({ text: '', on: false });

  const scroller = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const go = useCallback((t: Tab, patch?: Partial<Filters>) => {
    setTab(t);
    setDetailId(null);
    if (patch) setFilters((f) => ({ ...f, ...patch }));
    requestAnimationFrame(() => scroller.current && (scroller.current.scrollTop = 0));
  }, []);

  // The detail sheet is a history entry so the phone's back gesture closes it.
  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setLastDetail(id);
    history.pushState({ detail: id }, '');
  }, []);
  const closeDetail = useCallback(() => {
    if (history.state?.detail) history.back();
    else setDetailId(null);
  }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setDetailId(e.state?.detail ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const onToggle = (id: string) => {
    if (toggleSpotted(id)) {
      setToast({ text: L.unlocked, on: true });
      clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, on: false })), 1800);
    }
  };

  const goSearch = () => {
    go('cards');
    setTimeout(() => searchRef.current?.focus(), 60);
  };

  const detailCard = cards.find((c) => c.id === (detailId ?? lastDetail));

  return (
    <div className="shell">
      <div ref={scroller} className="scroller no-scrollbar" aria-hidden={!!detailId}>
        {tab === 'home' && (
          <Home
            cards={cards}
            L={L}
            lang={lang}
            setLang={setLang}
            onSearch={goSearch}
            onCollection={() => go('collection')}
            onCategory={(cat) => go('cards', { cat, status: 'all', q: '' })}
            onOpen={openDetail}
          />
        )}
        {tab === 'cards' && (
          <CardsScreen
            cards={cards}
            L={L}
            lang={lang}
            f={filters}
            setF={(p) => setFilters((f) => ({ ...f, ...p }))}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            searchRef={searchRef}
            onOpen={openDetail}
          />
        )}
        {tab === 'collection' && (
          <Collection cards={cards} L={L} lang={lang} cat={colCat} setCat={setColCat} sort={colSort} setSort={setColSort} onExplore={goSearch} onOpen={openDetail} />
        )}
      </div>
      <TabBar tab={tab} L={L} go={go} />
      <Detail c={detailCard} open={!!detailId} L={L} lang={lang} onClose={closeDetail} onToggle={onToggle} />
      <div className={'toast' + (toast.on ? ' on' : '')} role="status" aria-live="polite">
        {toast.text}
      </div>
    </div>
  );
}
