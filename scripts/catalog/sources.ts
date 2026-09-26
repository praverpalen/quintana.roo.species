/** iNaturalist and Wikipedia clients for the catalog pipeline. Both are polite: throttled, retried, cached. */
import type { CatKey, Photo } from '../../src/data/types';
import { CATEGORY_TAXA, iucnFromStatuses, type ConservationStatus, type Gathered } from './pure';

const UA = 'quintana-roo-species-explorer/0.2 (https://github.com/praverpalen/quintana.roo.species)';
const INAT = 'https://api.inaturalist.org/v1';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastInat = 0;
/** iNaturalist asks for at most ~1 request per second. */
async function inat<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastInat + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastInat = Date.now();
    const res = await fetch(INAT + path, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(5000 * 2 ** attempt);
      continue;
    }
    throw new Error(`iNaturalist ${res.status} ${path}`);
  }
}

interface InatPhoto {
  id?: number;
  url?: string;
  square_url?: string;
  medium_url?: string;
  attribution?: string;
  license_code?: string | null;
}

interface InatTaxon {
  id: number;
  name: string;
  rank: string;
  is_active?: boolean;
  preferred_common_name?: string;
  default_photo?: InatPhoto | null;
  taxon_photos?: { photo: InatPhoto }[];
  conservation_statuses?: ConservationStatus[];
  wikipedia_url?: string | null;
}

export async function quintanaRooPlaceId(): Promise<number> {
  const r = await inat<{ results: { id: number; name: string; admin_level: number | null }[] }>(`/places/autocomplete?q=Quintana%20Roo`);
  const p = r.results.find((x) => x.name === 'Quintana Roo' && x.admin_level === 10) ?? r.results.find((x) => x.name === 'Quintana Roo');
  if (!p) throw new Error('Quintana Roo place not found on iNaturalist');
  return p.id;
}

async function resolveTaxon(name: string): Promise<number> {
  const r = await inat<{ results: InatTaxon[] }>(`/taxa?q=${encodeURIComponent(name)}&is_active=true&per_page=30`);
  const t = r.results.find((x) => x.name === name && x.rank !== 'species');
  if (!t) throw new Error(`Taxon "${name}" not found on iNaturalist`);
  return t.id;
}

/** An openly licensed iNaturalist photo as a medium-size Photo, or undefined. */
export function photoFrom(p: InatPhoto | null | undefined, source: string): Photo | undefined {
  const url = p?.medium_url || (p?.square_url || p?.url)?.replace(/\/(square|small|thumb)\./, '/medium.');
  if (!url || !p?.license_code) return undefined; // only openly licensed photos
  return { url, attribution: p.attribution || '', license: p.license_code.toUpperCase(), source };
}

export const photoOf = (t: InatTaxon) => photoFrom(t.default_photo, `iNaturalist taxon ${t.id}`);

/** First openly licensed photo among the taxon's curated photos (the default photo is often all-rights-reserved). */
export function taxonPhoto(t: InatTaxon): Photo | undefined {
  for (const tp of t.taxon_photos || []) {
    const p = photoFrom(tp.photo, `iNaturalist taxon ${t.id}`);
    if (p) return p;
  }
  return undefined;
}

const OPEN_LICENSES = 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd';

/** Every leaf taxon with research-grade observations under the given taxa. Paginated, 500 per page. */
async function speciesCounts(placeId: number, include: number[], exclude: number[], extra: string): Promise<{ count: number; taxon: InatTaxon }[]> {
  const out: { count: number; taxon: InatTaxon }[] = [];
  for (let page = 1; ; page++) {
    const q = `/observations/species_counts?place_id=${placeId}&taxon_id=${include.join(',')}${exclude.length ? `&without_taxon_id=${exclude.join(',')}` : ''}&quality_grade=research&per_page=500&page=${page}${extra}`;
    const r = await inat<{ total_results: number; results: { count: number; taxon: InatTaxon }[] }>(q);
    out.push(...r.results);
    if (out.length >= r.total_results || r.results.length === 0) break;
  }
  return out;
}

export interface GatherOptions {
  /** Only these categories (for testing a run) */
  only?: CatKey[];
  log?: (msg: string) => void;
}

/** Species list, names, photos, native status and IUCN for every category, from iNaturalist. */
export async function gatherInat(opts: GatherOptions = {}): Promise<Omit<Gathered, 'wikiEn' | 'wikiEs'>[]> {
  const log = opts.log ?? console.log;
  const placeId = await quintanaRooPlaceId();
  log(`Quintana Roo = iNaturalist place ${placeId}`);
  const taxonIds = new Map<string, number>();
  for (const name of new Set(CATEGORY_TAXA.flatMap((c) => [...c.include, ...(c.exclude || [])]))) taxonIds.set(name, await resolveTaxon(name));

  const byId = new Map<number, Omit<Gathered, 'wikiEn' | 'wikiEs'> & { wiki?: string }>();
  for (const def of CATEGORY_TAXA) {
    if (opts.only && !opts.only.includes(def.cat) && !(def.cat === 'plant' && opts.only.includes('tree'))) continue;
    const inc = def.include.map((n) => taxonIds.get(n)!);
    const exc = (def.exclude || []).map((n) => taxonIds.get(n)!);
    const en = await speciesCounts(placeId, inc, exc, '&locale=en');
    const es = await speciesCounts(placeId, inc, exc, '&locale=es-MX');
    const intro = await speciesCounts(placeId, inc, exc, '&introduced=true');
    const esName = new Map(es.map((r) => [r.taxon.id, r.taxon.preferred_common_name]));
    const introduced = new Set(intro.map((r) => r.taxon.id));
    let added = 0;
    for (const { count, taxon } of en) {
      if (taxon.rank !== 'species' || byId.has(taxon.id)) continue;
      byId.set(taxon.id, {
        taxonId: taxon.id, sci: taxon.name, cat: def.cat, obs: count,
        nameEn: taxon.preferred_common_name, nameEs: esName.get(taxon.id), introduced: introduced.has(taxon.id), iucn: null, photo: photoOf(taxon),
      });
      added++;
    }
    log(`${def.cat.padEnd(8)} ${added} species (${introduced.size} introduced)`);
  }

  // Global IUCN status and Wikipedia link need the full taxon record: 30 ids per request.
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    const r = await inat<{ results: InatTaxon[] }>(`/taxa/${chunk.join(',')}?locale=en`);
    for (const t of r.results) {
      const g = byId.get(t.id);
      if (!g) continue;
      g.iucn = iucnFromStatuses(t.conservation_statuses);
      g.photo ??= taxonPhoto(t);
      if (t.wikipedia_url) g.wiki = t.wikipedia_url;
    }
    if ((i / 30) % 20 === 0) log(`taxon details ${Math.min(i + 30, ids.length)}/${ids.length}`);
  }
  // Last resort for photos: the most-voted openly licensed research-grade observation photo in Quintana Roo.
  const noPhoto = [...byId.values()].filter((g) => !g.photo);
  log(`${noPhoto.length} species without an open taxon photo; trying observation photos`);
  for (const [i, g] of noPhoto.entries()) {
    try {
      const r = await inat<{ results: { photos?: InatPhoto[]; id: number }[] }>(
        `/observations?taxon_id=${g.taxonId}&place_id=${placeId}&quality_grade=research&photo_license=${OPEN_LICENSES}&order_by=votes&per_page=3`,
      );
      for (const o of r.results) {
        const p = (o.photos || []).map((ph) => photoFrom(ph, `iNaturalist observation ${o.id}`)).find(Boolean);
        if (p) {
          g.photo = p;
          break;
        }
      }
    } catch (e) {
      log(`  ! ${(e as Error).message}`);
    }
    if (i % 200 === 199) log(`observation photos ${i + 1}/${noPhoto.length}`);
  }
  log(`${[...byId.values()].filter((g) => !g.photo).length} species still without a photo`);
  return [...byId.values()];
}

// ---------- Wikipedia ----------

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
}
export type WikiCache = Record<string, WikiSummary | null>;

async function wikiSummary(lang: 'en' | 'es', title: string): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 404) return null;
    if (res.ok) {
      const j = (await res.json()) as { type?: string; title: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
      if (j.type === 'disambiguation' || !j.extract) return null;
      return { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(j.title)}` };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(3000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Wikipedia ${res.status} ${url}`);
  }
}

/** Adds English and Spanish Wikipedia summaries, looked up by scientific name. Results are cached across runs. */
export async function addWikipedia(list: (Omit<Gathered, 'wikiEn' | 'wikiEs'> & { wiki?: string })[], cache: WikiCache, log = console.log): Promise<Gathered[]> {
  const out: Gathered[] = [];
  let fetched = 0;
  const queue = list.slice();
  const worker = async () => {
    for (let g = queue.shift(); g; g = queue.shift()) {
      const enTitle = g.wiki ? decodeURIComponent(g.wiki.split('/wiki/')[1] || g.sci) : g.sci;
      const get = async (lang: 'en' | 'es', title: string) => {
        const k = `${lang}:${title}`;
        if (!(k in cache)) {
          try {
            cache[k] = await wikiSummary(lang, title);
          } catch (e) {
            log(`  ! ${(e as Error).message}`);
            return null;
          }
          fetched++;
        }
        return cache[k];
      };
      const wikiEn = await get('en', enTitle);
      const wikiEs = await get('es', g.sci);
      const { wiki: _w, ...rest } = g;
      out.push({ ...rest, ...(wikiEn ? { wikiEn } : {}), ...(wikiEs ? { wikiEs } : {}) });
      if (out.length % 500 === 0) log(`wikipedia ${out.length}/${list.length} (${fetched} fetched, rest cached)`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  // Keep the input order (workers finish out of order).
  const pos = new Map(list.map((g, i) => [g.taxonId, i]));
  return out.sort((a, b) => pos.get(a.taxonId)! - pos.get(b.taxonId)!);
}
