import { useEffect, useState } from 'react';
import type { Photo } from './data/types';
import { photoUrl } from './data/shard';

/**
 * Species photos. Baked-in photos (from `npm run fetch-species`) win. Otherwise the
 * browser asks iNaturalist for the taxon's default photo and caches the answer.
 * Only openly licensed photos (a CC licence code) are used, and the credit is always kept.
 */
const CACHE_KEY = 'qroo-photos-v1';
const TTL = 30 * 24 * 3600 * 1000;

type Entry = { p: Photo | null; t: number };
let cache: Record<string, Entry> | null = null;
const inflight = new Map<string, Promise<Photo | null>>();

function readCache(): Record<string, Entry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    cache = {};
  }
  return cache!;
}

function writeCache(sci: string, p: Photo | null) {
  const c = readCache();
  c[sci] = { p, t: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

interface InatPhotoJson {
  url?: string;
  medium_url?: string;
  attribution?: string;
  license_code?: string | null;
}
interface InatTaxon {
  name: string;
  rank: string;
  default_photo?: InatPhotoJson | null;
  taxon_photos?: { photo: InatPhotoJson }[];
}

function toPhoto(p: InatPhotoJson | null | undefined): Photo | null {
  const url = p?.medium_url || p?.url?.replace(/\/(square|small|thumb)\./, '/medium.');
  if (!url || !p?.license_code) return null;
  return { url, attribution: p.attribution || '', license: p.license_code.toUpperCase(), source: 'iNaturalist' };
}

/** Pick the exact-name species match and turn its default photo into a Photo, if openly licensed. */
export function photoFromInat(sci: string, results: InatTaxon[]): Photo | null {
  const t = results.find((r) => r.name.toLowerCase() === sci.toLowerCase());
  if (!t) return null;
  // The default photo is often all-rights-reserved; fall back to the taxon's other photos.
  return toPhoto(t.default_photo) ?? (t.taxon_photos || []).map((tp) => toPhoto(tp.photo)).find(Boolean) ?? null;
}

export async function fetchInatPhoto(sci: string, taxonId?: number, fetcher: typeof fetch = fetch): Promise<Photo | null> {
  const res = await fetcher(taxonId ? `https://api.inaturalist.org/v1/taxa/${taxonId}` : `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&per_page=5`);
  if (!res.ok) throw new Error(`iNaturalist ${res.status}`);
  const json = (await res.json()) as { results: InatTaxon[] };
  return photoFromInat(sci, json.results || []);
}

function loadPhoto(sci: string, taxonId?: number): Promise<Photo | null> {
  let p = inflight.get(sci);
  if (!p) {
    p = fetchInatPhoto(sci, taxonId)
      .then((photo) => {
        writeCache(sci, photo);
        return photo;
      })
      .catch(() => null) // offline or blocked: keep the placeholder, retry next launch
      .finally(() => inflight.delete(sci));
    inflight.set(sci, p);
  }
  return p;
}

/** A species photo: the one baked into the catalog, else an openly licensed iNaturalist photo fetched at runtime. */
export function usePhoto(sci: string | undefined, preset: Photo | undefined, enabled = true, taxonId?: number): Photo | null {
  const cached = sci ? readCache()[sci] : undefined;
  const initial = preset || (cached && Date.now() - cached.t < TTL ? cached.p : null);
  const [photo, setPhoto] = useState<Photo | null>(initial);

  useEffect(() => {
    setPhoto(initial);
    if (!sci || preset || !enabled) return;
    const c = readCache()[sci];
    if (c && Date.now() - c.t < TTL) return;
    let live = true;
    loadPhoto(sci, taxonId).then((p) => live && p && setPhoto(p));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sci, preset?.url, enabled]);

  return photo;
}

/** The photo a card or detail page shows: your newest photo, else the catalog photo, else a runtime iNaturalist photo. */
export function useSpeciesPhoto(
  s: { sci: string; t?: number; p?: string } | undefined,
  detailPhoto: Photo | undefined,
  mine: Blob | undefined,
  mineUrl: string | undefined,
  opts: { runtime: boolean; size?: 'medium' | 'large' },
): { url: string; credit?: Photo; own: boolean } | null {
  const catalog = s?.p ? photoUrl(s.p, opts.size) : undefined;
  const fallback = usePhoto(s?.sci, detailPhoto, opts.runtime && !catalog && !mine, s?.t);
  if (mine && mineUrl) return { url: mineUrl, own: true };
  if (catalog) return { url: catalog, credit: detailPhoto, own: false };
  if (fallback) return { url: opts.size === 'large' ? photoUrl(fallback.url, 'large') : fallback.url, credit: fallback, own: false };
  return null;
}
