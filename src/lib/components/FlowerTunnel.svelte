<script lang="ts">
	import { FLOWERS } from '$lib/data/flowers';

	/**
	 * A perspective tunnel of pixel blooms.
	 *
	 * Four depth layers sit at different `translateZ` distances. The parent hero
	 * writes `--p` as the page scrolls (driven by Motion's scroll observer), and
	 * every layer derives its opacity and transform from that number in CSS so the
	 * work stays on the compositor. Bloom counts, filters and idle motion are
	 * trimmed on small/coarse devices to keep scrolling smooth on mobile.
	 */

	const SPECIES = FLOWERS.filter((flower) => flower.id !== 'eukaliptus');

	const rand = (seed: number) => {
		const value = Math.sin(seed * 127.1) * 43_758.5453;
		return value - Math.floor(value);
	};

	type Plane = {
		key: string;
		/** Progress at which this layer is at its strongest. */
		mid: number;
		/** Half-width of the fade window around `mid`. */
		half: number;
		dim: number;
		count: number;
		rx: [number, number];
		ry: [number, number];
		w: [number, number];
		rate: number;
		z: number;
		grow: number;
		drift: number;
		tilt: number;
		phase: number;
	};

	const planes: Plane[] = [
		{
			key: 'far',
			mid: 0.08,
			half: 0.5,
			dim: 0.82,
			count: 8,
			rx: [50, 60],
			ry: [42, 50],
			w: [15, 19],
			rate: 16,
			z: -820,
			grow: 1.1,
			drift: 1.5,
			tilt: 1,
			phase: 0.4
		},
		{
			key: 'mid',
			mid: 0.3,
			half: 0.46,
			dim: 0.9,
			count: 7,
			rx: [43, 51],
			ry: [36, 43],
			w: [21, 26],
			rate: 14,
			z: -520,
			grow: 0.9,
			drift: -1.2,
			tilt: -1,
			phase: 2.05
		},
		{
			key: 'near',
			mid: 0.55,
			half: 0.44,
			dim: 0.96,
			count: 6,
			rx: [38, 45],
			ry: [32, 38],
			w: [28, 34],
			rate: 12,
			z: -300,
			grow: 0.7,
			drift: 1,
			tilt: 1.6,
			phase: 3.6
		},
		{
			key: 'close',
			mid: 0.82,
			half: 0.44,
			dim: 1,
			count: 4,
			rx: [35, 42],
			ry: [30, 36],
			w: [37, 45],
			rate: 11,
			z: -140,
			grow: 0.45,
			drift: -0.8,
			tilt: -1.8,
			phase: 5.25
		}
	];

	type Bloom = {
		image: string;
		name: string;
		x: number;
		y: number;
		w: number;
		rot: number;
		r: number;
	};

	const layer = (plane: Plane): Bloom[] =>
		Array.from({ length: plane.count }, (_, k) => {
			const seed = plane.phase * 97 + k * 13.37;
			const angle = plane.phase + (k / plane.count) * Math.PI * 2 + (rand(seed) - 0.5) * 0.3;
			const rx = plane.rx[0] + rand(seed + 1) * (plane.rx[1] - plane.rx[0]);
			const ry = plane.ry[0] + rand(seed + 2) * (plane.ry[1] - plane.ry[0]);
			const species = SPECIES[k % SPECIES.length];

			return {
				image: species.image,
				name: species.name,
				x: 50 + Math.cos(angle) * rx,
				y: 53 + Math.sin(angle) * ry,
				w: plane.w[0] + rand(seed + 3) * (plane.w[1] - plane.w[0]),
				rot: (rand(seed + 4) - 0.5) * 24,
				r: plane.mid - 0.42 + (k / plane.count) * 0.34
			};
		});

	const layers = planes.map((plane) => ({ plane, blooms: layer(plane) }));
</script>

<div class="tunnel" aria-hidden="true">
	<span class="light"></span>

	{#each layers as { plane, blooms } (plane.key)}
		<div
			class="plane"
			style="--mid:{plane.mid}; --half:{plane.half}; --z:{plane.z}; --grow:{plane.grow}; --drift:{plane.drift}; --tilt:{plane.tilt};"
		>
			{#each blooms as bloom, i (i)}
				<span
					class="bloom"
					style="--x:{bloom.x.toFixed(2)}; --y:{bloom.y.toFixed(2)}; --w:{bloom.w.toFixed(2)}; --rot:{bloom.rot.toFixed(2)}; --r:{bloom.r.toFixed(3)}; --rate:{plane.rate}; --dim:{plane.dim};"
				>
					<img src={bloom.image} alt="" width="450" height="696" decoding="async" loading="eager" />
				</span>
			{/each}
		</div>
	{/each}

	<span class="vignette"></span>
</div>

<style>
	.tunnel {
		/* The scene starts already inside the tunnel: `--p` is raw scroll
		   progress, `--pp` is the depth the viewer has travelled. */
		--pp: calc(0.14 + var(--p, 0) * 0.86);
		position: absolute;
		inset: 0;
		overflow: clip;
		perspective: 1000px;
		perspective-origin: 50% 48%;
		pointer-events: none;
		z-index: 0;
		contain: layout paint style;
	}

	/* Warm light at the end of the tunnel, so the depth has somewhere to go. */
	.light {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 78vmin;
		height: 64vmin;
		transform: translate(-50%, -50%);
		background:
			radial-gradient(circle, rgb(255 249 240 / 0.85), rgb(247 231 226 / 0.34) 40%, transparent 68%),
			radial-gradient(circle at 50% 60%, rgb(223 154 166 / 0.22), transparent 60%);
	}

	.plane {
		position: absolute;
		inset: -12%;
		transform-style: preserve-3d;
		backface-visibility: hidden;
		/* Full strength in a window around `mid`, then fade out both ways, so
		   each layer reads as flowers passing the camera. */
		opacity: clamp(
			0,
			calc(1 - (max(var(--mid) - var(--pp), var(--pp) - var(--mid)) - 0.14) / var(--half)),
			1
		);
		transform: translateZ(calc(var(--z) * 1px))
			scale(calc(1 + (var(--pp) - var(--mid)) * var(--grow)))
			translateY(calc((var(--pp) - var(--mid)) * var(--drift) * 1%))
			rotate(calc((var(--pp) - var(--mid)) * var(--tilt) * 1deg));
		will-change: transform, opacity;
	}

	.bloom {
		position: absolute;
		left: calc(var(--x) * 1%);
		top: calc(var(--y) * 1%);
		width: clamp(22px, calc(var(--w) * 1vmin), 168px);
		transform: translate3d(-50%, -50%, 0) rotate(calc(var(--rot) * 1deg));
		opacity: calc(var(--dim) * clamp(0, calc((var(--pp) - var(--r)) * var(--rate)), 1));
		transform-origin: 50% 80%;
	}

	.bloom img {
		display: block;
		width: 100%;
		height: auto;
		image-rendering: pixelated;
	}

	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 62% 62% at 50% 50%,
			transparent 38%,
			rgb(241 232 218 / 0.16) 62%,
			rgb(241 232 218 / 0.72) 100%
		);
	}

	@media (max-width: 720px) {
		.plane {
			inset: -16%;
		}

		.bloom {
			width: clamp(20px, calc(var(--w) * 1.2vmin), 120px);
		}

		.light {
			width: 88vmax;
			height: 74vmax;
		}
	}

	/* On touch/coarse devices, drop depth perspective and idle motion in favor
	   of a flat, scroll-linked composition that stays smooth. */
	@media (hover: none) and (pointer: coarse) {
		.tunnel {
			perspective: none;
		}

		.plane {
			transform-style: flat;
			/* 2D stand-in for depth: scale and drift only, no translateZ. */
			transform: scale(calc(0.82 + (0.5 - var(--mid)) * 0.12 + (var(--pp) - var(--mid)) * var(--grow)))
				translateY(calc((var(--pp) - var(--mid)) * var(--drift) * 1%));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.plane {
			will-change: auto;
		}
	}
</style>
