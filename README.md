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
| `/create`    | Three-step studio: pick flowers, write the note (optionally record 10s), review and generate |
| `/b/[id]`    | The shared bouquet: note, optional voice note, flower list, live countdown, copy-link button |
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
DISCORD_BOUQUET_WEBHOOK_URL=   # optional, see below
PINATA_JWT=                    # optional, enables voice notes
PINATA_GATEWAY=                # optional, e.g. fun-llama-300.mypinata.cloud
QSTASH_TOKEN=                  # required for voice-note cleanup
VOICE_EXPIRY_SECRET=           # required for voice-note cleanup
```

1. Create a free database at [upstash.com](https://upstash.com).
2. Open the database → **REST API** → copy `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
3. Paste them into `.env` (local) or into the Vercel project settings.

Both are read through `$env/dynamic/private` in
`src/lib/server/bouquet-store.ts`, so they are never bundled into client code.
Never commit `.env`.

### Discord notifications (optional)

Set `DISCORD_BOUQUET_WEBHOOK_URL` to a Discord webhook URL and every created
bouquet posts a short summary to that channel: sender, recipient, message,
flowers, bouquet id, and when it expires.

- The delivery runs after the bouquet is saved and never blocks or fails the API
  response; failures are only logged. On Vercel it is kept alive with
  `waitUntil`, so the webhook request still completes after the response is sent.
- The webhook URL is read through `$env/dynamic/private` in
  `src/lib/server/discord.ts`, so it stays on the server. Leave it unset and no
  requests are made.
- To rotate it, edit the webhook in Discord (or create a new one) and update the
  environment variable in Vercel.

### Voice notes (optional)

A bouquet can carry one optional voice note: up to 10 seconds, encoded in the
browser to 128 kbps MP3, then pinned to Pinata (IPFS). If either Pinata variable
is unset the recorder shows a short "not set up yet" hint and bouquets still
work without audio.

1. Create an API key at [app.pinata.cloud](https://app.pinata.cloud/developers/api-keys)
   with `org:files:write` and copy the **JWT** into `PINATA_JWT`.
2. Optionally set `PINATA_GATEWAY` to your dedicated gateway host. Without it,
   playback falls back to `gateway.pinata.cloud`, which is slower.
3. Restart the dev server (Vite reads `.env` at boot) or redeploy on Vercel.

How it works: the browser records with `MediaRecorder` (webm/opus in Chrome,
mp4/aac in Safari), decodes it with the Web Audio API, trims to 10 seconds,
mixes to mono and encodes MP3 with `@_mehrad/lamejs` (~31 kB gzip, loaded lazily
only when someone records). The MP3 is sent as part of `POST /api/bouquets`
(multipart form data), which checks the MIME type, size, magic bytes and the
real duration read from the frame header, mints the bouquet id, then uploads the
audio to `uploads.pinata.cloud/v3/files` with `network=public` and
`keyvalues = { app: "petalbit", bouquetId }`. The JWT stays on the server and
the bouquet only stores the CID, gateway URL and duration.

### Voice note cleanup (no cron)

Upstash Redis cannot notify a webhook about expiry: keyspace notifications exist
only on a persistent pub/sub connection, which serverless functions cannot hold.
Instead each voiced upload is queued in Redis and one [QStash](https://upstash.com/qstash)
message is scheduled per **upload hour**, delayed `7d` — the same lifetime as the
bouquet. When it fires, `POST /api/voice/expire-batch` reads that hour's queue,
checks every bouquet in one `MGET`, and deletes only the pins whose bouquet is
gone.

- `voice:queue:<YYYYMMDDHH>` holds `bouquetId|fileId|cid` lines;
  `voice:scheduled:<bucket>` marks that the bucket has a message. Both expire
after 8 days, one more than the bouquet, so a bucket always outlives its message.
  A bucket is written only during its own hour, then sealed, so processing never
  races a new upload.
- One message per hour caps QStash at 24 messages/day instead of one per bouquet;
  the free plan's 1,000/day becomes a non-issue.
- A run handles up to 50 clips with at most 4 Pinata deletes in flight, so a big
  bucket stays under Pinata's rate limit. `429`/`5xx` responses stop the run and
  the bucket is nudged again in 60s instead of hammering the API.
- Existence is read with a single `MGET` per chunk rather than one `EXISTS` per
  bouquet, which keeps Redis command usage flat as a bucket grows.
- Set `QSTASH_TOKEN` (Upstash console → **QStash** tab → API keys) and
  `VOICE_EXPIRY_SECRET` (any random 16+ chars). The token is used to publish;
  the secret is forwarded as a bearer header so the expiry routes can reject
  anything else (`401`). Do not paste the **Redis REST token** here — it looks
  similar but QStash rejects it with `401 invalid token`; the publish call logs
  that case explicitly.
- The free QStash plan allows 1,000 messages/day and a maximum delay of exactly
  7 days. If you ever extend `BOUQUET_TTL_SECONDS`, move to pay-as-you-go or the
  publish will be rejected.
- An entry joins the queue only after its bucket message is published, so a
  failed publish cannot leave audio that nothing will ever clean up. Two
  simultaneous uploads in the same hour may publish a duplicate bucket message;
  duplicates are harmless because deletes tolerate `404` and the queue is
  idempotent.
- The message fires at the **first** upload of an hour + 7d, so a clip uploaded
  later in that hour is still inside its own TTL when it arrives. Such entries
  stay queued and the bucket is re-armed at the earliest real `PTTL` (plus a
  15s cushion), not on a fixed minute — five 60s nudges could never cover a
  59-minute gap. A bucket-close schedule (`7d + up to 1h`) is not publishable on
  the free plan, which caps a delay at exactly 7 days; re-arming from the live
  TTL always stays inside that cap. Re-arms are capped at 3 and logged if a
  bucket somehow keeps reporting live clips.
- QStash retries failed deliveries (5 here). Delete failures get up to 5
  minute-apart retries; chunk continuation (a bucket with more than 50 clips)
  only publishes another message when the run actually deleted something, so a
  live-only queue re-arms instead of looping.
- `npm test` covers the re-arm math and the continuation decision, including
  two clips created minutes apart in the same hour (the regression where the
  earlier clip's file could be stranded).
- `POST /api/voice/expire` still exists for the single-bouquet messages published
  before batching; new bouquets only use `/api/voice/expire-batch`.
- If scheduling fails during creation the file is unpinned and the request
  returns `503`, so a bouquet never exists with unmanaged audio.
- QStash cannot call localhost, so local uploads skip scheduling (the server logs
  a warning). Those local test clips need manual cleanup; production is covered.
- To exercise the loop quickly, set `VOICE_EXPIRY_DELAY=45s` and expose the dev
  server with a tunnel; the delay override only changes the QStash schedule.
- Deleting a file removes it from Pinata and unpins it. It cannot retract copies
  other IPFS nodes may already hold, so treat pinned audio as public forever:
  never upload anything private.

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
   Add `DISCORD_BOUQUET_WEBHOOK_URL` there too if you want bouquet pings.
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
