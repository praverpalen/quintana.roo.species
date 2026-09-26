/**
 * Builds the species catalog the app loads: public/data/catalog.json + public/data/details/*.json.
 *
 *   npm run build-catalog                         # full run: iNaturalist + Wikipedia + Claude
 *   npm run build-catalog -- --offline            # rebuild from cached/committed data only (no network)
 *   npm run build-catalog -- --no-claude          # skip Claude (no API key needed)
 *   npm run build-catalog -- --max-enrich 500     # Claude-write content for up to 500 more species this run
 *   npm run build-catalog -- --model claude-sonnet-5 --wait-minutes 60 --only bird,fish
 *
 * Inputs (committed): data/curated.json, data/enrichment.json, data/trees.json, data/pending-batches.json
 * Cache (not committed; kept by the GitHub Actions cache): data/.cache/
 * Needs network access to api.inaturalist.org, *.wikipedia.org and api.anthropic.com (ANTHROPIC_API_KEY).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Catalog, CatKey, CuratedSpecies, Detail } from '../src/data/types';
import { buildCatalog, type Enrichment, type Gathered } from './catalog/pure';
import { addWikipedia, gatherInat, type WikiCache } from './catalog/sources';
import { ClaudeContent, DEFAULT_MODEL, type Pending } from './catalog/claude';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts: string[]) => resolve(root, ...parts);
const readJSON = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback);
const sorted = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const writeJSON = (file: string, data: unknown, pretty = true) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, (pretty ? JSON.stringify(data, null, 1) : JSON.stringify(data)) + '\n');
};

function args() {
  const a = process.argv.slice(2);
  const val = (name: string) => {
    const i = a.indexOf(name);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    offline: a.includes('--offline'),
    claude: !a.includes('--no-claude') && !a.includes('--offline'),
    maxEnrich: Number(val('--max-enrich') ?? process.env.MAX_ENRICH ?? 300),
    model: val('--model') || process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    waitMinutes: Number(val('--wait-minutes') ?? 300),
    only: val('--only')?.split(',') as CatKey[] | undefined,
  };
}

/**
 * Reconstructs the gathered species from the published catalog, so an offline rebuild
 * (e.g. after editing data/trees.json or data/enrichment.json) works without the network cache.
 */
function gatheredFromPublished(): Gathered[] {
  const cat = readJSON<Catalog | null>(p('public/data/catalog.json'), null);
  if (!cat) return [];
  const details: Record<string, Detail> = {};
  for (let i = 0; i < cat.shards; i++) Object.assign(details, readJSON<Record<string, Detail>>(p(`public/data/details/${i}.json`), {}));
  return cat.species
    .filter((e) => e.t != null)
    .map((e) => {
      const d = details[e.id];
      const wiki = (lang: 'en' | 'es', i: 0 | 1) => (d?.wiki?.[lang] && d.desc[i] ? { title: e.sci, extract: d.desc[i], url: d.wiki[lang]! } : undefined);
      return {
        taxonId: e.t!,
        sci: e.sci,
        // Trees are re-derived from data/trees.json; curated categories are re-applied from data/curated.json.
        cat: e.cat === 'tree' ? 'plant' : e.cat,
        obs: e.obs ?? 0,
        ...(e.cur ? {} : { nameEn: e.en !== e.sci ? e.en : undefined, nameEs: e.es !== e.en ? e.es : undefined }),
        introduced: !e.nat,
        iucn: e.iucn === 'NE' ? null : e.iucn,
        ...(d?.photo ? { photo: d.photo } : {}),
        ...(wiki('en', 0) ? { wikiEn: wiki('en', 0) } : {}),
        ...(wiki('es', 1) ? { wikiEs: wiki('es', 1) } : {}),
      } as Gathered;
    });
}

async function main() {
  const opt = args();
  const t0 = Date.now();
  const deadline = t0 + opt.waitMinutes * 60_000;
  const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(5)}s] ${m}`);

  const curated = readJSON<CuratedSpecies[]>(p('data/curated.json'), []);
  const enrichment = readJSON<Record<string, Enrichment>>(p('data/enrichment.json'), {});
  const trees = readJSON<Record<string, boolean>>(p('data/trees.json'), {});
  let pending = readJSON<Pending[]>(p('data/pending-batches.json'), []);
  const saveState = () => {
    writeJSON(p('data/enrichment.json'), sorted(enrichment));
    writeJSON(p('data/trees.json'), sorted(trees));
    writeJSON(p('data/pending-batches.json'), pending);
  };

  let claude: ClaudeContent | null = null;
  if (opt.claude) {
    if (!process.env.ANTHROPIC_API_KEY) log('ANTHROPIC_API_KEY not set: skipping Claude content.');
    else claude = new ClaudeContent(opt.model, log);
  }

  // 1. Collect batches submitted by earlier runs.
  if (claude && pending.length) {
    const still: Pending[] = [];
    for (const b of pending) {
      if (await claude.wait(b, Math.min(deadline, Date.now() + 10 * 60_000))) await claude.collect(b, trees, enrichment);
      else still.push(b);
    }
    pending = still;
    saveState();
  }

  // 2. Species list from iNaturalist + Wikipedia text.
  let gathered: Gathered[];
  const cacheFile = p('data/.cache/gathered.json');
  if (opt.offline) {
    gathered = readJSON<Gathered[]>(cacheFile, []);
    if (!gathered.length) gathered = gatheredFromPublished();
    log(gathered.length ? `Offline: rebuilding ${gathered.length} species without network` : 'Offline: nothing cached, building from curated data only');
  } else {
    const wikiCache = readJSON<WikiCache>(p('data/.cache/wiki.json'), {});
    const raw = await gatherInat({ only: opt.only, log });
    gathered = await addWikipedia(raw, wikiCache, log);
    writeJSON(p('data/.cache/wiki.json'), wikiCache, false);
    writeJSON(cacheFile, gathered, false);
  }

  // 3. Claude: tree classification for new plants, then content for the most-observed species without any.
  if (claude) {
    const curatedSci = new Set(curated.map((c) => c.sci.toLowerCase()));
    const inFlight = new Set(pending.flatMap((b) => Object.values(b.map).flat()));
    const plants = gathered.filter((g) => g.cat === 'plant' && !(g.sci in trees) && !curatedSci.has(g.sci.toLowerCase()) && !inFlight.has(g.sci));
    const todo = gathered
      .filter((g) => !enrichment[g.sci] && !curatedSci.has(g.sci.toLowerCase()) && !inFlight.has(g.sci) && (g.wikiEn || g.wikiEs))
      .sort((a, b) => b.obs - a.obs)
      .slice(0, Math.max(0, opt.maxEnrich));
    log(`Claude (${opt.model}): ${plants.length} plants to classify, ${todo.length} species to write. Estimated cost ≈ $${claude.estimate(todo, plants).toFixed(2)}`);
    const submitted = [await claude.submitTrees(plants), await claude.submitEnrich(todo)].filter((b): b is Pending => !!b);
    pending.push(...submitted);
    saveState();
    for (const b of submitted) {
      if (await claude.wait(b, deadline)) {
        await claude.collect(b, trees, enrichment);
        pending = pending.filter((x) => x.id !== b.id);
        saveState();
      }
    }
    log(`Claude usage this run: ${claude.usage.input} input + ${claude.usage.output} output tokens ≈ $${claude.usage.usd.toFixed(2)}`);
    if (claude.failures.length) log(`${claude.failures.length} Claude requests failed; they will be retried next run.`);
  }

  // 4. Build and write the catalog.
  const out = buildCatalog({ gathered, curated, enrichment, trees, generated: new Date().toISOString() });
  const catalog: Catalog = { generated: new Date().toISOString(), shards: out.shards, species: out.index };
  rmSync(p('public/data/details'), { recursive: true, force: true });
  writeJSON(p('public/data/catalog.json'), catalog, false);
  out.details.forEach((d, i) => writeJSON(p(`public/data/details/${i}.json`), d, false));
  saveState();

  const report = [
    '# Catalog build report',
    '',
    `Built ${catalog.generated.slice(0, 16).replace('T', ' ')} UTC from ${opt.offline ? 'cached data (offline)' : 'iNaturalist research-grade observations in Quintana Roo + Wikipedia'}.`,
    '',
    '| | Species |',
    '| --- | ---: |',
    ...Object.entries(out.stats).map(([k, v]) => `| ${k.replace('cat.', 'Category: ')} | ${v} |`),
    '',
    `Text sources: **curated** = hand-written in data/curated.json; **claude** = fun fact, size, colours and habitat written by Claude, grounded in Wikipedia (unverified); **wikipedia** = first sentence of the Wikipedia summary only.`,
    '',
    claude ? `Claude this run: ${claude.usage.input.toLocaleString()} input + ${claude.usage.output.toLocaleString()} output tokens ≈ **$${claude.usage.usd.toFixed(2)}** (batch pricing).` : 'Claude: not run.',
    pending.length ? `\n${pending.length} batch(es) still processing; the next run collects them.` : '',
    claude?.failures.length ? `\n## Failed Claude requests (retried next run)\n\n${claude.failures.map((f) => `- ${f}`).join('\n')}` : '',
    '',
  ].join('\n');
  writeFileSync(p('data/catalog-report.md'), report);
  log(`Wrote ${out.index.length} species in ${out.shards} detail shards.`);
  console.log('\n' + report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
