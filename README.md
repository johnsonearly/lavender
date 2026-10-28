# Lavender — personal wardrobe & styling assistant

Lavender helps you digitize your closet, combine what you already own on a styling mannequin, get outfit suggestions from a stylist, explore aesthetics, and plan looks on a calendar.

It runs **fully in the browser with no accounts or API keys** (demo mode, IndexedDB). It can optionally use **Supabase** for accounts, Postgres, and private photo storage, and **Claude** for a conversational stylist.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

On first run, the onboarding flow lets you start with an **illustrated sample wardrobe** (15 pieces, 4 outfits, all labelled “Sample”) or with an empty closet. You can load or remove the samples later in **Settings**.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (TypeScript + React hooks rules) |
| `npm test` | Vitest unit tests (domain logic, persistence, stylist) |

## Features

- **Onboarding**: welcome, aesthetics (15 moodboard cards), styling goals, optional practical preferences (colors, categories, occasions, fit, budget). No body measurements. Every step is skippable, and you can redo it from Settings.
- **Home**: personal greeting, today’s planned outfit, quick actions, live stats, wardrobe-based suggestions, recently added pieces, and inspiration moodboards.
- **My Wardrobe**: search, filters (category, color, season, style, occasion, favorites), six sort orders, grid and list views, favorites, a detail dialog, edit, delete with confirmation, and multi-select to send pieces to the Studio or the Stylist.
- **Add / edit pieces**: photo upload, drag-and-drop, or camera. Type and size validation, crop/zoom/rotate to 3:4, optional *plain-background* removal, and WebP compression. Fields include category and type, up to 4 colors, pattern, fit, style tags (including custom ones), seasons, occasions, brand, notes, and purchase info. Pieces without a photo get a generated illustration.
- **Outfit Studio**: a faceless croquis mannequin with three views (Illustrated, Photos placed on the figure, Flat lay). Composition rules apply automatically: a dress replaces a separate top and bottom, shoes swap, and jewelry is capped. “Complete the look” fills gaps from your own wardrobe. Feedback covers color harmony, style consistency, occasion fit, season, real weather, and proportions. The optional harmony score is explicitly labelled a heuristic and can be hidden. You can save, save as new, duplicate, create variations, plan, and mark as worn.
- **AI Stylist**: a chat with sample prompts. Each suggested outfit has a name, the actual pieces (clickable), aesthetic, occasion, explanation, footwear and layer alternatives, and a weather note when relevant. It also handles capsule-wardrobe, “more combinations”, and wardrobe-gap requests; any purchase ideas are clearly marked as not owned. Any outfit can be saved or opened in the Studio, and “Show me different options” asks again.
- **Style Discovery**: a library of 15 aesthetics (palette, garments, footwear, accessories, principles), a blend explorer for 2–3 aesthetics, a preference-strength control, “in your wardrobe” matches kept separate from editorial inspiration, and a 6-question quiz that updates your profile.
- **Outfit Calendar**: week and month views, assign/edit/remove plans, protection against planning the same outfit twice on one day, multiple looks per day, a trip and event planner, and a de-duplicated packing list with checkboxes and copy.
- **Insights**: counts, category and color breakdowns, most worn, least used, most versatile, frequent color pairings, a capsule built from what you own, and optional gap ideas. All of it is calculated from your stored data; with fewer than 3 pieces it shows an explanation instead of made-up numbers.
- **Profile & Settings**: profile and style preferences, tag rename/remove across pieces, opt-in weather (browser location or city search), privacy toggles, JSON export, sample management, delete all data, and (with Supabase) delete account and sign out.

## Architecture

```
src/
  config/brand.ts          Product name & copy (rename the app here)
  domain/                  Pure, tested logic — no React
    types.ts, schemas.ts   Typed models + Zod validation
    categories.ts colors.ts occasions.ts aesthetics.ts   Extensible catalogs
    outfitRules.ts         Composition rules (slots, swaps, validation)
    evaluation.ts          Styling feedback heuristics
    filters.ts calendar.ts insights.ts records.ts weather.ts
  rendering/               Mannequin + garment vector library and preview "layers"
  services/
    ai/                    Stylist contract, local engine, request parser, response validation, remote client
    weather.ts             Optional Open-Meteo forecast
  data/                    DataStore interface, IndexedDB store, Supabase store, sample wardrobe
  lib/                     Image processing (crop, background removal), color + utils
  state/                   App data provider, toasts, item-detail dialog
  components/              UI kit, layout/navigation, garments, wardrobe, outfits, aesthetics
  pages/                   Route screens (lazy-loaded)
supabase/
  migrations/              SQL schema, indexes, cascades, RLS, private storage bucket
  functions/stylist        Claude-powered stylist (server-side key)
  functions/delete-account Removes photos + auth user (service role, server-side)
```

The UI talks only to `DataStore` (`src/data/store.ts`) and to `askStylist` (`src/services/ai`). That keeps persistence and AI swappable.

## Optional: Supabase backend

1. Create a Supabase project, then apply the migration in `supabase/migrations/`. Either run `supabase db push` with the Supabase CLI, or paste the SQL into the SQL editor. It creates the tables, foreign keys with cascade rules, indexes, owner-only **row-level security** on every table, and a **private** `wardrobe-images` bucket whose policies restrict each user to their own `<user-id>/` folder.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Deploy the account-deletion function: `supabase functions deploy delete-account`. It uses the service-role key that Supabase injects server-side.
4. Restart `npm run dev`. The app now shows a sign-in screen; each account’s data is isolated by RLS.

Photos are served through signed URLs that expire after 6 hours (reload to refresh).

## Optional: Claude-powered stylist

The browser never sees an LLM key. The `stylist` Edge Function does the following:

- loads the signed-in user’s own wardrobe through RLS
- calls Claude (`claude-opus-5-5`, effort `low`) with a JSON-schema structured output
- enables Anthropic’s server-side refusal fallback (`fallbacks: "default"`)
- strips any item id the user doesn’t own

The client then validates the response again with Zod against the local inventory.

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy stylist
# .env.local
VITE_ENABLE_REMOTE_STYLIST=true
```

If the function fails or takes longer than 30 seconds, the app falls back to the built-in engine and says so in the chat. Without this setup, the **built-in engine** answers. It is deterministic and works offline, scoring pieces on color harmony, occasion and formality, season or forecast, style tags and your preferences, while respecting shoe constraints and anchor pieces.

## Optional: weather

Weather is **off by default**. When you enable it in Settings with your location (rounded to about 1 km) or a city search, Lavender fetches a forecast from the free, key-less [Open-Meteo](https://open-meteo.com) API. When weather is off or unavailable, Lavender shows no weather and says so.

## Mannequin preview: what it is and isn’t

- **Illustrated view**: each piece is drawn from its category, type, colors and pattern on a generic, faceless croquis. These are styling sketches, not garment simulations. Fabric, drape, exact cut and your body are **not** represented.
- **Photos view**: your photos are placed into category zones (top, bottom, shoes…) but **not warped or fitted**. Photos with backgrounds appear as framed tiles.
- **Flat lay**: your actual photos side by side, which is the most faithful view.
- The renderer is isolated in `src/rendering/`. `buildPreview(items)` returns layers, so it could be replaced by an AI virtual try-on service later.

**Background removal** is a local flood-fill heuristic. It works on plain, evenly lit backgrounds and warns when the result looks unreliable. It is not AI segmentation, and nothing is uploaded until you save.

## Tests

`npm test` runs 51 unit tests covering clothing validation, outfit composition rules, wardrobe filtering, IndexedDB persistence (save/reload, cascades, per-user isolation), calendar assignment and packing lists, the recommendation engine and request parser, and validation of AI-returned item ids.

## Known limitations

- The Supabase store and both Edge Functions are written against the documented APIs but haven’t been run against a live project in this repo. Demo mode is the fully verified path.
- There is no import yet (export only). HEIC photos must be converted to JPG first.
- Seasons assume the northern hemisphere unless a weather location in the southern hemisphere is set.
# lavender
