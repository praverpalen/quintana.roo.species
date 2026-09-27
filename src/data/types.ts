export type CatKey = 'tree' | 'plant' | 'bird' | 'mammal' | 'reptile' | 'fish' | 'marine' | 'insect';
export type Iucn = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'NE' | 'DD';
export type ColourKey = 'green' | 'brown' | 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'black' | 'white' | 'grey';
export type HabitatKey = 'jungle' | 'coast' | 'mangrove' | 'reef' | 'sea' | 'town' | 'cenote';
export type Lang = 'en' | 'es';
export type Pair = [en: string, es: string];

/** Photo credit as returned by iNaturalist / Wikimedia. Always show attribution. */
export interface Photo {
  url: string;
  attribution: string;
  license: string;
  source: string;
}

/**
 * A hand-written species from the design handoff (data/curated.json).
 * The catalog pipeline merges these over the generated data.
 */
export interface CuratedSpecies {
  id: string;
  cat: CatKey;
  sci: string;
  maya: string;
  n: 0 | 1 | 2 | 3;
  nat: 0 | 1;
  iucn: Iucn;
  size: string;
  col: ColourKey[];
  hab: HabitatKey[];
  /** [name, fun fact, description] */
  en: [string, string, string];
  es: [string, string, string];
  /** How to tell males from females [en, es] */
  sex?: Pair;
}

/** One row of public/data/catalog.json: everything the grid, search and filters need. */
export interface IndexEntry {
  id: string;
  cat: CatKey;
  sci: string;
  /** Common names */
  en: string;
  es: string;
  maya?: string;
  /** Rarity 0 common … 3 legendary */
  n: 0 | 1 | 2 | 3;
  /** 1 native, 0 introduced */
  nat: 0 | 1;
  iucn: Iucn;
  col: ColourKey[];
  /** Research-grade iNaturalist observations in Quintana Roo */
  obs?: number;
  /** iNaturalist taxon id */
  t?: number;
  /** 1 when hand-curated */
  cur?: 1;
  /** Photo: "<id>.<ext>" on iNaturalist open data, or a full URL. Credit lives in the Detail. */
  p?: string;
}

export interface Catalog {
  generated: string;
  /** Number of detail shards in public/data/details/ */
  shards: number;
  species: IndexEntry[];
}

/** Heavier per-species content, loaded on demand from a detail shard. */
export interface Detail {
  fact: Pair;
  desc: Pair;
  size?: string;
  hab?: HabitatKey[];
  /** How to tell males from females [en, es] */
  sex?: Pair;
  photo?: Photo;
  /** Wikipedia article URLs used as the text source */
  wiki?: { en?: string; es?: string };
  /** Where fact/size/colours/habitat came from */
  src: 'curated' | 'claude' | 'wikipedia';
}
