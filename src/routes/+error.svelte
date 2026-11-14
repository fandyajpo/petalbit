<script lang="ts">
	import { page } from '$app/state';
	import { splitText } from '$lib/actions/motion';
	import { reveal } from '$lib/actions/reveal';

	const status = $derived(page.status);
	const message = $derived(
		page.error?.message ?? 'Something unexpected went sideways. Try refreshing this page.'
	);
	const heading = $derived(
		status === 404 ? 'This bouquet ghosted.' : 'Something wilted here.'
	);
</script>

<svelte:head>
	<title>{status} · Petalbit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="oops">
	<div class="oops-inner">
		<div class="oops-art reveal reveal-zoom" aria-hidden="true" use:reveal>
			<span class="code">{status}</span>
			<img src="/art/flowers/mawar.png" alt="" width="450" height="696" />
			<span class="floor"></span>
		</div>

		<div class="oops-copy reveal" use:reveal={{ delay: 120 }}>
			<p class="eyebrow">{status === 404 ? 'Page not found' : 'Uh oh'}</p>
			<h1 use:splitText={{ step: 55 }}>{heading}</h1>
			<p class="msg">{message}</p>
			<p class="hint">
				{status === 404
					? 'This link might be wrong, or the bouquet already dipped after 7 days.'
					: 'Give it another shot, or head back home and start fresh.'}
			</p>
			<div class="actions">
				<a class="btn btn-primary" href="/">Back home</a>
				<a class="btn" href="/create">Make a bouquet</a>
			</div>
		</div>
	</div>
</section>

<style>
	.oops {
		max-width: 960px;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 4rem) 1.25rem;
		min-height: calc(100svh - 10rem);
		display: grid;
		align-items: center;
	}

	.oops-inner {
		display: grid;
		gap: clamp(1.6rem, 4vw, 3rem);
		align-items: center;
	}

	.oops-art {
		position: relative;
		display: grid;
		place-items: center;
		padding: 1.6rem 1rem 2rem;
	}

	.oops-art img {
		width: min(70%, 240px);
		height: auto;
		transform: rotate(12deg) translateY(8px);
		filter: saturate(0.85);
		opacity: 0.9;
	}

	.code {
		position: absolute;
		inset: auto 0 36% 0;
		text-align: center;
		font-family: var(--font-display);
		font-size: clamp(5rem, 18vw, 9rem);
		line-height: 1;
		padding-top: 0.06em;
		letter-spacing: -0.06em;
		color: color-mix(in srgb, var(--color-ink) 7%, transparent);
		pointer-events: none;
	}

	.floor {
		position: absolute;
		bottom: 1.2rem;
		left: 50%;
		width: 52%;
		height: 10%;
		transform: translateX(-50%);
		background: radial-gradient(
			ellipse at center,
			color-mix(in srgb, var(--color-rose-deep) 22%, transparent),
			transparent 70%
		);
	}

	.oops-copy h1 {
		margin-top: 0.7rem;
		font-size: clamp(2.2rem, 5vw, 3.2rem);
	}

	.msg {
		margin-top: 1rem;
		font-size: 0.94rem;
		line-height: 1.75;
		color: var(--color-ink-soft);
		max-width: 46ch;
		overflow-wrap: anywhere;
	}

	.hint {
		margin-top: 0.9rem;
		font-size: 0.78rem;
		line-height: 1.7;
		color: var(--color-ink-faint);
		max-width: 46ch;
	}

	.actions {
		margin-top: 1.7rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}

	@media (min-width: 820px) {
		.oops-inner {
			grid-template-columns: 0.85fr 1.15fr;
		}
	}

	/* ============================================================ 2026 revamp */
	.oops {
		max-width: 1000px;
		padding-block: clamp(2.5rem, 6vw, 4.4rem);
	}

	.oops-copy h1 {
		margin-top: 0.7rem;
		font-size: clamp(2.2rem, 5.4vw, 3.4rem);
		letter-spacing: -0.045em;
		line-height: 0.95;
	}

	.oops-copy .msg {
		font-size: 0.92rem;
	}

	.hint {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.05em;
		line-height: 1.9;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}
</style>
