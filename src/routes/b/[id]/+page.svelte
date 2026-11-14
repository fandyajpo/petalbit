<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Bouquet from '$lib/components/Bouquet.svelte';
	import BouquetBackground from '$lib/components/BouquetBackground.svelte';
	import CopyLink from '$lib/components/CopyLink.svelte';
	import SoundToggle from '$lib/components/SoundToggle.svelte';
	import SocialShare from '$lib/components/SocialShare.svelte';
	import { getFlower } from '$lib/data/flowers';
	import { mEnter, mPress } from '$lib/actions/studio-motion';
	import { splitText } from '$lib/actions/motion';
	import { reveal } from '$lib/actions/reveal';
	import { playSound } from '$lib/sound';

	let { data }: { data: PageData } = $props();

	const bouquet = $derived(data.bouquet);
	const flowers = $derived(bouquet.flowers.flatMap((id) => getFlower(id) ?? []));
	const flowerGroups = $derived.by(() => {
		const groups = new Map<string, { flower: NonNullable<ReturnType<typeof getFlower>>; count: number }>();
		for (const id of bouquet.flowers) {
			const flower = getFlower(id);
			if (!flower) continue;
			const existing = groups.get(id);
			if (existing) existing.count += 1;
			else groups.set(id, { flower, count: 1 });
		}
		return [...groups.values()];
	});
	const initial = $derived(bouquet.recipient.trim().charAt(0).toUpperCase() || 'B');
	const cardFileName = $derived(
		`petalbit-${(bouquet.recipient || 'bouquet')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'bouquet'}.png`
	);

	let remaining = $state('');
	let opened = $state(false);

	function openBouquet() {
		if (opened) return;
		opened = true;
		playSound('open');
		window.dispatchEvent(new CustomEvent('petalbit:celebrate'));
	}

	onMount(() => {
		const end = new Date(data.expiresAt).getTime();
		const tick = () => {
			const ms = end - Date.now();
			if (ms <= 0) {
				remaining = 'This bouquet has expired';
				return;
			}
			const days = Math.floor(ms / 86_400_000);
			const hours = Math.floor(ms / 3_600_000) % 24;
			const minutes = Math.floor(ms / 60_000) % 60;
			if (days > 0) remaining = `${days}d ${hours}h left`;
			else if (hours > 0) remaining = `${hours}h ${minutes}m left`;
			else remaining = `${minutes}m left`;
		};
		tick();
		const timer = setInterval(tick, 60_000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{bouquet.recipient} got a bouquet from {bouquet.sender} · Petalbit</title>
	<meta
		name="description"
		content={`${bouquet.sender} sent ${bouquet.recipient} a pixel bouquet. Open the link to read the note.`}
	/>
	<meta name="robots" content="noindex" />
	<meta property="og:title" content={`${bouquet.sender} sent a bouquet for ${bouquet.recipient}`} />
	<meta
		property="og:description"
		content={`A pixel bouquet from ${bouquet.sender} for ${bouquet.recipient}. Open it to read the note.`}
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content={data.url} />
	<meta property="og:image" content={data.ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={data.ogImage} />
</svelte:head>

<section class="share">
	<div class="share-sound"><SoundToggle /></div>

	<div class="page-bg" aria-hidden="true">
		<BouquetBackground background={bouquet.background} />
		<span class="page-bg-scrim"></span>
	</div>

	<header class="share-head reveal" use:reveal>
		<p class="eyebrow">Pixel bouquet · {flowers.length} stems</p>
		<h1 use:splitText={{ step: 60 }}>For <em>{bouquet.recipient}</em>.</h1>
		<p class="sub">Sent by {bouquet.sender} · {data.createdLabel}</p>
	</header>

	{#if !opened}
		<div class="open-stage">
			<div class="open-card" use:mEnter={{ y: 22, scale: 0.98, blur: 5 }}>
				<button
					type="button"
					class="open-art"
					onclick={openBouquet}
					aria-label="Open your bouquet"
					use:mPress={{ hoverScale: 1.015, pressScale: 0.985, lift: -2 }}
				>
					<span class="envelope" aria-hidden="true">
						<span class="envelope-body"></span>
						<span class="envelope-flap"></span>
						<span class="envelope-label">{initial}</span>
						<span class="envelope-seal">
							<img src="/art/logo-mark.png" alt="" width="96" height="96" class="pixelated" />
						</span>
					</span>
				</button>

				<p class="open-eyebrow">{bouquet.sender} sent you something</p>
				<h2 class="open-title">For {bouquet.recipient}.</h2>
				<p class="open-sub">Tap the envelope to open the bouquet and read the note.</p>

				<button type="button" class="btn btn-primary open-btn" onclick={openBouquet} use:mPress>
					Open bouquet
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
	<div class="share-grid" use:mEnter={{ y: 16, scale: 0.99, blur: 4 }}>
		<div class="art-wrap" use:mEnter={{ y: 18, scale: 0.97, blur: 5, delay: 0.06 }}>
			<div class="art">
				<span class="art-seal" aria-hidden="true">
					<img src="/art/logo-mark.png" alt="" width="96" height="96" class="pixelated" />
				</span>
				<Bouquet flowers={bouquet.flowers} paper={bouquet.paper} layers={bouquet.layers} />
			</div>
			<p class="art-note">Built pixel by pixel, just for you.</p>
		</div>

		<article class="letter" use:mEnter={{ y: 14, delay: 0.08, blur: 3 }}>
			<div class="letter-top">
				<span class="letter-mark">{initial}</span>
				<span class="letter-label">A little note</span>
				{#if remaining}
					<span class="letter-badge">{remaining}</span>
				{/if}
			</div>

			<blockquote class="letter-quote">
				<p>{bouquet.message}</p>
			</blockquote>

			<p class="letter-sign">From {bouquet.sender}</p>

			<ul class="flower-tags">
				{#each flowerGroups as group (group.flower.id)}
					<li>
						<img src={group.flower.image} alt="" width="450" height="696" />
						<span>{group.flower.name}</span>
						{#if group.count > 1}
							<span class="flower-count">×{group.count}</span>
						{/if}
					</li>
				{/each}
			</ul>

			<div class="letter-share">
				<CopyLink value={data.url} label="Share this bouquet" />
				<SocialShare
					url={data.url}
					text={`${bouquet.sender} sent a pixel bouquet to ${bouquet.recipient}.`}
				/>
				<a class="save-card" href={data.cardImage} download={cardFileName}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M12 3v11M8 10l4 4 4-4M4 18v2h16v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					Save card
					<span class="save-meta">PNG · 1200×630</span>
				</a>
			</div>

			<div class="letter-expiry">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
				</svg>
				<p>
					This bouquet is here for 7 days after it was made. After that, the bouquet and message ghost automatically on <strong>{data.expiresLabel}</strong>.
				</p>
			</div>
		</article>
	</div>

	<div class="share-cta" use:mEnter={{ y: 12, delay: 0.16, blur: 3 }}>
		<div>
			<p class="cta-title">Wanna send your own bouquet?</p>
			<p class="cta-sub">Three steps, one minute, no account.</p>
		</div>
		<a class="btn btn-primary" href="/create">
			Make a bouquet
			<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
			</svg>
		</a>
	</div>
	{/if}
</section>

<style>
	.share {
		position: relative;
		isolation: isolate;
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(1.8rem, 4vw, 3rem) 1.25rem 1rem;
	}

	.share h1,
	.open-title,
	.letter-quote p {
		overflow-wrap: anywhere;
	}

	.share-sound {
		position: absolute;
		top: 0.9rem;
		right: 1.25rem;
		z-index: 6;
	}

	.page-bg {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
		background: var(--color-paper);
	}

	.page-bg :global(.scene-bg) {
		border-radius: 0;
	}

	.page-bg-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgb(247 240 231 / 0.28),
			rgb(247 240 231 / 0.56) 45%,
			rgb(247 240 231 / 0.8)
		);
	}

	.share-head {
		position: relative;
		z-index: 2;
		margin-bottom: clamp(1.4rem, 3.5vw, 2.2rem);
	}

	.share-head h1 {
		margin-top: 0.65rem;
		font-size: clamp(2.2rem, 6vw, 3.6rem);
	}

	.share-head h1 em {
		font-style: italic;
		font-weight: 400;
		color: var(--color-rose);
	}

	.sub {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		letter-spacing: 0.02em;
		color: var(--color-ink-faint);
	}

	.share-grid {
		position: relative;
		z-index: 2;
		display: grid;
		gap: clamp(1.2rem, 3vw, 2.2rem);
		align-items: center;
	}

	/* ------------------------------------------------------------------ art */
	.art-wrap {
		position: relative;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.art {
		position: relative;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background: radial-gradient(circle at 50% 30%, #fffaf3, var(--color-paper) 60%, #f6e9dc);
		box-shadow:
			8px 8px 0 0 var(--color-blush),
			8px 8px 0 2px var(--color-ink);
		padding: 0.8rem 0.6rem 0.4rem;
	}

	.art-seal {
		position: absolute;
		right: -0.85rem;
		top: -0.9rem;
		z-index: 5;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: 2px solid var(--color-ink);
		border-radius: 50%;
		background: var(--color-paper);
		box-shadow: 3px 3px 0 0 var(--color-blush);
		overflow: hidden;
		transform: rotate(8deg);
	}

	.art-seal img {
		width: 100%;
		height: 100%;
	}

	.art-note {
		margin-top: 0.9rem;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.78rem;
		color: var(--color-ink-faint);
	}

	/* --------------------------------------------------------------- letter */
	.letter {
		position: relative;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			repeating-linear-gradient(
				180deg,
				transparent 0,
				transparent 30px,
				rgb(43 31 34 / 0.045) 30px,
				rgb(43 31 34 / 0.045) 31px
			),
			var(--color-paper);
		box-shadow: 7px 7px 0 0 var(--color-cream-deep);
		padding: clamp(1.2rem, 3vw, 2rem);
	}

	.letter::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgb(43 31 34 / 0.05) 0.8px, transparent 0.9px);
		background-size: 3px 3px;
		opacity: 0.5;
		pointer-events: none;
	}

	.letter-top {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex-wrap: wrap;
		position: relative;
		z-index: 1;
	}

	.letter-mark {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border: 2px solid var(--color-ink);
		border-radius: 2px;
		background: var(--color-blush);
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-rose-deep);
		line-height: 1;
	}

	.letter-label {
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.letter-badge {
		margin-left: auto;
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		color: var(--color-rose-deep);
		background: var(--color-blush-soft);
		border: 1px solid var(--color-blush);
		padding: 0.16rem 0.4rem;
		border-radius: 2px;
		white-space: nowrap;
	}

	.letter-quote {
		margin: 1.1rem 0 0;
		position: relative;
		z-index: 1;
	}

	.letter-quote p {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(1.25rem, 3vw, 1.65rem);
		line-height: 1.55;
		letter-spacing: -0.01em;
		color: var(--color-ink);
		overflow-wrap: anywhere;
	}

	.letter-sign {
		margin-top: 0.8rem;
		font-family: var(--font-display);
		font-size: 0.92rem;
		color: var(--color-rose-deep);
		position: relative;
		z-index: 1;
	}

	.flower-count {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-rose-deep);
	}

	.flower-tags {
		list-style: none;
		padding: 0;
		margin: 1.2rem 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		position: relative;
		z-index: 1;
	}

	.flower-tags li {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		border: 1.5px solid rgb(43 31 34 / 0.12);
		border-radius: 2px;
		background: var(--color-cream);
		padding: 0.14rem 0.4rem 0.14rem 0.16rem;
		font-size: 0.68rem;
		color: var(--color-ink-soft);
	}

	.flower-tags img {
		height: 22px;
		width: auto;
	}

	.letter-share {
		margin-top: 1.35rem;
		position: relative;
		z-index: 1;
	}

	.save-card {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.8rem;
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: var(--color-paper-warm);
		padding: 0.42rem 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			color 180ms ease;
	}

	.save-card:hover {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.save-meta {
		font-size: 0.48rem;
		letter-spacing: 0.06em;
		opacity: 0.65;
	}

	.letter-expiry {
		margin-top: 0.9rem;
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		border-top: 2px dashed rgb(43 31 34 / 0.14);
		padding-top: 0.85rem;
		color: var(--color-ink-faint);
		position: relative;
		z-index: 1;
	}

	.letter-expiry svg {
		flex-shrink: 0;
		color: var(--color-rose);
		margin-top: 0.15rem;
	}

	.letter-expiry p {
		font-size: 0.74rem;
		line-height: 1.65;
	}

	.letter-expiry strong {
		color: var(--color-ink-soft);
		font-weight: 600;
	}

	/* ------------------------------------------------------------------- cta */
	.share-cta {
		margin-top: clamp(2rem, 5vw, 3.2rem);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.2rem;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			radial-gradient(circle at 90% 10%, rgb(242 214 212 / 0.9), transparent 55%),
			var(--color-blush-soft);
		padding: clamp(1.1rem, 3vw, 1.6rem);
		box-shadow: 5px 5px 0 0 var(--color-blush);
	}

	.cta-title {
		font-family: var(--font-display);
		font-size: clamp(1.15rem, 2.6vw, 1.45rem);
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	.cta-sub {
		margin-top: 0.2rem;
		font-size: 0.78rem;
		color: var(--color-ink-soft);
	}

	@media (min-width: 900px) {
		.share-grid {
			grid-template-columns: 1fr 1.02fr;
			gap: 2.6rem;
		}
	}

	/* ------------------------------------------------------------ open stage */
	.open-stage {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		padding: clamp(0.4rem, 2vw, 1.2rem) 0 clamp(1.6rem, 4vw, 2.6rem);
	}

	.open-card {
		width: 100%;
		max-width: 430px;
		text-align: center;
	}

	.open-art {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1 / 0.94;
		border: 1px solid rgb(25 17 16 / 0.16);
		border-radius: 18px;
		background: rgb(253 247 238 / 0.5);
		padding: 0;
		overflow: hidden;
		cursor: pointer;
		box-shadow: 0 22px 50px -32px rgb(25 17 16 / 0.55);
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.open-art:focus-visible {
		outline: 2px solid var(--color-rose);
		outline-offset: 3px;
	}

	.envelope {
		position: absolute;
		left: 50%;
		top: 50%;
		width: min(68%, 250px);
		aspect-ratio: 3 / 2;
		transform: translate(-50%, -50%) rotate(-1.5deg);
		filter: drop-shadow(0 12px 22px rgb(64 32 24 / 0.18));
	}

	.envelope-body {
		position: absolute;
		inset: 0;
		border: 1.5px solid rgb(74 48 38 / 0.55);
		border-radius: 6px;
		background: linear-gradient(160deg, #fdf4e6, #f3e2ca 65%, #eed9bd);
	}

	.envelope-flap {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 58%;
		background: linear-gradient(180deg, #f8ead4, #efdcbe);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		border-radius: 6px 6px 0 0;
	}

	.envelope-label {
		position: absolute;
		left: 50%;
		top: 58%;
		transform: translate(-50%, -50%);
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 4vw, 2.2rem);
		font-style: italic;
		color: rgb(109 29 41 / 0.45);
	}

	.envelope-seal {
		position: absolute;
		left: 50%;
		bottom: -12%;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
		border: 1.5px solid var(--color-ink);
		background: var(--color-blush);
		box-shadow: 2px 2px 0 0 rgb(25 17 16 / 0.25);
		overflow: hidden;
	}

	.envelope-seal img {
		width: 100%;
		height: 100%;
	}

	.open-eyebrow {
		margin-top: 1.2rem;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.open-title {
		margin-top: 0.45rem;
		font-size: clamp(1.9rem, 5vw, 2.7rem);
		letter-spacing: -0.035em;
		line-height: 1;
	}

	.open-sub {
		margin: 0.6rem auto 1.1rem;
		max-width: 34ch;
		font-size: 0.86rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
	}

	.open-btn {
		margin: 0 auto;
	}

	/* ============================================================ 2026 revamp */
	.share {
		max-width: 1120px;
		overflow: clip;
	}

	.share-head h1 {
		margin-top: 0.55rem;
		font-size: clamp(2.4rem, 6vw, 4rem);
		line-height: 0.94;
		letter-spacing: -0.045em;
	}

	.sub {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.art {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: var(--shadow-soft);
		padding: 0.7rem 0.5rem 0.35rem;
	}

	.art :global(.bouquet) {
		position: relative;
		z-index: 1;
	}

	.art-seal {
		border: 1px solid var(--color-ink);
		box-shadow: 2px 2px 0 0 var(--color-blush);
	}

	.art-note {
		font-size: 0.76rem;
	}

	.letter {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		box-shadow: none;
		background:
			repeating-linear-gradient(
				180deg,
				transparent 0,
				transparent 31px,
				rgb(25 17 16 / 0.05) 31px,
				rgb(25 17 16 / 0.05) 32px
			),
			var(--color-paper);
	}

	.letter-mark {
		border: 1px solid var(--color-ink);
		border-radius: var(--radius);
	}

	.letter-label,
	.letter-badge {
		font-family: var(--font-mono);
		letter-spacing: 0.12em;
	}

	.letter-badge {
		border-radius: var(--radius);
	}

	.letter-quote p {
		letter-spacing: -0.015em;
	}

	.flower-tags li {
		border: 1px solid var(--color-rule-soft);
		border-radius: var(--radius);
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.letter-expiry {
		border-top: 1px dashed var(--color-rule);
	}

	.share-cta {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background:
			radial-gradient(circle at 92% 8%, rgb(236 207 202 / 0.75), transparent 55%),
			var(--color-paper-warm);
		box-shadow: none;
	}

	.cta-title {
		font-size: clamp(1.2rem, 2.6vw, 1.5rem);
		letter-spacing: -0.03em;
	}

	.cta-sub {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}
</style>
