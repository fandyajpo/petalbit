<script lang="ts">
	/**
	 * Slow, scattered ring outlines that sit in the page texture.
	 * Positions come from a fixed seed so server and client render the same
	 * markup (no hydration mismatch) while still looking random.
	 */
	type Cluster = {
		x: number;
		y: number;
		size: number;
		radii: number[];
		dash: (string | undefined)[];
		stroke: number;
		opacity: number;
		duration: number;
		delay: number;
		spin: number;
		driftX: number;
		driftY: number;
		scale: number;
		color: string;
	};

	function mulberry32(seed: number) {
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	const PALETTE = ['var(--color-rose)', 'var(--color-lilac)', 'var(--color-rose-deep)'];
	const rand = mulberry32(20261111);

	const clusters: Cluster[] = Array.from({ length: 9 }, (_, index) => {
		const size = 90 + Math.round(rand() * 170);
		const ringCount = 2 + Math.round(rand());
		const radii = Array.from({ length: ringCount }, (_, ring) => 82 - ring * (12 + rand() * 14));
		const dashed = rand() > 0.35;

		return {
			x: Math.round(rand() * 88),
			y: Math.round(rand() * 84),
			size,
			radii: radii.filter((radius) => radius > 16),
			dash: radii.map((_, ring) =>
				dashed && (ring === 0 || rand() > 0.5)
					? `${(1.5 + rand() * 3).toFixed(1)} ${(5 + rand() * 8).toFixed(1)}`
					: undefined
			),
			stroke: 0.5 + rand() * 0.5,
			opacity: 0.07 + rand() * 0.05,
			duration: 38 + Math.round(rand() * 44),
			delay: -Math.round(rand() * 40),
			spin: (index % 2 === 0 ? 1 : -1) * Math.round(90 + rand() * 210),
			driftX: Math.round((rand() - 0.5) * 46),
			driftY: Math.round((rand() - 0.5) * 46),
			scale: 1.02 + rand() * 0.06,
			color: PALETTE[index % PALETTE.length]
		};
	});
</script>

<div class="round-lines" aria-hidden="true">
	{#each clusters as cluster, index (index)}
		<svg
			class="ring"
			class:hide-narrow={index > 5}
			viewBox="0 0 200 200"
			style="left:{cluster.x}%; top:{cluster.y}%; width:{cluster.size}px; height:{cluster.size}px; color:{cluster.color}; opacity:{cluster.opacity}; --stroke:{cluster.stroke}; --dur:{cluster.duration}s; --delay:{cluster.delay}s; --spin:{cluster.spin}deg; --dx:{cluster.driftX}px; --dy:{cluster.driftY}px; --sc:{cluster.scale};"
		>
			{#each cluster.radii as radius, ring (ring)}
				<circle
					cx="100"
					cy="100"
					r={radius}
					fill="none"
					stroke="currentColor"
					stroke-width={cluster.stroke}
					stroke-linecap="round"
					stroke-dasharray={cluster.dash[ring]}
				/>
			{/each}
		</svg>
	{/each}
</div>

<style>
	.round-lines {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
		contain: strict;
	}

	.ring {
		position: absolute;
		animation: ring-drift var(--dur) ease-in-out infinite;
		animation-delay: var(--delay);
		will-change: transform;
	}

	@keyframes ring-drift {
		0%,
		100% {
			transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
		}
		50% {
			transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--spin)) scale(var(--sc));
		}
	}

	@media (max-width: 640px) {
		.hide-narrow {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ring {
			animation: none;
			will-change: auto;
		}
	}
</style>