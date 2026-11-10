<script lang="ts">
	import { FLOWERS } from '$lib/data/flowers';

	const items = [...FLOWERS, ...FLOWERS];
</script>

<div class="ticker" aria-hidden="true">
	<div class="track">
		{#each items as flower, i (i)}
			<span class="item">
				<span class="index">{String((i % FLOWERS.length) + 1).padStart(2, '0')}</span>
				<span class="name">{flower.name}</span>
				<span class="latin">{flower.latin}</span>
				<img src={`/art/petal-${(i % 4) + 1}.png`} alt="" width="44" height="52" class="pixelated petal" />
			</span>
		{/each}
	</div>
</div>

<style>
	.ticker {
		position: relative;
		overflow: hidden;
		border-block: 1px solid var(--color-rule);
		background: var(--color-paper-warm);
		padding: 0.78rem 0;
		mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
	}

	.track {
		display: flex;
		width: max-content;
		align-items: center;
		animation: marquee-x 52s linear infinite;
	}

	.ticker:hover .track {
		animation-play-state: paused;
	}

	.item {
		display: inline-flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0 1.9rem;
		position: relative;
	}

	.item + .item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.1rem;
		bottom: 0.1rem;
		width: 1px;
		background: var(--color-rule);
	}

	.index {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.08em;
		color: var(--color-rose);
		align-self: center;
	}

	.name {
		font-family: var(--font-display);
		font-size: 1.02rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--color-ink);
	}

	.latin {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.74rem;
		color: var(--color-ink-faint);
	}

	.petal {
		width: 11px;
		height: auto;
		opacity: 0.8;
		align-self: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.track {
			animation: none;
		}
	}
</style>
