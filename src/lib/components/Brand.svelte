<script lang="ts">
	type Props = {
		size?: 'sm' | 'md';
		inverted?: boolean;
		href?: string;
		showTagline?: boolean;
	};

	let { size = 'md', inverted = false, href = '/', showTagline = false }: Props = $props();
</script>

<a {href} class="brand" class:inverted aria-label="Petalbit, ke beranda">
	<span class="mark" class:mark-sm={size === 'sm'}>
		<img src="/art/logo-mark.png" alt="" width="96" height="96" class="pixelated" />
	</span>
	<span class="text">
		<span class="wordmark" class:wordmark-sm={size === 'sm'}>Petalbit</span>
		{#if showTagline}
			<span class="tagline">Little pixels, lovely flowers.</span>
		{/if}
	</span>
</a>

<style>
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--color-ink);
	}

	.mark {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background: var(--color-paper);
		box-shadow: 3px 3px 0 0 var(--color-blush);
		overflow: hidden;
		transition: transform 200ms ease;
	}

	.mark img {
		width: 100%;
		height: 100%;
		display: block;
	}

	.mark-sm {
		width: 2.1rem;
		height: 2.1rem;
		box-shadow: 2px 2px 0 0 var(--color-blush);
	}

	.brand:hover .mark {
		transform: rotate(-4deg) translateY(-1px);
	}

	.text {
		display: flex;
		flex-direction: column;
		line-height: 1;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	.wordmark-sm {
		font-size: 1.15rem;
	}

	.tagline {
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		color: var(--color-ink-soft);
		margin-top: 0.35rem;
		font-style: italic;
		font-family: var(--font-display);
	}

	.inverted {
		color: var(--color-cream);
	}

	.inverted .mark {
		border-color: var(--color-cream);
		background: #3a2c2f;
		box-shadow: 3px 3px 0 0 var(--color-rose-deep);
	}

	.inverted .tagline {
		color: rgb(247 240 231 / 0.65);
	}
</style>
