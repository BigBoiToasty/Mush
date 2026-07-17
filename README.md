# Mush

A digital 9-pocket binder for Pokémon card collectors. Search the [TCGdex](https://tcgdex.dev/) card database, place real cards into a 3×3 grid, flip between pages, and see your collection laid out the way it'd sit on a shelf — online or off.

## Features

### Accounts
- Sign up/in with a username + password (usernames are mapped to a synthetic email under the hood, so no real email address is required).
- Google OAuth sign-in; first-time Google users are prompted to pick a username since Google doesn't provide one.
- Sessions persist offline — if a background token refresh fails without a connection, the app falls back to the last known session instead of logging you out.

### Binders
- Unlimited named binders per account, switchable from a binder menu. A new account gets an auto-created "My Binder".
- Rename or delete a binder (deleting requires at least one binder to remain, with a two-step confirm).
- Each binder is paginated in fixed 9-card (3×3) spreads, navigated like flipping pages.
- Move a card between slots, or drop it on an occupied slot to swap the two.
- **Export/Import as CSV** — export a binder to CSV (page, slot, card ID/name, variant, language, image) and re-import it later, upserting into matching slots. Import validates the file and reports row-numbered errors instead of partially applying a bad file.

### Card search & adding cards
- Search TCGdex by card name, with a language selector (English, Japanese, Simplified Chinese, Traditional Chinese). Searching a non-English language from a Latin-script query is bridged via the card's National Pokédex number so names don't have to match across languages.
- Selecting a result opens the card detail view to choose a print variant before adding it to an empty or occupied slot.
- Search requires a connection — offline, it's disabled with a message pointing you to in-binder search instead.

### Card detail
- Full card info: image, rarity, set name/size, illustrator, and current TCGplayer market price for the variant you own.
- Pick which real print variant you own when a card has more than one (Normal, Holo, Reverse Holo, 1st Edition, Promo Stamp).
- Independently override the visual foil/holo effect applied to a card (Standard Holo, Reverse Holo, Cosmos, Galaxy, Radiant, VMAX, VSTAR, Secret Rare, Trainer Gallery, or Auto). "Auto" infers an era-appropriate effect from the card's rarity and set when you haven't picked one yourself.
- Tap the card image to zoom.

### Holographic card effects
- Real-time, pointer-tracked holo/foil rendering: glare, shine, and 3D tilt follow the cursor as you move it across a card, matching the physical feel of the actual foil pattern (Cosmos, Galaxy, Rainbow, Secret Rare, Trainer Gallery, etc).
- Pointer-tracking math and per-rarity CSS are adapted from [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) (GPL-3.0), re-implemented against plain DOM refs instead of Svelte.

### Customization
- Recolor every button in the app from six preset skins (Tide, Kelp, Abyss, Coral, Sand, Obsidian) or pick a fully custom border/fill/text color, previewed live before applying.
- Upload a custom background image per binder (any resolution, auto-fit), or reset to the default.

### Binder stats & completion
- **Binder Info** panel: total cards, total pages, and a live "Worth" total — the sum of TCGplayer market prices for every card's owned variant.
- **Set completion** tracking: shows how many cards you own from a given set against the full set list.
- **Find in Binder**: search your own collection by name, across the current binder or all of your binders — works fully offline.

### Sharing
- Turn on a public share link for a binder (revocable — turning it off invalidates the old link immediately).
- Anyone with the link gets a read-only view: browse pages and search the binder, no login and no editing. A wrong or guessed link token returns nothing rather than leaking another user's binder.
- A previously-loaded shared binder keeps working from cache if the viewer's connection drops mid-session.

### Offline support
- After a binder loads once online, the app quietly syncs your entire collection in the background — every page's card placements and every card image — so the whole binder is browsable with no network. An "Offline ready" notice confirms when this is done.
- Placing or removing a card while offline updates the UI immediately and queues the change; queued changes replay automatically once you're back online, in order, safely re-playable even if a replay is interrupted.
- Conflict handling is last-write-wins by design (binders are single-owner) — there's no cross-device merge for simultaneous edits.

## Stack

React 19 + Vite 7 · Tailwind CSS 4 · Supabase (auth + Postgres + Storage) · vite-plugin-pwa (offline caching) · Vitest · deployed on Vercel

SEO basics are in place for the logged-out landing page: descriptive title/meta description, Open Graph + Twitter card tags, canonical URL, `robots.txt`, and `sitemap.xml`.

## Getting started

```bash
npm install
```

Create a `.env` with your Supabase project credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

Then:

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview the production build
```

## Testing

```bash
npx vitest run
```

Coverage focuses on the logic most likely to break silently: offline sync/cache/queue behavior, auth, card data fetching, and the foil/holo heuristic.

## Known limits

- Binder pages are fixed at 9 slots (3×3); no cap on number of pages or binders.
- No real-time multi-device sync — each device reconciles only its own queued offline writes on reconnect, not other devices' concurrent changes.
- Pricing is TCGplayer market price only (no Cardmarket data).
