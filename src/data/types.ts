export type CatKey = 'tree' | 'plant' | 'bird' | 'mammal' | 'reptile' | 'fish' | 'marine' | 'insect';
export type Iucn = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'NE' | 'DD';
export type ColourKey = 'green' | 'brown' | 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'black' | 'white' | 'grey';
export type HabitatKey = 'jungle' | 'coast' | 'mangrove' | 'reef' | 'sea' | 'town' | 'cenote';
export type Lang = 'en' | 'es';

/** Photo credit as returned by iNaturalist / Wikimedia. Always show attribution. */
export interface Photo {
  url: string;
  attribution: string;
  license: string;
  source: string;
}

export interface Species {
  id: string;
  cat: CatKey;
  sci: string;
  maya: string;
  /** Rarity 0 common … 3 legendary */
  n: 0 | 1 | 2 | 3;
  /** 1 native, 0 introduced */
  nat: 0 | 1;
  iucn: Iucn;
  size: string;
  col: ColourKey[];
  hab: HabitatKey[];
  where: string[];
  /** [name, fun fact, description] */
  en: [string, string, string];
  es: [string, string, string];
  photo?: Photo;
  inat?: { id: number; obsQRoo?: number };
}
