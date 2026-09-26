import type { CatKey, ColourKey, Lang, Species } from './data/types';
import { CATS, COLOURS, IUCN, RARITY, catColours, fmtDate } from './i18n';

export type Spotted = Record<string, string>;
export type Status = 'all' | 'spotted' | 'unspotted';
export type Origin = 'all' | 'native' | 'introduced';
export type Sort = 'no' | 'name' | 'rarity';
export type ColSort = 'recent' | 'name' | 'rarity';

/** Everything a card or the detail screen needs, already localised. */
export interface Card {
  id: string;
  s: Species;
  no: string;
  name: string;
  sci: string;
  cat: string;
  catKey: CatKey;
  fact: string;
  desc: string;
  size: string;
  n: number;
  rarity: string;
  iucn: Species['iucn'];
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

const CAT_ORDER = CATS.map((c) => c.key);
const catBy = Object.fromEntries(CATS.map((c) => [c.key, c])) as Record<CatKey, (typeof CATS)[number]>;

/** Stable species order: grouped by category, source order within a category. */
export function orderSpecies(raw: Species[]): Species[] {
  return raw
    .map((s, i) => ({ s, i }))
    .sort((a, b) => CAT_ORDER.indexOf(a.s.cat) - CAT_ORDER.indexOf(b.s.cat) || a.i - b.i)
    .map((x) => x.s);
}

export function buildCards(ordered: Species[], spotted: Spotted, lang: Lang): Card[] {
  const li = lang === 'es' ? 1 : 0;
  return ordered.map((s, idx) => {
    const c = catBy[s.cat];
    const iso = spotted[s.id] || '';
    const t = s[lang];
    return {
      id: s.id, s, no: '#' + String(idx + 1).padStart(3, '0'), name: t[0], sci: s.sci, cat: c.one[li], catKey: s.cat,
      fact: t[1], desc: t[2], size: s.size, n: s.n, rarity: RARITY[lang][s.n], iucn: s.iucn, iucnLabel: IUCN[s.iucn][li],
      native: !!s.nat, origin: s.nat ? (li ? 'Nativa' : 'Native') : (li ? 'Introducida' : 'Introduced'),
      unlocked: !!iso, spottedISO: iso, spottedOn: iso ? fmtDate(iso, lang) : '',
      ...catColours(c.h),
    };
  });
}

/** Lower-case and strip accents so "tucan" finds "Tucán". */
export const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
    if (q && ![s.en[0], s.es[0], s.sci, s.maya].some((t) => norm(t).includes(q))) return false;
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
