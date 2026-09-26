import { useEffect, useState } from 'react';
import type { Photo } from './data/types';

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

interface InatTaxon {
  name: string;
  rank: string;
  default_photo?: { medium_url?: string; attribution?: string; license_code?: string | null } | null;
}

/** Pick the exact-name species match and turn its default photo into a Photo, if openly licensed. */
export function photoFromInat(sci: string, results: InatTaxon[]): Photo | null {
  const t = results.find((r) => r.name.toLowerCase() === sci.toLowerCase());
  const dp = t?.default_photo;
  if (!dp?.medium_url || !dp.license_code) return null;
  return { url: dp.medium_url, attribution: dp.attribution || '', license: dp.license_code.toUpperCase(), source: 'iNaturalist' };
}

export async function fetchInatPhoto(sci: string, fetcher: typeof fetch = fetch): Promise<Photo | null> {
  const res = await fetcher(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&per_page=5`);
  if (!res.ok) throw new Error(`iNaturalist ${res.status}`);
  const json = (await res.json()) as { results: InatTaxon[] };
  return photoFromInat(sci, json.results || []);
}

function loadPhoto(sci: string): Promise<Photo | null> {
  let p = inflight.get(sci);
  if (!p) {
    p = fetchInatPhoto(sci)
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
export function usePhoto(sci: string | undefined, preset: Photo | undefined, enabled = true): Photo | null {
  const cached = sci ? readCache()[sci] : undefined;
  const initial = preset || (cached && Date.now() - cached.t < TTL ? cached.p : null);
  const [photo, setPhoto] = useState<Photo | null>(initial);

  useEffect(() => {
    setPhoto(initial);
    if (!sci || preset || !enabled) return;
    const c = readCache()[sci];
    if (c && Date.now() - c.t < TTL) return;
    let live = true;
    loadPhoto(sci).then((p) => live && p && setPhoto(p));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sci, preset?.url, enabled]);

  return photo;
}
