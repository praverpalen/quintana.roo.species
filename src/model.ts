import type { CatKey, ColourKey, IndexEntry, Lang } from './data/types';
import { CATS, COLOURS, IUCN, RARITY, catColours, fmtDate } from './i18n';

export type Spotted = Record<string, string>;
export type Status = 'all' | 'spotted' | 'unspotted';
export type Origin = 'all' | 'native' | 'introduced';
export type Sort = 'no' | 'name' | 'rarity';
export type ColSort = 'recent' | 'name' | 'rarity';

/** Everything a card face or list needs, already localised. Text content lives in the lazily loaded Detail. */
export interface Card {
  id: string;
  s: IndexEntry;
  no: string;
  name: string;
  sci: string;
  cat: string;
  catKey: CatKey;
  n: number;
  rarity: string;
  iucn: IndexEntry['iucn'];
  iucnLabel: string;
  native: boolean;
  origin: string;
  unlocked: boolean;
  spottedISO: string;
  spottedOn: string;
  col: string;
  deep: string;
  tint: string;
  stripe: string;
}

const catBy = Object.fromEntries(CATS.map((c) => [c.key, c])) as Record<CatKey, (typeof CATS)[number]>;

/** Entries arrive from the catalog already in card-number order. */
export function buildCards(entries: IndexEntry[], spotted: Spotted, lang: Lang): Card[] {
  const li = lang === 'es' ? 1 : 0;
  const width = Math.max(3, String(entries.length).length);
  return entries.map((s, idx) => {
    const c = catBy[s.cat];
    const iso = spotted[s.id] || '';
    return {
      id: s.id, s, no: '#' + String(idx + 1).padStart(width, '0'), name: s[lang], sci: s.sci, cat: c.one[li], catKey: s.cat,
      n: s.n, rarity: RARITY[lang][s.n], iucn: s.iucn, iucnLabel: IUCN[s.iucn][li],
      native: !!s.nat, origin: s.nat ? (li ? 'Nativa' : 'Native') : (li ? 'Introducida' : 'Introduced'),
      unlocked: !!iso, spottedISO: iso, spottedOn: iso ? fmtDate(iso, lang) : '',
      ...catColours(c.h),
    };
  });
}

/** Lower-case and strip accents so "tucan" finds "Tucán". */
export const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Normalised search text per species, computed once.
const hay = new WeakMap<IndexEntry, string>();
function haystack(s: IndexEntry): string {
  let h = hay.get(s);
  if (h == null) hay.set(s, (h = [s.en, s.es, s.sci, s.maya ?? ''].map(norm).join('|')));
  return h;
}

export interface Filters {
  q: string;
  cat: CatKey | 'all';
  status: Status;
  origin: Origin;
  color: ColourKey | 'all';
  sort: Sort;
}

export const EMPTY_FILTERS: Filters = { q: '', cat: 'all', status: 'all', origin: 'all', color: 'all', sort: 'no' };

const sorters = {
  no: () => 0,
  name: (a: Card, b: Card) => a.name.localeCompare(b.name),
  rarity: (a: Card, b: Card) => b.n - a.n,
  recent: (a: Card, b: Card) => b.spottedISO.localeCompare(a.spottedISO),
};

export function sortCards(cards: Card[], by: Sort | ColSort): Card[] {
  return by === 'no' ? cards : cards.slice().sort(sorters[by]);
}

export function filterCards(cards: Card[], f: Filters): Card[] {
  const q = norm(f.q.trim());
  const out = cards.filter(({ s, unlocked }) => {
    if (q && !haystack(s).includes(q)) return false;
    if (f.cat !== 'all' && s.cat !== f.cat) return false;
    if (f.color !== 'all' && !s.col.includes(f.color)) return false;
    if (f.origin !== 'all' && (f.origin === 'native') !== !!s.nat) return false;
    if (f.status === 'spotted' && !unlocked) return false;
    if (f.status === 'unspotted' && unlocked) return false;
    return true;
  });
  return sortCards(out, f.sort);
}

/** Count shown on the "Filters · n" button: only the settings inside the panel. */
export const panelFilterCount = (f: Filters) => +(f.origin !== 'all') + +(f.color !== 'all') + +(f.sort !== 'no');
export const anyFilter = (f: Filters) => !!(f.q.trim() || f.cat !== 'all' || f.status !== 'all' || panelFilterCount(f));

export const colourName = (k: ColourKey, lang: Lang) => COLOURS[k][lang === 'es' ? 1 : 0];

export const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0) + '%';
