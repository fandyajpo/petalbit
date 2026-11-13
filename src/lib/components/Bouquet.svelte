<script lang="ts">
	import { DEFAULT_BOUQUET, getFlower } from '$lib/data/flowers';
	import { getBouquetPaper } from '$lib/data/papers';

	type Props = {
		flowers?: string[];
		class?: string;
		ribbon?: boolean;
		greenery?: boolean;
		animate?: boolean;
		/** Use a curated bouquet when `flowers` is empty (hero / share fallback). */
		fallback?: boolean;
		/** Show a one-time "touch the flowers" nudge until the bouquet is poked. */
		hint?: boolean;
		/** Bouquet wrap style id; defaults to the first paper when missing. */
		paper?: string;
		/** Optional per-stem depth overrides, parallel to `flowers`. */
		layers?: string[];
	};

	let {
		flowers = [],
		class: klass = '',
		ribbon = true,
		greenery = true,
		animate = true,
		fallback = true,
		hint = false,
		paper,
		layers = []
	}: Props = $props();

	type Spark = {
		id: number;
		slot: string;
		kind: 'petal' | 'glint';
		petal: number;
		dx: number;
		dy: number;
		rot: number;
		delay: number;
		size: number;
	};

	let sparks = $state<Spark[]>([]);
	let touched = $state(false);
	let seq = 0;

	/** Squash the tapped flower and release a few pixel petals. */
	function poke(event: PointerEvent, slot: Slot) {
		const host = event.currentTarget as HTMLElement;
		const art = host.querySelector('img');
		if (art) {
			art.classList.remove('is-poked');
			void art.offsetWidth;
			art.classList.add('is-poked');
		}

		touched = true;

		const batch = ++seq;
		const petals = 2 + Math.floor(Math.random() * 2);
		const glints = 3;

		const fresh: Spark[] = [
			...Array.from({ length: petals }, (_, i) => ({
				id: batch * 100 + i,
				kind: 'petal' as const,
				slot: slot.key,
				petal: 1 + Math.floor(Math.random() * 4),
				dx: (Math.random() - 0.5) * 58,
				dy: -26 - Math.random() * 38,
				rot: (Math.random() - 0.5) * 220,
				delay: i * 45,
				size: 10 + Math.round(Math.random() * 6)
			})),
			...Array.from({ length: glints }, (_, i) => ({
				id: batch * 100 + 20 + i,
				kind: 'glint' as const,
				slot: slot.key,
				petal: 1,
				dx: (Math.random() - 0.5) * 46,
				dy: -20 - Math.random() * 30,
				rot: 45,
				delay: 20 + i * 55,
				size: 3 + Math.round(Math.random() * 2)
			}))
		];

		sparks = [...sparks, ...fresh].slice(-24);

		const ids = new Set(fresh.map((spark) => spark.id));
		setTimeout(() => {
			sparks = sparks.filter((spark) => !ids.has(spark.id));
		}, 1200);
	}

	function clearPoke(event: AnimationEvent) {
		if (event.animationName === 'flower-poke') {
			(event.currentTarget as HTMLElement).classList.remove('is-poked');
		}
	}

	const eucalyptus = getFlower('eukaliptus');

	type Slot = {
		key: string;
		name: string;
		image: string;
		angle: number;
		scale: number;
		shift: number;
		lift: number;
		z: number;
		delay: number;
		row: 'back' | 'front';
	};

	const ids = $derived(
		(flowers.length ? flowers : fallback ? DEFAULT_BOUQUET : []).filter((id) => getFlower(id))
	);
	const slots = $derived.by<Slot[]>(() => {
		const list = ids;
		const n = list.length;
		const positions = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : i / (n - 1) - 0.5));
		const order = [...positions.keys()].sort(
			(a, b) => Math.abs(positions[a]) - Math.abs(positions[b]) || positions[a] - positions[b]
		);

		/* A wider fan for crowded bouquets, so no neighbour is fully covered. */
		const spread = n <= 3 ? 46 : 56 + (n - 4) * 4.6;

		/* Left-to-right rank, used to weave the two depth rows. */
		const arc = [...positions.keys()].sort((a, b) => positions[a] - positions[b]);

		/* Crowded bunches shrink slightly so every head keeps an exposed edge. */
		const fit = n <= 4 ? 1 : 1 - (n - 4) * 0.07;

		return list.map((id, i) => {
			const flower = getFlower(id);
			const pos = positions[order[i]] ?? 0;
			/* Push the inner stems away from the middle so the fan thins out
			   instead of stacking heads on one axis. */
			const warp = Math.sign(pos) * Math.pow(Math.abs(pos), 0.72);
			const depth = Math.abs(pos) * 2;
			const arcIndex = arc.indexOf(order[i]);
			/*
			 * Weave the stems between a raised back row and a lower front row,
			 * alternating along the arc from left to right. A plain centre-in-front
			 * fan stacks every bloom on one axis and the middle flower ends up hiding
			 * four others; alternating means each head keeps an exposed edge and the
			 * bunch reads as two loose layers instead of one occluding stack.
			 */
			const back = arcIndex % 2 === 0;
			const layer = layers[i];

			return {
				key: `${id}-${i}`,
				name: flower?.name ?? id,
				image: flower?.image ?? '',
				angle: warp * spread * (back ? 1.09 : 1),
				scale:
					layer === 'back'
						? fit * 0.93
						: layer === 'front'
							? fit
							: fit * ((back ? 0.93 : 1) - depth * 0.05),
				shift: warp * 7.4 + (back && Math.abs(pos) > 0.02 ? Math.sign(pos) * 2.2 : 0),
				lift:
					layer === 'front'
						? 0
						: layer === 'back'
							? 3
							: back
								? n >= 6
									? 4.4
									: 3
								: 0,
				z:
					layer === 'front'
						? 44 + i
						: layer === 'back'
							? 6 + i
							: back
								? 12 + Math.round((1 - Math.abs(pos)) * 6)
								: 30 - Math.round(i),
				delay: Math.min(i, 6) * 55,
				row:
					layer === 'front'
						? ('front' as const)
						: layer === 'back'
							? ('back' as const)
							: back
								? ('back' as const)
								: ('front' as const)
			};
		});
	});

	const label = $derived(
		ids.length
			? `Pixel bouquet with ${slots.map((slot) => slot.name).join(', ')}`
			: 'Petalbit pixel flower bouquet'
	);

	const wrapPaper = $derived(getBouquetPaper(paper));
	const showRibbon = $derived(ribbon && wrapPaper.ribbon !== false);
	const wrapLayout = $derived(wrapPaper.layout ?? {});
	const wrapFilter = $derived(
		[wrapLayout.filter, wrapLayout.shadow].filter(Boolean).join(' ') || undefined
	);

	function layerStyle(
		scale = 1,
		x = 0,
		y = 0,
		rotate = 0,
		filter?: string
	): string {
		return [
			`--wrap-scale:${scale}`,
			`--wrap-x:${x}%`,
			`--wrap-y:${y}px`,
			`--wrap-rot:${rotate}deg`,
			filter ? `filter:${filter}` : ''
		]
			.filter(Boolean)
			.join(';');
	}

	const paperStyle = $derived(
		layerStyle(
			wrapLayout.paperScale,
			wrapLayout.paperX,
			wrapLayout.paperY,
			wrapLayout.paperRotate,
			wrapFilter
		)
	);
	const frontStyle = $derived(
		layerStyle(
			wrapLayout.frontScale,
			wrapLayout.frontX,
			wrapLayout.frontY,
			wrapLayout.frontRotate,
			wrapFilter
		)
	);
	const ribbonStyle = $derived(
		layerStyle(
			wrapLayout.ribbonScale ?? wrapLayout.paperScale,
			wrapLayout.paperX,
			wrapLayout.ribbonY,
			wrapLayout.paperRotate,
			// Keep the ribbon its own colour; only the paper takes the tint.
			wrapLayout.shadow
		)
	);

	const sprigs = [
		{ key: 'left', angle: -36, scale: 1.0, shift: -7, z: 8 },
		{ key: 'right', angle: 35, scale: 0.96, shift: 7, z: 7 }
	];
</script>

<div class="bouquet {klass}" role="img" aria-label={label}>
	<div class="glow" aria-hidden="true"></div>
	<div class="ground" aria-hidden="true"></div>

	<div class="layer paper" aria-hidden="true" style={paperStyle}>
		<img src={wrapPaper.paperImage} alt="" width="1380" height="990" class="pixelated" />
	</div>

	{#if greenery && eucalyptus}
		{#each sprigs as sprig (sprig.key)}
			<div
				class="flower sprig"
				aria-hidden="true"
				style="--angle:{sprig.angle}deg; --scale:{sprig.scale}; --shift:{sprig.shift}%; --z:{sprig.z}; --sway-dur:{sprig.key === 'left' ? '4.6s' : '5.2s'}; --sway-delay:-1.1s; --sway:{sprig.key === 'left' ? '0.9' : '-0.9'};"
			>
				<div class="bloom">
					<img src={eucalyptus.image} alt="" width="450" height="696" />
				</div>
			</div>
		{/each}
	{/if}

	{#each slots as slot (slot.key)}
		<div
			class="flower pokeable"
			role="presentation"
			class:animated={animate}
			class:back={slot.row === 'back'}
			style="--angle:{slot.angle}deg; --scale:{slot.scale}; --shift:{slot.shift}%; --lift:{slot.lift}%; --z:{slot.z}; --delay:{slot.delay}ms; --sway-dur:{3.6 + (slot.z % 5) * 0.28}s; --sway-delay:-{(slot.z % 7) * 0.42}s; --sway:{slot.angle >= 0 ? 1 : -1};"
			onpointerdown={(event) => poke(event, slot)}
		>
			<div class="bloom">
				<img
					src={slot.image}
					alt=""
					width="450"
					height="696"
					onanimationend={clearPoke}
				/>

				<span class="sparks" aria-hidden="true">
					{#each sparks.filter((spark) => spark.slot === slot.key) as spark (spark.id)}
						{#if spark.kind === 'petal'}
							<img
								src="/art/petal-{spark.petal}.png"
								alt=""
								class="spark"
								style="--dx:{spark.dx}px; --dy:{spark.dy}px; --rot:{spark.rot}deg; --delay:{spark.delay}ms; --size:{spark.size}px;"
							/>
						{:else}
							<span
								class="glint"
								style="--dx:{spark.dx}px; --dy:{spark.dy}px; --rot:{spark.rot}deg; --delay:{spark.delay}ms; --size:{spark.size}px;"
							></span>
						{/if}
					{/each}
				</span>
			</div>
		</div>
	{/each}

	<!-- Front face of the wrap: hides the stems below the fold, so the paper
	     reads as something the bouquet sits inside, not behind. -->
	{#if !wrapLayout.hideFront}
		<div class="layer paper-front" aria-hidden="true" style={frontStyle}>
			<img src={wrapPaper.frontImage} alt="" width="1380" height="990" class="pixelated" />
		</div>
	{/if}

	{#if showRibbon}
		<div class="layer ribbon" aria-hidden="true" style={ribbonStyle}>
			<img src="/art/bouquet-ribbon.png" alt="" width="1380" height="990" class="pixelated" />
		</div>
	{/if}

	{#if hint && !touched && ids.length > 0}
		<p class="hint" aria-hidden="true">Sentuh bunganya</p>
	{/if}
</div>

<style>
	.bouquet {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1.02;
		isolation: isolate;
	}

	.glow {
		position: absolute;
		inset: 4% 0 10%;
		border-radius: 50%;
		background:
			radial-gradient(closest-side at 50% 46%, rgb(242 214 212 / 0.85), rgb(242 214 212 / 0) 100%),
			radial-gradient(closest-side at 34% 64%, rgb(233 168 179 / 0.32), rgb(233 168 179 / 0) 100%);
		z-index: 0;
	}

	.ground {
		position: absolute;
		left: 50%;
		bottom: 2%;
		width: 62%;
		height: 9%;
		transform: translateX(-50%);
		background: radial-gradient(ellipse at center, rgb(124 42 60 / 0.22), transparent 70%);
		z-index: 1;
	}

	.layer {
		position: absolute;
		left: 50%;
		bottom: 1.5%;
		width: 100%;
		transform-origin: 50% 100%;
		transform: translateX(-50%) translate(var(--wrap-x, 0%), var(--wrap-y, 0px))
			rotate(var(--wrap-rot, 0deg)) scale(var(--wrap-scale, 1));
		pointer-events: none;
		transition: transform 520ms var(--ease-out, cubic-bezier(0.19, 1, 0.22, 1)), filter 400ms ease;
	}

	.layer img {
		display: block;
		width: 100%;
		height: auto;
	}

	.paper {
		z-index: 2;
	}

	.paper-front {
		z-index: 60;
	}

	.ribbon {
		z-index: 70;
	}

	.flower {
		position: absolute;
		left: 50%;
		bottom: 14%;
		width: 40.5%;
		transform-origin: 50% 100%;
		transform: translateX(-50%) translateX(var(--shift, 0%)) translateY(calc(var(--lift, 0%) * -1))
			rotate(var(--angle, 0deg)) scale(var(--scale, 1));
		z-index: var(--z, 10);
		will-change: transform;
	}

	/* Back-row blooms sit a touch higher, smaller and dimmer, so the eye reads
	   depth even before anything moves. */
	.flower.back .bloom > img {
		filter: brightness(0.965) saturate(0.96);
	}

	.pokeable {
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.bloom {
		position: relative;
		transform-origin: 50% 100%;
		animation: flower-sway var(--sway-dur, 4.2s) ease-in-out infinite;
		animation-delay: var(--sway-delay, 0s);
	}

	.bloom > img {
		display: block;
		width: 100%;
		height: auto;
		transform-origin: 50% 100%;
	}

	.bloom > img:global(.is-poked) {
		animation: flower-poke 680ms cubic-bezier(0.22, 0.9, 0.3, 1);
	}

	.flower.animated {
		animation: bloom-in 620ms cubic-bezier(0.2, 0.8, 0.25, 1) both;
		animation-delay: var(--delay, 0ms);
	}

	.sprig {
		width: 38%;
		bottom: 15%;
		opacity: 0.95;
	}

	.sparks {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sparks .spark {
		position: absolute;
		left: 50%;
		top: 26%;
		width: var(--size, 8px);
		max-width: none;
		height: auto;
		opacity: 0;
		filter: drop-shadow(0 0 1px rgb(255 251 244 / 0.95)) drop-shadow(0 1px 1px rgb(80 32 44 / 0.28));
		animation: petal-pop 900ms ease-out var(--delay, 0ms) forwards;
	}

	.sparks .glint {
		position: absolute;
		left: 50%;
		top: 28%;
		width: var(--size, 3px);
		height: var(--size, 3px);
		background: #fff6de;
		box-shadow:
			0 0 0 1px rgb(255 255 255 / 0.35),
			0 0 7px 2px rgb(255 210 150 / 0.65);
		opacity: 0;
		animation: glint-pop 760ms ease-out var(--delay, 0ms) forwards;
	}

	.hint {
		position: absolute;
		left: 50%;
		bottom: 2%;
		transform: translateX(-50%);
		z-index: 80;
		padding: 0.32rem 0.72rem;
		border: 1px solid rgb(124 42 60 / 0.16);
		border-radius: 999px;
		background: rgb(255 251 244 / 0.86);
		color: var(--color-rose, #a34a5d);
		font-family: var(--font-sans, sans-serif);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		white-space: nowrap;
		pointer-events: none;
		animation: hint-breathe 3.4s ease-in-out infinite;
	}

	@keyframes flower-sway {
		0%,
		100% {
			transform: rotate(calc(var(--sway, 1) * -0.9deg));
		}
		50% {
			transform: rotate(calc(var(--sway, 1) * 1.1deg)) translateY(-0.6%);
		}
	}

	@keyframes flower-poke {
		0% {
			transform: rotate(0deg) scale(1);
		}
		18% {
			transform: rotate(-3.6deg) scale(1.035, 0.965);
		}
		42% {
			transform: rotate(2.7deg) scale(0.985, 1.015);
		}
		68% {
			transform: rotate(-1.1deg) scale(1.008, 0.992);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	@keyframes glint-pop {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(45deg) scale(0.3);
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% + var(--dy, -24px)))
				rotate(45deg) scale(1.15);
		}
	}

	@keyframes petal-pop {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
		}
		18% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% + var(--dy, -30px)))
				scale(0.85) rotate(var(--rot, 0deg));
		}
	}

	@keyframes hint-breathe {
		0%,
		100% {
			opacity: 0.55;
			transform: translateX(-50%) translateY(0);
		}
		50% {
			opacity: 1;
			transform: translateX(-50%) translateY(-3px);
		}
	}

	@keyframes bloom-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateX(var(--shift, 0%))
				translateY(calc(var(--lift, 0%) * -1 + 12px)) rotate(var(--angle, 0deg))
				scale(calc(var(--scale, 1) * 0.92));
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateX(var(--shift, 0%))
				translateY(calc(var(--lift, 0%) * -1)) rotate(var(--angle, 0deg))
				scale(var(--scale, 1));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.layer {
			transition: none;
		}

		.flower.animated {
			animation: none;
		}

		.bloom {
			animation: none;
		}

		.bloom > img:global(.is-poked) {
			animation: none;
		}

		.spark,
		.glint,
		.hint {
			animation: none;
		}

		.sparks {
			display: none;
		}
	}
</style>
