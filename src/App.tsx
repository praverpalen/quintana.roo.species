import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Catalog, CatKey } from './data/types';
import { LABELS } from './i18n';
import { buildCards, EMPTY_FILTERS, type ColSort, type Filters } from './model';
import { useCatalog } from './catalog';
import { buildBackup, readBackup, saveBackup } from './backup';
import { importMyPhotos } from './myPhotos';
import { fmtDate } from './i18n';
import { usePersisted } from './store';
import { Home } from './screens/Home';
import { CardsScreen } from './screens/Cards';
import { Collection } from './screens/Collection';
import { Detail } from './screens/Detail';
import { TabBar, type Tab } from './components/TabBar';

export default function App() {
  const persisted = usePersisted();
  const { catalog, error, retry } = useCatalog();
  const L = LABELS[persisted.lang];
  if (!catalog) {
    return (
      <div className="shell">
        <div className="empty" style={{ margin: 'auto' }}>
          <span className="empty-q">{error ? '!' : '?'}</span>
          <span className="empty-msg">{error ? L.loadError : L.loading}</span>
          {error && (
            <button className="btn btn-secondary" onClick={retry}>
              {L.retry}
            </button>
          )}
        </div>
      </div>
    );
  }
  return <Explorer catalog={catalog} {...persisted} />;
}

function Explorer({ catalog, lang, spotted, setLang, toggleSpotted, mergeSpotted }: { catalog: Catalog } & ReturnType<typeof usePersisted>) {
  const L = LABELS[lang];
  const cards = useMemo(() => buildCards(catalog.species, spotted, lang), [catalog, spotted, lang]);

  const [tab, setTab] = useState<Tab>('home');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [colCat, setColCat] = useState<CatKey | 'all'>('all');
  const [colSort, setColSort] = useState<ColSort>('recent');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastDetail, setLastDetail] = useState(catalog.species[0]?.id);
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

  const showToast = (text: string, ms = 1800) => {
    setToast({ text, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, on: false })), ms);
  };
  const onToggle = (id: string) => {
    if (toggleSpotted(id)) showToast(L.unlocked);
  };

  const onExport = async () => {
    try {
      const ok = await saveBackup(await buildBackup(spotted, lang));
      if (ok) showToast(L.exported);
      return ok;
    } catch {
      showToast(L.exportFail, 3000);
      return false;
    }
  };
  const onImport = async (file: File) => {
    let b;
    try {
      b = await readBackup(file);
    } catch {
      showToast(L.importBad, 3000);
      return;
    }
    const newSpotted = Object.keys(b.spotted).filter((id) => !spotted[id]).length;
    const msg = L.importConfirm.replace('{date}', fmtDate(b.exported.slice(0, 10), lang)).replace('{spotted}', String(newSpotted)).replace('{photos}', String(b.photos.length));
    if (!confirm(msg)) return;
    const s = mergeSpotted(b.spotted);
    const p = await importMyPhotos(b.photos);
    showToast(L.imported.replace('{spotted}', String(s)).replace('{photos}', String(p)), 2600);
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
          <Collection cards={cards} L={L} lang={lang} cat={colCat} setCat={setColCat} sort={colSort} setSort={setColSort} onExplore={goSearch} onOpen={openDetail} onExport={onExport} onImport={onImport} />
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
