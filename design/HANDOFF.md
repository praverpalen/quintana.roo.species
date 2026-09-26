# Handoff: Quintana Roo Species Explorer

## Overview
A personal mobile app for learning about the animal and tree species of Quintana Roo, Mexico. Every species is a collectible trading card. Cards start locked (greyed) and unlock once the user marks the species as spotted. The app has search, filters (category, spotted status, origin, colour), sorting, per-category progress and a bilingual EN/ES toggle.

Target repo: `praverpalen/quintana.roo.species` (currently empty).

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML**. They are prototypes showing the intended look and behaviour, not production code to copy. The task is to **recreate these designs in a real app framework**. The repo is empty, so pick a stack. Recommended: **Expo (React Native + TypeScript)** so the app runs on the owner's phone and can be shared with friends and family via Expo Go or TestFlight later. A PWA (Vite + React + TypeScript) is an acceptable lighter alternative.

To view the prototypes, serve this folder locally (e.g. `npx serve .`) and open `Species Explorer.dc.html`. They need `support.js` next to them and must be served over http, not opened as a file.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii and interactions are final. Recreate them closely using the tokens below.

## Screens / Views
Phone viewport is 390×844. Content has 16px side padding. There is a bottom tab bar with 3 tabs (Home, Cards, Collection), and the Detail screen slides over everything.

### 1. Species card (core component — `SpeciesCard.dc.html`)
Design size is **240×340** and is scaled per context (grid 0.72 ≈ 173px wide, Home carousel 0.55, Detail hero 0.85).
- **Frame:** 7px padding, radius 18, background `conic-gradient(from 210deg, accent-300, neutral-100, accent-400, accent-2-200, accent-200, neutral-100, accent-300)` (the "foil"), shadow-md.
- **Inner:** radius 12, padding 9/11/10, vertical flex with gap 6. Background is the category **tint** colour.
- **Rows, top to bottom:**
  1. Name (Caprasimo 17, category **deep** colour, ellipsis) with "SIZE" (8px/700, letter-spacing .08em) plus the size value (Caprasimo 14) on the right. Size is styled like the HP value on a trading card.
  2. Scientific name (Figtree 10.5 italic, neutral-700, margin-top −5).
  3. Art window: 112px tall, radius 8, 3px accent-300 border. It will hold the species photo (currently a striped placeholder).
  4. Meta row: "#014 · Mammal" (10px/600, nowrap) on the left and an origin pill on the right (Native: accent-2-200 background with accent-2-800 text; Introduced: accent-200 background with accent-800 text).
  5. IUCN badge: a 24px circle in the deep colour with the code (LC/NT/VU/EN/CR/NE) and the label next to it.
  6. Fun-fact box: neutral-100 background, radius 8, "FUN FACT" label (8.5px/700, .1em), text 10.5/1.35 clamped to 2 lines.
  7. Footer: 4 rarity dots (7px, filled = deep colour, empty = neutral-300) plus the rarity label on the left, and a "✓ Spotted" pill (deep background, cream text) on the right.
- **Locked state:** neutral-300 frame, neutral-200 inner, "?" in place of the size, a 52px grey "?" circle in place of the art, and the text "You haven't seen this one yet. Spot it to unlock the card!" plus a dashed "Not yet spotted" pill. The name, scientific name, number and category stay visible so the user knows what to look for.
- **Holo effect (pointer devices):** on pointer move, `perspective(700px) rotateY((x-.5)*14deg) rotateX((.5-y)*14deg) scale(1.03)`, plus a radial white highlight overlay following the pointer (soft-light blend). Reset on leave. On mobile you can drive this from the gyroscope, or drop it.

### 2. Home
- Header: "¡Hola! · Quintana Roo" (13/600, accent-700), then an H1 "What will you spot today?" (Caprasimo 30). The EN/ES segmented pill sits top-right.
- A fake search field (48px pill, surface fill) that navigates to Cards and focuses the search input.
- Progress hero: accent fill, radius 32, decorative circles. It shows "Your collection", the number spotted (Caprasimo 48) "of N spotted", and a 10px progress bar. Tapping it opens Collection.
- "By category" list: 8 rows (radius 22, neutral-100). Each row has a 38px tinted circle with the spotted count, the category name, "x/y" and a 6px bar in the category colour. Tapping a row opens Cards filtered to that category.
- "Recently spotted": a horizontal carousel of the 6 most recent cards (scale 0.55) with a "See all" link to Collection.

### 3. Cards (grid + search/filters)
- H1 "All cards".
- Search input (48px pill, leading search icon, clear "×" button when there is text). It matches the English name, Spanish name, scientific name and Maya name, ignoring accents and case.
- Category chips (horizontal scroll): All plus the 8 categories, each with a colour dot. The active chip is filled with the text colour.
- A segmented control (All / Spotted / To find) and a "Filters" button. The button shows a count badge, e.g. "Filters · 2".
- The Filters panel (neutral-100, radius 28) contains:
  - Origin: All / Native / Introduced
  - Colour: 30px swatches plus an "Any" option; the active swatch has a ring
  - Sort: Number / A–Z / Rarity
- Result count and a "Clear filters" link.
- A 2-column grid with 12px gaps (a 3-column option exists as a tweak).
- Empty state: "?" circle, message and a Clear button.

### 4. Species detail (slides in from the right, 380ms `cubic-bezier(.2,.8,.2,1)`)
- Hero: category tint background with two decorative circles, a round back button (42px), and the card itself at 0.85 scale.
- Number and category (mono 12), name (Caprasimo 30, deep colour), scientific name plus "· Maya: Balam".
- Tags: origin, rarity, IUCN.
- **Not spotted:** a primary 52px button "I spotted it!". It unlocks the card, records today's date and shows the toast "Card unlocked!".
- **Spotted:** a sage pill "✓ Spotted on 18 Sep 2026" with an Undo link.
- Fun-fact callout (neutral-100, radius 28/28/28/8, Caprasimo 18).
- About paragraph (15/1.55).
- Stat tiles: Size and Rarity.
- IUCN scale strip LC NT VU EN CR EW EX. The current status is filled with the deep colour and scaled to 1.08, followed by a note line.
- Colours (swatches with labels), Habitat (sage tags), and "Where to spot it" (pill rows with a map-pin icon).

### 5. My collection
- H1 and "x of N spotted".
- Category chips showing counts. Only categories with spotted cards appear.
- Sort segmented control: Recent / A–Z / Rarity.
- Grid of spotted cards, each with its spotted date underneath (11.5px, neutral-700).
- Empty state with an "Explore cards" button.

### Tab bar
84px tall, neutral-100, with a top divider. Each tab has an icon inside a 56×32 pill plus an 11/600 label. Active: accent-200 pill and accent-800 colour. Inactive: neutral-700. Icons (Lucide, stroke 2.75): house, layers, circle-check.

## Interactions & Behavior
- Tapping any card opens Detail. Locked cards open too, so the user can learn where to look.
- Toggling spotted updates the card, the progress counts, Collection and Home immediately.
- The toast appears for 1.8s, fading and moving up 12px over 250ms.
- Changing tabs resets the scroll position to the top.
- The language toggle switches all UI copy and species content. Numbers and scientific names stay the same.

## State Management
- `spotted: Record<speciesId, ISODate>` and `lang: 'en'|'es'`. Persist both (AsyncStorage/SQLite, or localStorage for a PWA).
- UI state: `tab`, `detailId`, `q`, `cat`, `status (all|spotted|unspotted)`, `origin`, `color`, `sort (no|name|rarity)`, `showFilters`, `colCat`, `colSort (recent|name|rarity)`.
- Card numbers (#001…) come from the species order grouped by category: tree, plant, bird, mammal, reptile, fish, marine, insect.

## Data
`species-data.js` contains 29 seed species. The schema:
```
id, cat, sci, maya, n (rarity 0–3: Common/Uncommon/Rare/Legendary), nat (1 native / 0 introduced),
iucn (LC|NT|VU|EN|CR|NE), size, col[] (green brown yellow orange red pink purple blue black white grey),
hab[] (jungle coast mangrove reef sea town cenote), where[] (place names),
en: [name, funFact, description], es: [name, funFact, description]
```
**The facts are placeholders and must be verified.** Suggested sources for gathering and verifying data: iNaturalist API (photos, observations in Quintana Roo), GBIF, IUCN Red List API (status), CONABIO / Enciclovida (Mexican species and Spanish names), Wikipedia/Wikidata (descriptions). Keep attribution and licence per photo.

## Design Tokens (Organic design system — see `_ds/.../styles.css`)
- Background `#f5ead8`, surface `#ebddc5`, text `#201e1d`, accent `#c67139`, accent-2 (sage) `#7a8a5e`, divider = text at 16% opacity.
- Ramps: neutral-100 `#f9f4ed`, 200 `#eee7db`, 300 `#dcd3c4`, 500 `#a19786`, 600 `#82796a`, 700 `#645c50`, 800 `#474238`, 900 `#2e2b25`. Accent 100 `#fff2eb`, 200 `#ffe1d0`, 300 `#ffc6a5`, 400 `#f6a06b`, 600 `#b2622d`, 700 `#8c491a`, 800 `#643312`. Accent-2 200 `#e1eecc`, 700 `#56633f`, 800 `#3d472b`, 900 `#272e1b`.
- **Category colours** (OKLCH; all categories share the same lightness and chroma and differ only in hue): col `oklch(0.62 0.11 H)`, deep `oklch(0.42 0.09 H)`, tint `oklch(0.94 0.035 H)`, stripe `oklch(0.87 0.05 H)`. Hues: tree 140, plant 350, bird 185, mammal 45, reptile 105, fish 250, marine 215, insect 305.
- Fonts: Caprasimo (headings, 400) and Figtree (400/600/700), both from Google Fonts.
- Radii: 8 / 16 / 28. Buttons, inputs and chips are fully rounded pills (999px).
- Shadows: sm `0 1px 2px rgba(46,43,37,.14)`, md `0 3px 10px rgba(46,43,37,.16)`, lg `0 12px 32px rgba(46,43,37,.22)`.
- Focus: 2px accent outline with a 2px offset.

## Assets
- Icons: Lucide (house, layers, circle-check, search, sliders-horizontal, x, arrow-left, map-pin, check, lock), stroke-width 2.75.
- Species photos are **not included**. The striped placeholders mark where they go. Source them from iNaturalist or Wikimedia Commons (check each licence), or use your own photos.

## Files
- `Species Explorer.dc.html`: the full prototype (all screens and logic).
- `SpeciesCard.dc.html`: the card component (normal and locked states).
- `Species Cards.dc.html`: the card explorations. Option 1a was chosen.
- `species-data.js`: the seed data.
- `_ds/…/styles.css`: the design tokens.
