<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Bouquet from '$lib/components/Bouquet.svelte';
	import CopyLink from '$lib/components/CopyLink.svelte';
	import FloatingPetals from '$lib/components/FloatingPetals.svelte';
	import { getFlower } from '$lib/data/flowers';
	import { splitText } from '$lib/actions/motion';

	let { data }: { data: PageData } = $props();

	const bouquet = $derived(data.bouquet);
	const flowers = $derived(bouquet.flowers.flatMap((id) => getFlower(id) ?? []));
	const initial = $derived(bouquet.recipient.trim().charAt(0).toUpperCase() || 'B');

	let remaining = $state('');

	onMount(() => {
		const end = new Date(data.expiresAt).getTime();
		const tick = () => {
			const ms = end - Date.now();
			if (ms <= 0) {
				remaining = 'Buket ini sudah berakhir';
				return;
			}
			const days = Math.floor(ms / 86_400_000);
			const hours = Math.floor(ms / 3_600_000) % 24;
			const minutes = Math.floor(ms / 60_000) % 60;
			if (days > 0) remaining = `Tersisa ${days} hari ${hours} jam`;
			else if (hours > 0) remaining = `Tersisa ${hours} jam ${minutes} menit`;
			else remaining = `Tersisa ${minutes} menit`;
		};
		tick();
		const timer = setInterval(tick, 60_000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{bouquet.recipient} menerima buket dari {bouquet.sender} — Petalbit</title>
	<meta
		name="description"
		content={`“${bouquet.message.slice(0, 120)}” — buket bunga digital dari ${bouquet.sender} untuk ${bouquet.recipient}.`}
	/>
	<meta name="robots" content="noindex" />
	<meta property="og:title" content={`${bouquet.sender} mengirim buket untuk ${bouquet.recipient}`} />
	<meta property="og:description" content={bouquet.message} />
	<meta property="og:type" content="article" />
	<meta property="og:image" content="/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<section class="share">
	<div class="share-glow" aria-hidden="true"></div>
	<div class="share-petals" aria-hidden="true">
		<FloatingPetals count={5} />
	</div>

	<header class="share-head">
		<p class="eyebrow">Buket digital · {flowers.length} tangkai</p>
		<h1 use:splitText={{ step: 60 }}>Untuk <em>{bouquet.recipient}</em>.</h1>
		<p class="sub">Dikirim oleh {bouquet.sender} · {data.createdLabel}</p>
	</header>

	<div class="share-grid">
		<div class="art-wrap">
			<div class="art">
				<span class="art-seal" aria-hidden="true">
					<img src="/art/logo-mark.png" alt="" width="96" height="96" class="pixelated" />
				</span>
				<Bouquet flowers={bouquet.flowers} />
			</div>
			<p class="art-note">Dirangkai pixel per pixel, khusus untukmu.</p>
		</div>

		<article class="letter">
			<div class="letter-top">
				<span class="letter-mark">{initial}</span>
				<span class="letter-label">Pesan spesial</span>
				{#if remaining}
					<span class="letter-badge">{remaining}</span>
				{/if}
			</div>

			<blockquote class="letter-quote">
				<p>{bouquet.message}</p>
			</blockquote>

			<p class="letter-sign">— {bouquet.sender}</p>

			<ul class="flower-tags">
				{#each flowers as flower (flower.id)}
					<li>
						<img src={flower.image} alt="" width="450" height="696" />
						<span>{flower.name}</span>
					</li>
				{/each}
			</ul>

			<div class="letter-share">
				<CopyLink value={data.url} label="Bagikan buket ini" />
			</div>

			<div class="letter-expiry">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
				</svg>
				<p>
					Buket ini hanya bertahan selama 7 hari setelah dibuat. Setelah itu, buket dan pesanmu
					akan menghilang secara otomatis — pada <strong>{data.expiresLabel}</strong>.
				</p>
			</div>
		</article>
	</div>

	<div class="share-cta">
		<div>
			<p class="cta-title">Mau mengirim buketmu sendiri?</p>
			<p class="cta-sub">Tiga langkah, satu menit, tanpa akun.</p>
		</div>
		<a class="btn btn-primary" href="/create">
			Buat Buket
			<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
			</svg>
		</a>
	</div>
</section>

<style>
	.share {
		position: relative;
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(1.8rem, 4vw, 3rem) 1.25rem 1rem;
	}

	.share-glow {
		position: absolute;
		inset: -8rem -10% auto;
		height: 34rem;
		background:
			radial-gradient(ellipse at 30% 20%, rgb(242 214 212 / 0.75), transparent 55%),
			radial-gradient(ellipse at 80% 10%, rgb(233 168 179 / 0.3), transparent 50%);
		pointer-events: none;
		z-index: -1;
	}

	.share-petals {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
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

	/* ============================================================ 2026 revamp */
	.share {
		max-width: 1120px;
		overflow: clip;
	}

	.share-glow {
		background: radial-gradient(ellipse 46% 42% at 28% 16%, rgb(236 207 202 / 0.62), transparent 60%);
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
