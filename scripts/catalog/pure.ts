/** Pure catalog logic, kept free of network access so it can be unit-tested. */
import type { CatKey, ColourKey, CuratedSpecies, Detail, HabitatKey, IndexEntry, Iucn, Pair, Photo } from '../../src/data/types';
import { shardOf } from '../../src/data/shard';

/**
 * How iNaturalist taxa map onto the app's 8 categories. Taxon names are resolved to ids at run time.
 * Order matters: a species is assigned to the first category that claims it.
 * `plant` covers all Plantae; trees are split off afterwards by the growth-form classifier.
 */
export const CATEGORY_TAXA: { cat: CatKey; include: string[]; exclude?: string[] }[] = [
  { cat: 'marine', include: ['Chelonioidea', 'Cnidaria', 'Echinodermata', 'Porifera', 'Mollusca', 'Malacostraca'] },
  { cat: 'bird', include: ['Aves'] },
  { cat: 'mammal', include: ['Mammalia'] },
  { cat: 'reptile', include: ['Reptilia', 'Amphibia'], exclude: ['Chelonioidea'] },
  { cat: 'fish', include: ['Actinopterygii', 'Elasmobranchii'] },
  { cat: 'insect', include: ['Insecta'] },
  { cat: 'plant', include: ['Plantae'] },
];

export const COLOUR_KEYS: ColourKey[] = ['green', 'brown', 'yellow', 'orange', 'red', 'pink', 'purple', 'blue', 'black', 'white', 'grey'];
export const HABITAT_KEYS: HabitatKey[] = ['jungle', 'coast', 'mangrove', 'reef', 'sea', 'town', 'cenote'];

// iNaturalist stores IUCN categories as numbers.
const IUCN_NUM: Record<number, Iucn> = { 5: 'DD', 10: 'LC', 20: 'NT', 30: 'VU', 40: 'EN', 50: 'CR', 60: 'EW', 70: 'EX' };

export interface ConservationStatus {
  authority?: string | null;
  iucn?: number | null;
  place?: { id: number } | null;
  place_id?: number | null;
}

/** The global IUCN Red List category, ignoring national and state lists. */
export function iucnFromStatuses(list: ConservationStatus[] | undefined): Iucn | null {
  const global = (list || []).find((s) => /iucn/i.test(s.authority || '') && !s.place && !s.place_id && s.iucn != null);
  return global ? (IUCN_NUM[global.iucn!] ?? null) : null;
}

export const slug = (sci: string) =>
  sci
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** First sentence of a Wikipedia extract, used as the card text when nothing better exists. */
export function firstSentence(text: string | undefined): string {
  if (!text) return '';
  const m = text.match(/^(.{20,}?[.!?])(\s|$)/s);
  const s = (m ? m[1] : text).trim();
  return s.length > 240 ? s.slice(0, 237).trimEnd() + '…' : s;
}

/**
 * Rarity from observation counts, ranked within each category:
 * top 40% common, next 30% uncommon, next 20% rare, last 10% legendary.
 */
export function rarityByRank<T extends { cat: CatKey; obs?: number; sci?: string }>(items: T[]): Map<T, 0 | 1 | 2 | 3> {
  const out = new Map<T, 0 | 1 | 2 | 3>();
  const byCat = new Map<CatKey, T[]>();
  for (const it of items) byCat.set(it.cat, [...(byCat.get(it.cat) || []), it]);
  for (const list of byCat.values()) {
    // Ties (many species share a count) break on scientific name so rebuilds are deterministic.
    const sorted = list.slice().sort((a, b) => (b.obs ?? 0) - (a.obs ?? 0) || (a.sci ?? '').localeCompare(b.sci ?? ''));
    sorted.forEach((it, i) => {
      const r = i / sorted.length;
      out.set(it, r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3);
    });
  }
  return out;
}

/** A species as gathered from iNaturalist and Wikipedia, before curated data and Claude content are merged in. */
export interface Gathered {
  taxonId: number;
  sci: string;
  cat: CatKey;
  obs: number;
  nameEn?: string;
  nameEs?: string;
  introduced: boolean;
  iucn: Iucn | null;
  photo?: Photo;
  wikiEn?: { title: string; extract: string; url: string };
  wikiEs?: { title: string; extract: string; url: string };
}

/** Claude-written content for one species (data/enrichment.json, keyed by scientific name). */
export interface Enrichment {
  fact: Pair;
  about: Pair;
  size: string;
  col: ColourKey[];
  hab: HabitatKey[];
  model: string;
  date: string;
}

export interface BuildInput {
  gathered: Gathered[];
  curated: CuratedSpecies[];
  enrichment: Record<string, Enrichment>;
  /** Scientific name → true when the plant is a tree */
  trees: Record<string, boolean>;
  generated: string;
  speciesPerShard?: number;
}

export interface BuildOutput {
  index: IndexEntry[];
  details: Record<string, Detail>[];
  shards: number;
  stats: Record<string, number>;
}

const CAT_ORDER: CatKey[] = ['tree', 'plant', 'bird', 'mammal', 'reptile', 'fish', 'marine', 'insect'];

export function buildCatalog({ gathered, curated, enrichment, trees, speciesPerShard = 40 }: BuildInput): BuildOutput {
  const curatedBySci = new Map(curated.map((c) => [c.sci.toLowerCase(), c]));
  const seen = new Set<string>();

  interface Row {
    entry: IndexEntry;
    detail: Detail;
  }
  const rows: Row[] = [];
  const stats: Record<string, number> = { curated: 0, claude: 0, wikipedia: 0, noText: 0 };

  for (const g of gathered) {
    const key = g.sci.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cur = curatedBySci.get(key);
    const enr = enrichment[g.sci];
    let cat: CatKey = g.cat === 'plant' && trees[g.sci] ? 'tree' : g.cat;
    const wiki = { ...(g.wikiEn ? { en: g.wikiEn.url } : {}), ...(g.wikiEs ? { es: g.wikiEs.url } : {}) };
    const wikiEsName = g.wikiEs && g.wikiEs.title.toLowerCase() !== key ? g.wikiEs.title : undefined;
    const nameEn = g.nameEn || g.wikiEn?.title || g.sci;
    const nameEs = g.nameEs || wikiEsName || nameEn;

    if (cur) {
      cat = cur.cat;
      stats.curated++;
      rows.push({
        entry: {
          id: cur.id, cat, sci: cur.sci, en: cur.en[0], es: cur.es[0], ...(cur.maya ? { maya: cur.maya } : {}),
          n: cur.n, nat: cur.nat, iucn: g.iucn ?? cur.iucn, col: cur.col, obs: g.obs, t: g.taxonId, cur: 1,
        },
        detail: {
          fact: [cur.en[1], cur.es[1]], desc: [cur.en[2], cur.es[2]], size: cur.size, hab: cur.hab, where: cur.where,
          ...(g.photo ? { photo: g.photo } : {}), ...(Object.keys(wiki).length ? { wiki } : {}), src: 'curated',
        },
      });
      continue;
    }

    const descEn = g.wikiEn?.extract || enr?.about[0] || '';
    const descEs = g.wikiEs?.extract || enr?.about[1] || '';
    let detail: Detail;
    if (enr) {
      stats.claude++;
      detail = { fact: enr.fact, desc: [descEn, descEs], ...(enr.size ? { size: enr.size } : {}), hab: enr.hab, src: 'claude' };
    } else {
      if (descEn || descEs) stats.wikipedia++;
      else stats.noText++;
      detail = { fact: [firstSentence(descEn), firstSentence(descEs)], desc: [descEn, descEs], src: 'wikipedia' };
    }
    if (g.photo) detail.photo = g.photo;
    if (Object.keys(wiki).length) detail.wiki = wiki;
    rows.push({
      entry: { id: slug(g.sci), cat, sci: g.sci, en: nameEn, es: nameEs, n: 0, nat: g.introduced ? 0 : 1, iucn: g.iucn ?? 'NE', col: enr?.col ?? [], obs: g.obs, t: g.taxonId },
      detail,
    });
  }

  // Curated species iNaturalist didn't return still belong in the catalog.
  for (const cur of curated) {
    if (seen.has(cur.sci.toLowerCase())) continue;
    stats.curated++;
    rows.push({
      entry: { id: cur.id, cat: cur.cat, sci: cur.sci, en: cur.en[0], es: cur.es[0], ...(cur.maya ? { maya: cur.maya } : {}), n: cur.n, nat: cur.nat, iucn: cur.iucn, col: cur.col, cur: 1 },
      detail: { fact: [cur.en[1], cur.es[1]], desc: [cur.en[2], cur.es[2]], size: cur.size, hab: cur.hab, where: cur.where, src: 'curated' },
    });
  }

  // Rarity from observations for everything except curated cards, which keep their hand-set value.
  const rar = rarityByRank(rows.map((r) => r.entry));
  for (const r of rows) if (!r.entry.cur) r.entry.n = rar.get(r.entry)!;

  // Stable order: category, curated first (design order), then most observed.
  const curatedOrder = new Map(curated.map((c, i) => [c.id, i]));
  rows.sort(
    (a, b) =>
      CAT_ORDER.indexOf(a.entry.cat) - CAT_ORDER.indexOf(b.entry.cat) ||
      (b.entry.cur ?? 0) - (a.entry.cur ?? 0) ||
      (curatedOrder.get(a.entry.id) ?? 0) - (curatedOrder.get(b.entry.id) ?? 0) ||
      (b.entry.obs ?? 0) - (a.entry.obs ?? 0) ||
      a.entry.sci.localeCompare(b.entry.sci),
  );

  // Ids must be unique: disambiguate the rare slug collision with the taxon id.
  const ids = new Set<string>();
  for (const r of rows) {
    if (ids.has(r.entry.id)) r.entry.id = `${r.entry.id}-${r.entry.t ?? ids.size}`;
    ids.add(r.entry.id);
  }

  const shards = Math.max(1, Math.ceil(rows.length / speciesPerShard));
  const details: Record<string, Detail>[] = Array.from({ length: shards }, () => ({}));
  for (const r of rows) details[shardOf(r.entry.id, shards)][r.entry.id] = r.detail;
  for (const c of CAT_ORDER) stats[`cat.${c}`] = rows.filter((r) => r.entry.cat === c).length;
  stats.total = rows.length;

  return { index: rows.map((r) => r.entry), details, shards, stats };
}
