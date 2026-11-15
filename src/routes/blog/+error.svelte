<script lang="ts">
	import { page } from '$app/state';
	import '$lib/blog/journal.css';

	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} · The Petalbit Journal</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="journal missing">
	<div class="shell inner">
		<div class="art" aria-hidden="true">
			<span>{status}</span>
			<img src="/art/flowers/iris.png" alt="" width="450" height="696" />
		</div>
		<div class="copy">
			<p class="eyebrow">Journal</p>
			<h1>{status === 404 ? 'This page never made it to print.' : 'The journal hit a snag.'}</h1>
			<p>
				{status === 404
					? 'The essay or chapter you were looking for is not here. Browse the journal, or start with the featured story.'
					: 'Something went wrong while loading this page. Try again in a moment.'}
			</p>
			<div class="actions">
				<a class="btn btn-primary" href="/blog">Back to the journal</a>
				<a class="btn" href="/">Home</a>
			</div>
		</div>
	</div>
</section>

<style>
	.missing {
		padding-block: clamp(2.5rem, 7vw, 5rem);
		min-height: calc(100svh - 12rem);
		display: grid;
		align-items: center;
	}

	.inner {
		display: grid;
		gap: clamp(1.5rem, 4vw, 3rem);
		align-items: center;
		max-width: 940px;
	}

	.art {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 260px;
	}

	.art img {
		width: min(52%, 220px);
		height: auto;
		transform: rotate(8deg);
		opacity: 0.9;
	}

	.art span {
		position: absolute;
		font-family: var(--font-display);
		font-size: clamp(5rem, 18vw, 9rem);
		line-height: 1;
		color: color-mix(in srgb, var(--color-ink) 7%, transparent);
	}

	.copy h1 {
		margin-top: 0.7rem;
		font-size: clamp(2.1rem, 5vw, 3.3rem);
	}

	.copy > p:not(.eyebrow) {
		margin-top: 0.9rem;
		max-width: 48ch;
		font-size: 0.9rem;
		line-height: 1.72;
		color: var(--color-ink-soft);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		margin-top: 1.4rem;
	}

	@media (min-width: 780px) {
		.inner {
			grid-template-columns: 0.85fr 1.15fr;
		}
	}
</style>
