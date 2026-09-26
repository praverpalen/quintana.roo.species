/**
 * Enrich and verify src/data/species.json against iNaturalist and GBIF.
 *
 *   npm run fetch-species              # add photos + iNat ids, write a verification report
 *   npm run fetch-species -- --apply   # also overwrite IUCN status with the iNaturalist/IUCN value
 *   npm run fetch-species -- --only jaguar,ceiba
 *
 * Needs network access to api.inaturalist.org and api.gbif.org.
 * Photos are only taken when they carry a Creative Commons licence; the attribution is stored with them.
 * Names, facts and rarity are never overwritten: differences go to scripts/verification-report.md for a human to review.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Iucn, Photo, Species } from '../src/data/types';

const here = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(here, '../src/data/species.json');
const REPORT = resolve(here, 'verification-report.md');
const INAT = 'https://api.inaturalist.org/v1';
const GBIF = 'https://api.gbif.org/v1';
const UA = 'quintana-roo-species-explorer/0.1 (personal learning app)';

// iNaturalist stores IUCN categories as numbers.
const IUCN_NUM: Record<number, Iucn> = { 5: 'DD', 10: 'LC', 20: 'NT', 30: 'VU', 40: 'EN', 50: 'CR', 60: 'EW', 70: 'EX' };

export interface ConservationStatus {
  authority?: string | null;
  iucn?: number | null;
  place?: { id: number } | null;
  place_id?: number | null;
}

/** The global IUCN Red List category, ignoring national/state lists. */
export function iucnFromStatuses(list: ConservationStatus[] | undefined): Iucn | null {
  const global = (list || []).find((s) => /iucn/i.test(s.authority || '') && !s.place && !s.place_id && s.iucn != null);
  return global ? IUCN_NUM[global.iucn!] ?? null : null;
}

/** Rough rarity from research-grade observation counts in Quintana Roo. A hint, not truth. */
export function suggestRarity(obs: number | undefined): 0 | 1 | 2 | 3 | null {
  if (obs == null) return null;
  if (obs >= 1000) return 0;
  if (obs >= 200) return 1;
  if (obs >= 30) return 2;
  return 3;
}

export interface Finding {
  id: string;
  sci: string;
  notes: string[];
}

export function renderReport(findings: Finding[], date: string): string {
  const flagged = findings.filter((f) => f.notes.length);
  const lines = [
    '# Species verification report',
    '',
    `Generated ${date} by \`npm run fetch-species\`. Sources: iNaturalist (taxonomy, IUCN status, photos, Quintana Roo observations) and GBIF (name status).`,
    '',
    `${flagged.length} of ${findings.length} species need a look.`,
    '',
  ];
  for (const f of flagged) {
    lines.push(`## ${f.id} · *${f.sci}*`, '', ...f.notes.map((n) => `- ${n}`), '');
  }
  return lines.join('\n');
}

async function getJSON<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429 && attempt < 4) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface InatTaxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  default_photo?: { medium_url?: string; attribution?: string; license_code?: string | null } | null;
  conservation_statuses?: ConservationStatus[];
}

async function quintanaRooPlaceId(): Promise<number | null> {
  const r = await getJSON<{ results: { id: number; name: string; admin_level: number | null }[] }>(`${INAT}/places/autocomplete?q=Quintana%20Roo`);
  return r.results.find((p) => p.name === 'Quintana Roo' && p.admin_level === 10)?.id ?? r.results.find((p) => p.name === 'Quintana Roo')?.id ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyArg = args[args.indexOf('--only') + 1];
  const only = args.includes('--only') && onlyArg ? new Set(onlyArg.split(',')) : null;

  const species = JSON.parse(readFileSync(DATA, 'utf8')) as Species[];
  const placeId = await quintanaRooPlaceId();
  console.log(`Quintana Roo iNaturalist place id: ${placeId ?? 'not found'}`);
  const findings: Finding[] = [];

  for (const s of species) {
    if (only && !only.has(s.id)) continue;
    const notes: string[] = [];
    process.stdout.write(`${s.id.padEnd(12)} `);
    try {
      // 1. Taxon match
      const search = await getJSON<{ results: InatTaxon[] }>(`${INAT}/taxa?q=${encodeURIComponent(s.sci)}&per_page=10`);
      const hit = search.results.find((t) => t.name.toLowerCase() === s.sci.toLowerCase());
      if (!hit) {
        notes.push(`No exact iNaturalist match for *${s.sci}*. Closest: ${search.results.slice(0, 3).map((t) => `*${t.name}* (${t.rank})`).join(', ') || 'none'}. The scientific name may be outdated.`);
        findings.push({ id: s.id, sci: s.sci, notes });
        console.log('no match');
        continue;
      }
      await sleep(1000);
      const [full] = (await getJSON<{ results: InatTaxon[] }>(`${INAT}/taxa/${hit.id}?locale=en`)).results;
      await sleep(1000);
      const [fullEs] = (await getJSON<{ results: InatTaxon[] }>(`${INAT}/taxa/${hit.id}?locale=es-MX`)).results;

      // 2. IUCN
      const iucn = iucnFromStatuses(full.conservation_statuses);
      if (iucn && iucn !== s.iucn) {
        notes.push(`IUCN: data says **${s.iucn}**, iNaturalist/IUCN says **${iucn}**.${apply ? ' Updated.' : ' Run with --apply to update.'}`);
        if (apply) s.iucn = iucn;
      } else if (!iucn && s.iucn !== 'NE') {
        notes.push(`IUCN: data says **${s.iucn}**, but iNaturalist lists no global IUCN assessment. Check iucnredlist.org.`);
      }

      // 3. Common names (report only)
      if (full.preferred_common_name && full.preferred_common_name.toLowerCase() !== s.en[0].toLowerCase())
        notes.push(`English name: data "${s.en[0]}", iNaturalist "${full.preferred_common_name}".`);
      if (fullEs?.preferred_common_name && fullEs.preferred_common_name.toLowerCase() !== s.es[0].toLowerCase())
        notes.push(`Spanish name: data "${s.es[0]}", iNaturalist (es-MX) "${fullEs.preferred_common_name}".`);

      // 4. Photo
      const dp = full.default_photo;
      if (dp?.medium_url && dp.license_code) {
        const photo: Photo = { url: dp.medium_url, attribution: dp.attribution || '', license: dp.license_code.toUpperCase(), source: `iNaturalist taxon ${hit.id}` };
        s.photo = photo;
      } else {
        notes.push('No openly licensed default photo on iNaturalist. Add one manually (Wikimedia Commons or your own).');
      }

      // 5. Observations in Quintana Roo → rarity hint
      let obs: number | undefined;
      if (placeId) {
        await sleep(1000);
        obs = (await getJSON<{ total_results: number }>(`${INAT}/observations?taxon_id=${hit.id}&place_id=${placeId}&quality_grade=research&per_page=0`)).total_results;
        const hint = suggestRarity(obs);
        if (hint != null && hint !== s.n) notes.push(`Rarity: data says ${s.n}, ${obs} research-grade observations in Quintana Roo suggest ${hint} (0 common … 3 legendary).`);
        if (obs === 0) notes.push('Zero research-grade observations in Quintana Roo. Is this species really found here?');
      }
      s.inat = { id: hit.id, ...(obs != null ? { obsQRoo: obs } : {}) };

      // 6. GBIF name status
      await sleep(300);
      const g = await getJSON<{ status?: string; matchType?: string; scientificName?: string; species?: string }>(`${GBIF}/species/match?name=${encodeURIComponent(s.sci)}&strict=true`);
      if (g.matchType === 'NONE') notes.push('GBIF has no match for this name.');
      else if (g.status && g.status !== 'ACCEPTED') notes.push(`GBIF marks the name as ${g.status}; accepted species: *${g.species}*.`);

      console.log(`ok (inat ${hit.id}${obs != null ? `, ${obs} obs` : ''}${notes.length ? `, ${notes.length} notes` : ''})`);
    } catch (e) {
      notes.push(`Lookup failed: ${(e as Error).message}`);
      console.log('error', (e as Error).message);
    }
    findings.push({ id: s.id, sci: s.sci, notes });
    await sleep(1000);
  }

  writeFileSync(DATA, JSON.stringify(species, null, 1) + '\n');
  writeFileSync(REPORT, renderReport(findings, new Date().toISOString().slice(0, 10)));
  console.log(`\nWrote ${DATA}\nWrote ${REPORT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
