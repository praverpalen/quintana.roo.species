# Quintana Roo Species Explorer

A personal app for learning the animals and trees of Quintana Roo as collectible trading cards. Cards stay locked until you mark a species as spotted. It has search, filters (category, spotted status, origin, colour), sorting, per-category progress and an EN/ES toggle.

It's built as a **PWA** (Vite + React + TypeScript). Open it on your phone and use "Add to Home Screen" to install it. After the first load it works offline.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (filters, search, i18n, data script helpers)
npm run build      # production build in dist/
```

End-to-end tests (Playwright, 390×844):

```bash
npx playwright install chromium   # once
npx playwright test               # screenshots land in test-results/shots/
```

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`. Turn it on under **Settings → Pages → Source: GitHub Actions**. You can then share the URL with friends and family.

## Species data

The app loads its catalog at runtime from `public/data/`:
- `catalog.json` holds every species' names, category, rarity, IUCN status and colours. It's small enough to search instantly.
- `details/*.json` holds fun facts, descriptions, sizes, photos and sources, split into shards of about 40 species that load on demand.

`scripts/build-catalog.ts` generates both. For every species with research-grade iNaturalist observations in Quintana Roo, it:

1. Takes the species list, observation counts, EN/ES names, the native/introduced flag and the global IUCN status from **iNaturalist**, plus an openly licensed (CC) photo: the default photo, else another of the taxon's photos, else the most-voted research-grade observation photo from Quintana Roo.
2. Takes the EN and ES summaries (CC BY-SA, credited in the app) from **Wikipedia**.
3. Uses **Claude** (Batches API, half price) in two jobs:
   - It classifies plants as tree or not, 100 names per request.
   - It writes a fun fact, size, colours, habitat and how to tell males from females for the most-observed species that don't have them yet, up to `--max-enrich` per run. Results are saved in `data/enrichment.json`, so every run continues where the last one stopped.
4. Computes rarity from observation counts within each category: the top 40% are Common, then 30% Uncommon, 20% Rare and 10% Legendary.
5. Merges `data/curated.json` on top. These are the 29 hand-written species; they keep their text, Maya names and rarity, but take the IUCN status from iNaturalist.

Species without Claude content show the first sentence of their Wikipedia summary as the card text. Claude-written content is marked in the app as automatic and may contain mistakes.

### Running it

**GitHub (recommended):** go to **Actions → Update species data → Run workflow**. It opens a pull request with the new data and a report (`data/catalog-report.md`); merging it deploys the new catalog. It needs:
- An `ANTHROPIC_API_KEY` repository secret (**Settings → Secrets and variables → Actions**). Without it the run still works but skips Claude.
- **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"** turned on.

**Locally:**

```bash
ANTHROPIC_API_KEY=... npm run build-catalog -- --max-enrich 300
npm run build-catalog -- --no-claude      # iNaturalist + Wikipedia only
npm run build-catalog -- --offline        # rebuild from data/ and the local cache, no network
```

Claude batches usually finish within an hour but can take up to 24. If a run stops waiting, the batch id is saved in `data/pending-batches.json` and the next run collects it. The report lists the tokens used and the cost at batch prices.

To correct or improve a species, add it to `data/curated.json`, matched by scientific name. Curated entries always win.

## Your own photos

On a species page, **Add my photo** opens the camera or photo library. Photos are downscaled to 1600 px and stored **only on this phone** (IndexedDB); they are never uploaded. Adding a photo marks the species as spotted, and your newest photo replaces the stock photo on the card. Deleting the app or clearing its site data deletes them.

## Backup

**Collection → Backup → Export backup** saves one `qroo-species-backup-YYYY-MM-DD.json` file with your spotted dates and all your own photos (on phones via the share sheet, so you can pick *Save to Files* → iCloud Drive). **Import backup** merges such a file back in: species you already spotted keep their date, photos already present are skipped, nothing is deleted.

## Storage

Spotted dates and the language are stored in `localStorage` under the key `qroo-explorer-v1`, keyed by species id. Curated species keep their short ids (`jaguar`); generated ones use their scientific name (`quiscalus-mexicanus`), so ids stay stable when the catalog is rebuilt. They stay on the device. Clearing site data resets the collection.

## Design

`design/` holds the Claude Design handoff: the prototypes (`Species Explorer.dc.html`, `SpeciesCard.dc.html`), the Organic design system and the chat transcript. The tokens are copied into `src/organic.css`.
