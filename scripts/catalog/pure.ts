/** Pure catalog logic, kept free of network access so it can be unit-tested. */
import type { CatKey, ColourKey, CuratedSpecies, DangerRule, DangerTag, Detail, Group, HabitatKey, IndexEntry, Iucn, Pair, Photo } from '../../src/data/types';
import { compactPhoto, shardOf } from '../../src/data/shard';

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
  { cat: 'insect', include: ['Insecta', 'Arachnida', 'Myriapoda'] },
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
  /** Named ancestor taxa, from the top (phylum) down to the genus */
  lineage?: Lineage[];
}

/** One ancestor taxon with a common name, used for group search. */
export interface Lineage {
  t: number;
  n: string;
  r: string;
  en?: string;
  es?: string;
}

/** Claude-written content for one species (data/enrichment.json, keyed by scientific name). */
export interface Enrichment {
  fact: Pair;
  about: Pair;
  size: string;
  col: ColourKey[];
  hab: HabitatKey[];
  /** How to tell males from females [en, es] */
  sex?: Pair;
  /** Its role in nature [en, es] */
  role?: Pair;
  model: string;
  date: string;
}

export interface BuildInput {
  gathered: Gathered[];
  curated: CuratedSpecies[];
  enrichment: Record<string, Enrichment>;
  /** Scientific name → true when the plant is a tree */
  trees: Record<string, boolean>;
  /** data/danger.json */
  danger?: DangerRule[];
  generated: string;
  speciesPerShard?: number;
}

export interface BuildOutput {
  index: IndexEntry[];
  details: Record<string, Detail>[];
  shards: number;
  groups: Group[];
  stats: Record<string, number>;
}

/**
 * The danger rule for a species: the first rule naming the species, its genus or one of its named
 * ancestors (family, order…) wins, so specific rules and exceptions go above broad ones.
 */
export function dangerFor(sci: string, ancestors: string[], rules: DangerRule[]): { tag: DangerTag; detail: NonNullable<Detail['danger']> } | null {
  const names = new Set([sci, sci.split(' ')[0], ...ancestors]);
  const rule = rules.find((r) => r.match.some((m) => names.has(m)));
  if (!rule || rule.none || !rule.kind || rule.level == null) return null;
  return {
    tag: { k: rule.kind, l: rule.level },
    detail: { ...(rule.guide ? { guide: rule.guide } : {}), ...(rule.speed ? { speed: rule.speed } : {}), ...(rule.risk ? { risk: rule.risk } : {}) },
  };
}

const wikiTitle = (url: string) => decodeURIComponent(url.split('/wiki/')[1] || '').replace(/_/g, ' ').trim();

/**
 * Wikipedia often redirects a little-known species to a relative's article ("Anoba pohli" → "Anoba trigonoides"),
 * which made a species look like a duplicate of its relative: same name, same text.
 * - An English article that belongs to another species in the catalog (its scientific or common name) is dropped.
 * - A name taken from such an article title ("Agave angustifolia" on Agave vivipara) falls back to the species' own.
 */
export function wikiMixups(gathered: Gathered[]): (g: Gathered) => Gathered {
  const genera = new Set(gathered.map((g) => g.sci.split(' ')[0]));
  const COMMON_NOUN = /^(tree|palm|vine|plant|bush|shrub|grass|fern|flower|lily|cactus|orchid|weed|moth|butterfly|bee|wasp|ant|fly|beetle|bug|snail|crab|fish|ray|shark|frog|toad|snake|lizard|bird|bat|mouse|rat)$/;
  const looksScientific = (name: string) =>
    /^[A-Z][a-z]+ \([^)]+\)$/.test(name) || (/^[A-Z][a-z]+ [a-z-]+$/.test(name) && genera.has(name.split(' ')[0]) && !COMMON_NOUN.test(name.split(' ')[1]));
  const owners = new Map<string, Set<string>>();
  const own = (name: string | undefined, sci: string) => {
    if (!name) return;
    const k = name.toLowerCase();
    owners.set(k, (owners.get(k) || new Set()).add(sci));
  };
  for (const g of gathered) {
    own(g.sci, g.sci);
    // A name that is really some other scientific name ("Anoba trigonoides" on Anoba pohli) proves nothing.
    if (g.nameEn && !looksScientific(g.nameEn)) own(g.nameEn, g.sci);
  }

  return (g) => {
    let out = g;
    if (g.wikiEn) {
      const t = wikiTitle(g.wikiEn.url).toLowerCase();
      const others = [...(owners.get(t) || [])].filter((sci) => sci !== g.sci);
      if (t !== g.sci.toLowerCase() && others.length) {
        const { wikiEn: _drop, ...rest } = out;
        out = { ...rest, ...(g.nameEn?.toLowerCase() === t ? { nameEn: undefined } : {}) };
      }
    }
    // A name copied from an article title that is some other scientific name.
    const titles = [g.wikiEn, g.wikiEs].filter((w): w is NonNullable<typeof w> => !!w).map((w) => wikiTitle(w.url).toLowerCase());
    // Spanish common names often look binomial ("Iguana verde"), so for Spanish only another species' name counts.
    const otherSci = (n: string) => [...(owners.get(n.toLowerCase()) || [])].some((sci) => sci !== g.sci && sci.toLowerCase() === n.toLowerCase());
    if (out.nameEn && out.nameEn !== g.sci && looksScientific(out.nameEn) && titles.includes(out.nameEn.toLowerCase())) out = { ...out, nameEn: undefined };
    if (out.nameEs && out.nameEs !== g.sci && (otherSci(out.nameEs) || /\(.+\)$/.test(out.nameEs))) out = { ...out, nameEs: undefined };
    // Without a name of its own the species would fall back to the article title; don't let it.
    if (!out.nameEn && out.wikiEn && looksScientific(out.wikiEn.title) && out.wikiEn.title !== g.sci) out = { ...out, nameEn: g.sci };
    return out;
  };
}

const DANGER_STAT = ['harmless', 'painful', 'serious', 'deadly'];
const CAT_ORDER: CatKey[] = ['tree', 'plant', 'bird', 'mammal', 'reptile', 'fish', 'marine', 'insect'];

export function buildCatalog({ gathered, curated, enrichment, trees, danger = [], speciesPerShard = 40 }: BuildInput): BuildOutput {
  const curatedBySci = new Map(curated.map((c) => [c.sci.toLowerCase(), c]));
  const seen = new Set<string>();
  const wikiFix = wikiMixups(gathered);

  interface Row {
    entry: IndexEntry;
    detail: Detail;
    lineage?: Lineage[];
  }
  const rows: Row[] = [];
  const stats: Record<string, number> = { curated: 0, claude: 0, wikipedia: 0, noText: 0 };

  for (let g of gathered) {
    const key = g.sci.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cur = curatedBySci.get(key);
    const enr = enrichment[g.sci];
    g = wikiFix(g);
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
          fact: [cur.en[1], cur.es[1]], desc: [cur.en[2], cur.es[2]], size: cur.size, hab: cur.hab, ...(cur.sex ? { sex: cur.sex } : {}), ...(cur.role ? { role: cur.role } : {}),
          ...(g.photo ? { photo: g.photo } : {}), ...(Object.keys(wiki).length ? { wiki } : {}), src: 'curated',
        },
        lineage: g.lineage,
      });
      continue;
    }

    const descEn = g.wikiEn?.extract || enr?.about[0] || '';
    const descEs = g.wikiEs?.extract || enr?.about[1] || '';
    let detail: Detail;
    if (enr) {
      stats.claude++;
      detail = { fact: enr.fact, desc: [descEn, descEs], ...(enr.size ? { size: enr.size } : {}), hab: enr.hab, ...(enr.sex ? { sex: enr.sex } : {}), ...(enr.role ? { role: enr.role } : {}), src: 'claude' };
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
      lineage: g.lineage,
    });
  }

  // Curated species iNaturalist didn't return still belong in the catalog.
  for (const cur of curated) {
    if (seen.has(cur.sci.toLowerCase())) continue;
    stats.curated++;
    rows.push({
      entry: { id: cur.id, cat: cur.cat, sci: cur.sci, en: cur.en[0], es: cur.es[0], ...(cur.maya ? { maya: cur.maya } : {}), n: cur.n, nat: cur.nat, iucn: cur.iucn, col: cur.col, cur: 1 },
      detail: { fact: [cur.en[1], cur.es[1]], desc: [cur.en[2], cur.es[2]], size: cur.size, hab: cur.hab, ...(cur.sex ? { sex: cur.sex } : {}), ...(cur.role ? { role: cur.role } : {}), src: 'curated' },
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

  // Taxonomic groups: one table of named ancestors, each pointing to its parent; a species points to its lowest group.
  const groups: Group[] = [];
  const groupIdx = new Map<number, number>();
  for (const r of rows) {
    let parent: number | undefined;
    for (const l of r.lineage || []) {
      let i = groupIdx.get(l.t);
      if (i == null) {
        i = groups.length;
        groupIdx.set(l.t, i);
        groups.push({ t: l.t, n: l.n, r: l.r, ...(l.en ? { en: l.en } : {}), ...(l.es ? { es: l.es } : {}), ...(parent != null ? { p: parent } : {}) });
      }
      parent = i;
    }
    if (parent != null) r.entry.g = parent;
  }

  for (const r of rows) {
    const p = compactPhoto(r.detail.photo?.url);
    if (p) r.entry.p = p;
    const d = dangerFor(r.entry.sci, (r.lineage || []).map((l) => l.n), danger);
    if (d) {
      r.entry.d = d.tag;
      r.detail.danger = d.detail;
      const k = `danger.${DANGER_STAT[d.tag.l]}`;
      stats[k] = (stats[k] ?? 0) + 1;
    }
  }

  const shards = Math.max(1, Math.ceil(rows.length / speciesPerShard));
  const details: Record<string, Detail>[] = Array.from({ length: shards }, () => ({}));
  for (const r of rows) details[shardOf(r.entry.id, shards)][r.entry.id] = r.detail;
  for (const c of CAT_ORDER) stats[`cat.${c}`] = rows.filter((r) => r.entry.cat === c).length;
  stats.total = rows.length;

  stats.groups = groups.length;
  return { index: rows.map((r) => r.entry), details, shards, groups, stats };
}
