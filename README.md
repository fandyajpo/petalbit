# Petalbit

**Little pixels, lovely flowers.**

Petalbit is a free digital bouquet generator. Pick up to seven pixel-art flowers,
write a short note, and share a single link. Every bouquet lives for exactly
seven days, then disappears on its own — no accounts, no feeds, no archive.

Built with SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind CSS 4, Upstash Redis
and Vercel.

## Pages

| Route        | What it does                                                                 |
| ------------ | ---------------------------------------------------------------------------- |
| `/`          | Landing page: intro loader, hero bouquet, how it works, flower collection, donation |
| `/create`    | Three-step studio: pick flowers, write the note, review and generate          |
| `/b/[id]`    | The shared bouquet: note, flower list, live countdown, copy-link button       |
| `+error`     | Friendly 404/503 page for expired or missing bouquets                         |

`/create?bunga=mawar,peony` pre-selects flowers, which is what the collection
cards on the landing page link to.

## Getting started

Requires Node 20+ (developed on Node 22).

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

Without Redis credentials the server logs
`Upstash not configured — using in-memory bouquet store for dev.` Bouquets are
kept in a module-level `Map` on `globalThis`, so they survive Vite HMR but not a
server restart. This fallback refuses to run in production: a deployed instance
without Upstash returns `503` when a bouquet is saved or read.

### Environment variables

Copy `.env.example` to `.env` and fill in the two Upstash values:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

1. Create a free database at [upstash.com](https://upstash.com).
2. Open the database → **REST API** → copy `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
3. Paste them into `.env` (local) or into the Vercel project settings.

Both are read through `$env/dynamic/private` in
`src/lib/server/bouquet-store.ts`, so they are never bundled into client code.
Never commit `.env`.

## Scripts

| Command           | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR                                       |
| `npm run build`   | Production build via `@sveltejs/adapter-vercel`                |
| `npm run preview` | Preview the production build locally                           |
| `npm run check`   | `svelte-check` type and a11y diagnostics                       |
| `npm run art`     | Regenerate every pixel asset in `static/art` and `static/og.png` |

## Artwork

All artwork is generated procedurally by `scripts/generate-art.mjs` — no image
dependencies, no binary sources to maintain. The script rasterises flowers from
superellipse petals with per-pixel lighting, HSL ramps, Bayer dithering and a
hard alpha threshold, then encodes PNGs with a small zlib/CRC32 encoder.

- `npm run art` rewrites `static/art/**`, `static/og.png`, `static/favicon.png`
  and the review sheets in `scripts/review/`.
- Output is deterministic; tweaking parameters in the script changes every
  sprite consistently.
- Flower sprites are 450×696 with the stem anchored at the bottom centre. The
  geometry is authored in a 150×232 art space and rasterised at 3×
  (`SS` in the script), so petal edges, veins and freckles get sub-pixel
  detail while the bouquet still fans the stems by rotating around that anchor.
- Flower heads are built in layers rather than one silhouette: guard petals,
  an inner cup, occlusion shading (`baseShade`), rim-light sheen on the lit
  side, a raised centre (spiral florets for the sunflower, a domed disc for the
  daisy) and freckled throats with stamens for the lily. Leaves carry a midrib
  and lateral veins, and rose/daisy leaves get a toothed margin
  (`teeth`/`toothDepth` on `petal`) instead of a plain blade; rose canes also
  carry thorns.
- Everything above ground is built from one skeleton: `stemPath()` returns the
  stalk curve, leaves are placed by node height with `leafOnStem()` (which sits
  them on the curve and paints them *before* the stalk so the blade emerges from
  behind it), and `drawStem()` then runs the stalk into the bloom. That is why
  leaves, stem and flower read as one plant instead of three floating shapes.
- Species-specific anatomy rather than one template: rose spiral heart with
  guard petals, peony ruffles, tulip cup of six tepals, daisy ray rows over a
  seeded disc, sunflower golden-angle florets, lily tepals with blush tips and
  six stamens, orchid sepals/petals around a labellum and column, iris with
  three standards, three falls and golden beards, lavender whorls of florets,
  and eucalyptus foliage.
- Flower and sprig images are scaled smoothly (`image-rendering: auto`) now that
  they carry 3× detail; the paper, ribbon and UI sprites keep the crisp
  nearest-neighbour look.
- The wrap is split into `bouquet-paper.png` and `bouquet-ribbon.png` so the
  stems can sit between them and the ribbon can cover the convergence point.

## Motion and touch

Every bouquet is alive: each stem sways gently around its base with its own
duration and phase, so a seven-flower bunch never moves in lockstep. Tap or
click a flower and it squashes with a springy wobble while a few pixel petals and
warm glints drift away from the bloom. The effect is decorative — the bouquet
keeps its `role="img"` label for screen readers, and all of it is skipped under
`prefers-reduced-motion: reduce`.

The hero passes `hint` to `Bouquet.svelte`, which shows a one-time
"Sentuh bunganya" pill until the first tap.

The bunch is laid out in two woven rows. Stems alternate between a raised back
row (smaller, slightly dimmed, lifted) and a lower front row, and the inner
positions are pushed outward from the middle, so the first flower no longer sits
in front of the entire fan. Crowded bouquets also widen their fan angle and
shrink a little with each extra stem, which keeps every head's edge visible.

Name mapping for the nine stems: rose = `mawar`, peony = `peony`, tulip =
`tulip`, daisy = `daisy`, sunflower = `matahari`, lily = `bakung`, orchid =
`anggrek`, iris = `iris`, lavender = `lavender` (plus `eukaliptus` as foliage).

## Interface and motion

The look is an editorial, warm-paper system rather than a generic card grid:
hairline rules, a two-pixel radius, ink-and-rose accents, `Fraunces` for display
type and a monospaced face for labels and figures. Tokens live in `@theme` in
`src/app.css` (surfaces, ink, accents, `--radius`, `--ease-*`), with `.shell`,
`.btn`, `.sheet`, `.mono`, `.eyebrow`, `.tag` and the field styles in
`@layer components`.

Motion is native Svelte, no animation dependency. `src/lib/actions/motion.ts`
holds five small actions that markup opts into:

| Action       | What it does                                                       |
| ------------ | ------------------------------------------------------------------ |
| `splitText`  | Masks each word of a heading and lifts it into place on scroll      |
| `magnet`     | Pulls buttons toward the cursor, with a soft release                |
| `tilt`       | Subtle 3D tilt plus `--mx/--my` for the light position              |
| `spotlight`  | Tracks the cursor so `.spot` can paint a soft highlight             |
| `countUp`    | Counts a number up once it scrolls into view                        |

They are all no-ops for coarse pointers and under `prefers-reduced-motion`.
`src/lib/actions/reveal.ts` handles the plain scroll fade, and it is
bidirectional: blocks rise in from the bottom edge as they appear and drift out
when they leave past the top, so the page keeps moving instead of animating once.
Split headings replay the same way, their words sinking back behind the mask.
The header condenses on scroll, runs a one-pixel progress rail along its bottom
edge, slides a pill behind the hovered link and swaps to a full-height menu
panel under 760px.

## Adding a flower

1. Add a draw function in `scripts/generate-art.mjs`, push it into the
   `flowers` array and run `npm run art` (or drop a 450×696 PNG into
   `static/art/flowers/`).
2. Add an entry to `src/lib/data/flowers.ts` with `id`, `name`, `latin`, `tone`,
   `description`, `image` and `maxPerBouquet`.
3. That is it — the picker, preview, landing collection and share page all read
   from the same catalog.

## Data model

```ts
type Bouquet = {
  id: string; // 12 chars, unguessable, crypto.randomUUID-based
  sender: string;
  recipient: string;
  message: string;
  flowers: string[]; // 1–7 flower ids, in the order chosen
  createdAt: string; // ISO timestamp
};
```

- Redis key: `bouquet:{id}`, written with `SET … EX 604800` (7 days).
- Request bodies are validated with Zod in `src/lib/validation.ts` (shared by the
  form and the API). The API answers `400` with per-field Indonesian messages,
  `201` with `{ id, url, expiresIn, bouquet }`, or `503` when storage is down.
- IDs are checked against `/^[a-z0-9]{8,24}$/` before touching Redis.
- Consent is not collected; the message is only ever visible to whoever holds
  the link, and it is deleted by Redis when the TTL expires.

## Deploying to Vercel

1. Push the repository to GitHub/GitLab.
2. Import the project in Vercel — the SvelteKit preset is detected automatically.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` under
   **Settings → Environment Variables** for Production and Preview.
4. Deploy. `npm run build` uses `@sveltejs/adapter-vercel` and emits the server
   route for the API plus the prerendered pages.

Health check after deploy: open `/create`, generate a bouquet, then open the
returned link and confirm the countdown and flower list. A `503` on generate
means the Upstash variables are missing or wrong.

## Project layout

```
src/
  app.css                  design tokens + shared component classes
  lib/
    actions/reveal.ts      scroll-reveal action
    components/            Brand, SiteHeader/Footer, Bouquet, IntroLoader, …
    data/flowers.ts        flower catalog and starter bouquets
    server/bouquet-store.ts Upstash client + memory fallback
    types.ts               shared types, TTL and field limits
    validation.ts          Zod schema used by client and server
  routes/
    +page.svelte           landing
    create/+page.svelte    bouquet studio
    b/[id]/                share page (server load + page)
    api/bouquets/+server.ts
scripts/generate-art.mjs   procedural pixel-art renderer
static/art/                generated sprites and wrap assets
```

Styling lives in `src/app.css` (Tailwind 4 `@theme` tokens plus `.btn`,
`.field-input`, `.reveal`, keyframes). Components are hand-written; there is no
UI library, no CSS framework beyond Tailwind utilities, and no client-side state
library.
# petalbit
