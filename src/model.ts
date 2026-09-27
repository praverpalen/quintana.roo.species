import type { CatKey, ColourKey, Group, IndexEntry, Lang } from './data/types';
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

// ---- Group search: "crab", "shark", "iguana" match every species in a group whose common name says so ----
let GROUPS: Group[] = [];
const groupWordCache = new Map<number, Set<string>>();
/** Every group word in the catalog: a query that is a whole word somewhere never prefix-matches. */
let ALL_WORDS = new Set<string>();

/** Called once the catalog is loaded. */
export function setGroups(groups: Group[] | undefined) {
  GROUPS = groups || [];
  groupWordCache.clear();
  ALL_WORDS = new Set();
  for (const g of GROUPS) for (const w of ownWords(g)) ALL_WORDS.add(w);
}

// "Sharks and Rays", "Iguanas and Allies", "Insectos, arácnidos y crustáceos": a mix of several
// kinds, so its words would drag rays into "shark". A narrower plain group almost always exists.
const MIXED = /\b(and|y|e)\b|,|allies|relatives|parientes|afines/;

function ownWords(g: Group): string[] {
  const out: string[] = [];
  for (const name of [g.en, g.es]) {
    const n = norm(name || '');
    if (!n || MIXED.test(n)) continue;
    for (const word of n.split(/[^a-z0-9]+/)) if (word.length > 1) out.push(word);
  }
  return out;
}

/** All words from the common names (EN + ES) of a group and all its parent groups. */
function groupWords(idx: number): Set<string> {
  let w = groupWordCache.get(idx);
  if (w) return w;
  const g = GROUPS[idx];
  w = new Set(g.p != null ? groupWords(g.p) : []);
  for (const word of ownWords(g)) w.add(word);
  groupWordCache.set(idx, w);
  return w;
}

/** The query word and its singular/plural forms (EN + ES). */
function forms(q: string): string[] {
  const f = [q, q + 's', q + 'es'];
  if (q.endsWith('es')) f.push(q.slice(0, -2));
  if (q.endsWith('s')) f.push(q.slice(0, -1));
  if (q.endsWith('y')) f.push(q.slice(0, -1) + 'ies');
  if (q.endsWith('ies')) f.push(q.slice(0, -3) + 'y');
  if (q.endsWith('z')) f.push(q.slice(0, -1) + 'ces');
  return f;
}

/** Whole word or plural; a prefix only while still typing ("iguan"), never "dolphin" → "dolphinfishes". */
function wordMatches(q: string, words: Set<string>): boolean {
  const f = forms(q);
  if (f.some((x) => words.has(x))) return true;
  if (q.length < 4 || f.some((x) => ALL_WORDS.has(x))) return false;
  for (const w of words) if (w.startsWith(q)) return true;
  return false;
}

export function inGroup(s: IndexEntry, q: string): boolean {
  if (s.g == null || !GROUPS[s.g]) return false;
  const words = groupWords(s.g);
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => wordMatches(p, words));
}

/** The family (or nearest named group) of a species, for display. */
export function familyOf(s: IndexEntry, lang: Lang): { name: string; sci: string } | null {
  for (let i = s.g; i != null && GROUPS[i]; i = GROUPS[i].p) {
    const g = GROUPS[i];
    if (g.r === 'family') return { name: (lang === 'es' ? g.es || g.en : g.en || g.es) || '', sci: g.n };
  }
  return null;
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
    if (q && !haystack(s).includes(q) && !inGroup(s, q)) return false;
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
