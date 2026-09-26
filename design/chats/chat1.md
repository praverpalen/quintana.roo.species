# Quintana Roo species explorer

_Started 2026-09-25 23:32 UTC_

---

## User

Design a mobile app for animal and tree species look up. The purpose of this application is to, in a playful and fun way, learn about the animal and tree species here in Quintana Roo, Mexico. The idea that I had is kind of like the same format as Pokémon cards. You will have the image of the species and then just some basic information:
- the name
- the color, etc.
- whether it's native or not
- some fun fact
If you click on the card, it opens the page of the species, and then you see more elaborate and detailed information about the species.

I'm building this application just for myself. Maybe eventually, friends and family can use it too, but it's simply that I can learn about the animals and tree species that I'm discovering here in my new home. It would be important to have a search engine so I can search on the name of the species. Also, it should be important to be able to sort:
- Is it about a tree?
- Is it about a marine species, like a fish?
- Is it about a bird?
- Is it about a mammal?
The application should be able to sort by type and category. Maybe even sort also on color. 

And the idea is to get a collection so that I can check the card once I have spotted and learned about this animal. Obviously, there's a basket of already checked animals, so I can also easily sort on that. Can you create a design for this, and then, eventually, code will include and gather all the information about the species?

## Assistant



## Assistant

_[tool: ask_user]_

I've put up a short form about card style, what goes on each card, how spotting works and which screens to design. Skip anything you don't care about and I'll decide.

## User

Answered — ds: Picked a design system (now attached); code: praverpalen/quintana.roo.species; card_style: Very card-game: foil borders, stats, rarity; card_fields: Common name, Native / introduced, Fun fact, Rarity, Size, Conservation status; collect: Checkmark + locked/greyed card until spotted; gamify: Collection progress per category; categories: Trees, Plants & flowers, Birds, Mammals, Reptiles & amphibians, Fish, Other marine (corals, turtles, rays), Insects & butterflies; language: Both (toggle); screens: Card grid + search/filters, Species detail page, My collection, Home / dashboard;…

## Assistant

_[tool: github_get_tree]_

_[tool: list_files]_

Repo is empty (409), so this starts from scratch. Reading the design system.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Repo is empty. Starting turn 1 with three card directions in the Organic system; the screens come after you pick one.

_[tool: dc_write]_

_[tool: write_file]_

_[tool: ready_for_verification]_

I made three card-game directions for you to choose from, using the Organic design system. Each shows a spotted native species (jaguar), a spotted introduced one (lionfish) and a locked card for a bird you haven't seen yet:

- **1a Classic holo:** a shiny foil frame, size shown where a Pokémon card has its HP, a fun-fact box and rarity dots.
- **1b Field-guide card:** a big photo with a check badge, and small panels for size, conservation status and native/introduced.
- **1c Sticker card:** the whole card in the category's colour, a round foil-framed photo, a "Spotted" sticker and the fun fact in a speech bubble.

Move your cursor over a card to tilt it and see the shine. The EN/ES toggle switches the card text between English and Spanish. The GitHub repo is empty, so this is designed from scratch and I noted the link in `github.md`.

Pick a direction, or mix parts of them, and I'll build the Home, card grid with search and filters, species detail and collection screens.

## User

Found issues — fixing…

## Assistant

_[tool: read_file]_

_[tool: grep]_

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

I fixed the two layout bugs; a final check is still running:

- **1a:** "#014 · Mammal" now stays on one line, and the photo area is slightly shorter and the same height on every card. To fit, the fun fact now shows 2 lines instead of 3.
- **1b:** the native/introduced tile now shows the full word, "Introduced" in English and "Introducida" in Spanish.

Pick 1a, 1b or 1c, or a mix, and I'll build the screens.

## User

I choose design 1a

## Assistant

_[tool: dc_write]_

_[tool: write_file]_

_[tool: dc_write]_

_[tool: write_file]_

_[tool: ready_for_verification]_

## User

Okay looks good. how do I start on claude code to build this.

## Assistant

_[tool: read_skill_prompt]_

_[tool: list_files]_

_[tool: copy_files]_

_[tool: write_file]_

_[tool: present_fs_item_for_download]_

The download above has everything Claude Code needs to build the app: a `README.md` describing every screen, the colours and fonts, and how the app should behave, plus the prototype files and the species data.

**To start:**
1. Download the handoff and unzip it into a clone of your `quintana.roo.species` repo, e.g. as `/design`.
2. Run `claude` in the repo folder.
3. Prompt it: *"Read design/README.md and build this app in Expo (React Native + TypeScript). Start with the species card, then Cards, Detail, Collection, Home. Load species from a JSON file based on design/species-data.js."*
4. Later: *"Write a script that gathers and checks species data from iNaturalist, GBIF and the IUCN Red List for Quintana Roo, including photos."*

The fun facts are placeholders I wrote, so check them before relying on them. There are no species photos yet.

Want screenshots of the screens added to the handoff?

