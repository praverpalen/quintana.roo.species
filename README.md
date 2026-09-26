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

- `src/data/species.json` is the catalogue: 29 seed species taken from the design handoff. Its schema is in `src/data/types.ts`.
- **The fun facts and descriptions are placeholders written during design and must be verified.**
- `npm run fetch-species` checks every species against **iNaturalist** and **GBIF**. It needs internet access to `api.inaturalist.org` and `api.gbif.org`.
  - It adds a CC-licensed photo with its attribution and the iNaturalist taxon id.
  - It counts research-grade observations in Quintana Roo.
  - It writes `scripts/verification-report.md` listing IUCN, name, rarity and taxonomy differences.
  - It never overwrites names, facts or rarity. `--apply` updates only the IUCN status. `--only jaguar,ceiba` limits the run to the species you list.
- Until photos are baked in, the app fetches each spotted species' iNaturalist default photo in the browser. It only uses CC-licensed photos, caches them for 30 days and shows the credit on the detail screen.

To add a species, append an entry to `species.json`. Card numbers are derived from the category order (tree, plant, bird, mammal, reptile, fish, marine, insect), so adding a tree renumbers every card after it.

## Storage

Spotted dates and the language are stored in `localStorage` under the key `qroo-explorer-v1`. They stay on the device. Clearing site data resets the collection.

## Design

`design/` holds the Claude Design handoff: the prototypes (`Species Explorer.dc.html`, `SpeciesCard.dc.html`), the Organic design system and the chat transcript. The tokens are copied into `src/organic.css`.
