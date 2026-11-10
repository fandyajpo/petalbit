<script lang="ts">
	type Props = { class?: string; count?: number };
	let { class: klass = '', count = 7 }: Props = $props();

	const all = [
		{ left: '6%', top: '-6%', size: 18, drift: '34px', spin: '210deg', duration: 15, delay: -3 },
		{ left: '22%', top: '-10%', size: 13, drift: '-26px', spin: '-180deg', duration: 19, delay: -9 },
		{ left: '44%', top: '-8%', size: 16, drift: '18px', spin: '240deg', duration: 17, delay: -6 },
		{ left: '63%', top: '-12%', size: 12, drift: '40px', spin: '-220deg', duration: 21, delay: -12 },
		{ left: '78%', top: '-6%', size: 20, drift: '-30px', spin: '190deg', duration: 16, delay: -2 },
		{ left: '90%', top: '-10%', size: 14, drift: '22px', spin: '-260deg', duration: 20, delay: -14 },
		{ left: '34%', top: '-4%', size: 11, drift: '-18px', spin: '170deg', duration: 23, delay: -17 }
	];

	const petals = $derived(all.slice(0, Math.max(0, Math.min(all.length, count))));
</script>

<div class="petals {klass}" aria-hidden="true">
	{#each petals as petal, i}
		<img
			src={`/art/petal-${(i % 4) + 1}.png`}
			alt=""
			width="44"
			height="52"
			class="petal pixelated"
			style="left:{petal.left}; top:{petal.top}; width:{petal.size}px; --drift:{petal.drift}; --spin:{petal.spin}; animation-duration:{petal.duration}s; animation-delay:{petal.delay}s;"
		/>
	{/each}
</div>

<style>
	.petals {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 1;
	}

	.petal {
		position: absolute;
		height: auto;
		animation-name: petal-drift;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
		opacity: 0.75;
		filter: drop-shadow(0 2px 0 rgb(43 31 34 / 0.08));
	}

	@media (prefers-reduced-motion: reduce) {
		.petal {
			display: none;
		}
	}
</style>
