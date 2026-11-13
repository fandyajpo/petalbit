<script lang="ts">
	import { getBouquetBackground } from '$lib/data/backgrounds';

	type Props = {
		background?: string;
		class?: string;
		/** Static, lightweight version for thumbnails. */
		compact?: boolean;
	};

	let { background, class: klass = '', compact = false }: Props = $props();

	const bg = $derived(getBouquetBackground(background));

	const petals = [
		{ x: 8, y: 18, size: 16, dur: 12, delay: -1.5, drift: 26 },
		{ x: 22, y: 62, size: 11, dur: 15, delay: -6, drift: -18 },
		{ x: 36, y: 8, size: 20, dur: 13, delay: -9, drift: 20 },
		{ x: 48, y: 72, size: 14, dur: 17, delay: -3, drift: -24 },
		{ x: 61, y: 26, size: 12, dur: 14, delay: -11, drift: 16 },
		{ x: 73, y: 68, size: 18, dur: 18, delay: -7, drift: -14 },
		{ x: 86, y: 14, size: 13, dur: 12, delay: -4, drift: 22 },
		{ x: 92, y: 56, size: 10, dur: 16, delay: -12, drift: -20 },
		{ x: 16, y: 84, size: 12, dur: 19, delay: -8, drift: 18 },
		{ x: 66, y: 88, size: 15, dur: 15, delay: -5, drift: -16 }
	];

	const bokeh = [
		{ x: 12, y: 22, size: 58, dur: 22, delay: -3, op: 0.55 },
		{ x: 78, y: 16, size: 40, dur: 27, delay: -11, op: 0.45 },
		{ x: 62, y: 64, size: 72, dur: 31, delay: -7, op: 0.36 },
		{ x: 26, y: 76, size: 46, dur: 24, delay: -16, op: 0.4 },
		{ x: 90, y: 48, size: 30, dur: 19, delay: -5, op: 0.5 },
		{ x: 44, y: 12, size: 34, dur: 29, delay: -13, op: 0.32 }
	];

	const clouds = [
		{ x: 4, y: 16, w: 44, h: 30, dur: 38, delay: -6, op: 0.9 },
		{ x: 46, y: 6, w: 52, h: 26, dur: 46, delay: -18, op: 0.7 },
		{ x: 64, y: 42, w: 40, h: 24, dur: 34, delay: -12, op: 0.8 },
		{ x: -6, y: 54, w: 58, h: 30, dur: 52, delay: -24, op: 0.62 },
		{ x: 26, y: 70, w: 46, h: 22, dur: 42, delay: -3, op: 0.72 }
	];
</script>

<div class="scene-bg {bg.kind} {klass}" class:compact aria-hidden="true">
	<div class="atmosphere"></div>

	{#if bg.kind === 'flowery' || bg.kind === 'warp' || bg.kind === 'liquid'}
		<div class="bokeh">
			{#each bokeh as dot, i (i)}
				<span
					style="--x:{dot.x}%; --y:{dot.y}%; --size:{dot.size}px; --dur:{dot.dur}s; --delay:{dot.delay}s; --op:{dot.op};"
				></span>
			{/each}
		</div>
	{/if}

	{#if bg.kind === 'flowery'}
		<div class="sunlight"></div>
	{/if}

	{#if bg.kind === 'flowery'}
		<div class="wash"></div>
		{#each petals as petal, i (i)}
			<img
				src="/art/petal-{(i % 4) + 1}.png"
				alt=""
				class="petal"
				style="--x:{petal.x}%; --y:{petal.y}%; --size:{petal.size}px; --dur:{petal.dur}s; --delay:{petal.delay}s; --drift:{petal.drift}px;"
			/>
		{/each}
	{/if}

	{#if bg.kind === 'warp'}
		<div class="wash"></div>
		<div class="sheen"></div>
		<div class="ribbon r1"></div>
		<div class="ribbon r2"></div>
		<div class="ribbon r3"></div>
		<div class="ribbon r4"></div>
	{/if}

	{#if bg.kind === 'liquid'}
		<div class="wash"></div>
		<div class="caustics"></div>
		<div class="blob b1"></div>
		<div class="blob b2"></div>
		<div class="blob b3"></div>
	{/if}

	{#if bg.kind === 'wave'}
		<div class="wash"></div>
		<div class="shimmer"></div>
		<div class="wave w1"></div>
		<div class="wave w2"></div>
		<div class="wave w3"></div>
	{/if}

	{#if bg.kind === 'rain'}
		<div class="wash"></div>
		<div class="mist"></div>
		<div class="rain r1"></div>
		<div class="rain r2"></div>
	{/if}

	{#if bg.kind === 'cloudy'}
		<div class="wash"></div>
		<div class="sunlight soft"></div>
		{#each clouds as cloud, i (i)}
			<div
				class="cloud"
				style="--x:{cloud.x}%; --y:{cloud.y}%; --w:{cloud.w}%; --h:{cloud.h}%; --dur:{cloud.dur}s; --delay:{cloud.delay}s; --op:{cloud.op};"
			></div>
		{/each}
	{/if}

	<div class="grain"></div>
	<div class="vignette"></div>
</div>

<style>
	.scene-bg {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
		contain: paint;
		z-index: 0;
	}

	.compact * {
		animation: none !important;
	}

	.compact .petal {
		opacity: 0.7;
	}

	.compact .rain {
		opacity: 0.3;
	}

	.wash {
		position: absolute;
		inset: 0;
	}

	/* ------------------------------------------------------------ atmosphere */
	.atmosphere {
		position: absolute;
		inset: 0;
		z-index: 1;
		background:
			radial-gradient(ellipse 90% 55% at 50% -12%, rgb(255 255 250 / 0.4), transparent 62%),
			linear-gradient(180deg, transparent 62%, rgb(255 250 242 / 0.18));
	}

	.sunlight {
		position: absolute;
		inset: -12%;
		z-index: 1;
		background: radial-gradient(ellipse 42% 58% at 72% 6%, rgb(255 246 222 / 0.9), transparent 66%);
		mix-blend-mode: screen;
		animation: sun-breathe 15s ease-in-out infinite alternate;
	}

	.sunlight.soft {
		opacity: 0.55;
		background: radial-gradient(ellipse 50% 62% at 72% 4%, rgb(255 249 232 / 0.85), transparent 68%);
	}

	@keyframes sun-breathe {
		from {
			transform: translate3d(-2%, 0, 0) scale(1);
			opacity: 0.7;
		}
		to {
			transform: translate3d(2%, 2%, 0) scale(1.08);
			opacity: 0.95;
		}
	}

	.bokeh {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.bokeh span {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, rgb(255 255 255 / 0.9), rgb(255 240 230 / 0.28) 55%, transparent 74%);
		opacity: var(--op);
		filter: blur(0.6px);
		animation: bokeh-float var(--dur) ease-in-out var(--delay) infinite alternate;
	}

	@keyframes bokeh-float {
		from {
			transform: translate3d(-9px, 7px, 0) scale(0.94);
		}
		to {
			transform: translate3d(11px, -13px, 0) scale(1.09);
		}
	}

	.grain {
		position: absolute;
		inset: 0;
		z-index: 4;
		opacity: 0.055;
		mix-blend-mode: soft-light;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
		background-size: 140px 140px;
	}

	.vignette {
		position: absolute;
		inset: 0;
		z-index: 3;
		background: radial-gradient(ellipse 86% 76% at 50% 44%, transparent 56%, rgb(74 44 36 / 0.16));
	}

	/* ---------------------------------------------------------------- flowery */
	.flowery .wash {
		background:
			radial-gradient(ellipse 55% 45% at 18% 8%, rgb(255 250 240 / 0.95), transparent 62%),
			radial-gradient(ellipse 70% 55% at 22% 18%, rgb(247 222 224 / 0.9), transparent 65%),
			radial-gradient(ellipse 60% 60% at 82% 78%, rgb(236 207 202 / 0.8), transparent 68%),
			radial-gradient(ellipse 70% 40% at 50% 110%, rgb(214 176 172 / 0.4), transparent 70%),
			linear-gradient(165deg, #fff8f0, #f9e9e4 55%, #f0d7d2);
	}

	.petal {
		position: absolute;
		left: var(--x);
		top: -12%;
		width: var(--size);
		max-width: none;
		height: auto;
		opacity: 0;
		animation: petal-drift var(--dur) linear var(--delay) infinite;
	}

	@keyframes petal-drift {
		0% {
			transform: translate3d(0, 0, 0) rotate(0deg);
			opacity: 0;
		}
		12% {
			opacity: 0.85;
		}
		88% {
			opacity: 0.6;
		}
		100% {
			transform: translate3d(var(--drift), 125vh, 0) rotate(300deg);
			opacity: 0;
		}
	}

	/* ------------------------------------------------------------------- warp */
	.warp .wash {
		background:
			radial-gradient(ellipse 48% 40% at 82% 10%, rgb(255 244 236 / 0.9), transparent 64%),
			radial-gradient(ellipse 65% 50% at 18% 72%, rgb(226 214 241 / 0.9), transparent 66%),
			radial-gradient(ellipse 55% 45% at 86% 22%, rgb(246 219 212 / 0.9), transparent 64%),
			linear-gradient(160deg, #fdf4ec, #f0e4ef 60%, #e5dbee);
	}

	.sheen {
		position: absolute;
		inset: -30%;
		z-index: 1;
		background: conic-gradient(
			from 120deg at 52% 50%,
			transparent 0deg,
			rgb(255 255 255 / 0.34) 42deg,
			transparent 96deg,
			rgb(245 220 236 / 0.3) 160deg,
			transparent 228deg,
			rgb(255 248 238 / 0.24) 300deg,
			transparent 360deg
		);
		filter: blur(18px);
		mix-blend-mode: soft-light;
		animation: sheen-turn 48s linear infinite;
	}

	@keyframes sheen-turn {
		to {
			transform: rotate(360deg);
		}
	}

	.ribbon {
		position: absolute;
		left: -25%;
		width: 150%;
		height: 22%;
		border-radius: 999px;
		opacity: 0.55;
		animation: ribbon-drift 26s ease-in-out infinite alternate;
	}

	.r1 {
		top: 8%;
		background: linear-gradient(90deg, transparent, rgb(233 176 188 / 0.55), rgb(196 174 224 / 0.5), transparent);
		--rot: -9deg;
		--dur: 24s;
		animation-duration: 24s;
	}

	.r2 {
		top: 34%;
		height: 16%;
		background: linear-gradient(90deg, transparent, rgb(246 214 196 / 0.6), rgb(214 196 236 / 0.55), transparent);
		--rot: 7deg;
		animation-duration: 31s;
		animation-direction: alternate-reverse;
	}

	.r3 {
		top: 58%;
		height: 26%;
		background: linear-gradient(90deg, transparent, rgb(219 199 235 / 0.5), rgb(244 202 209 / 0.45), transparent);
		--rot: -4deg;
		animation-duration: 36s;
	}

	.r4 {
		top: 80%;
		height: 14%;
		background: linear-gradient(90deg, transparent, rgb(240 208 203 / 0.5), rgb(206 194 233 / 0.5), transparent);
		--rot: 10deg;
		animation-duration: 29s;
		animation-direction: alternate-reverse;
	}

	@keyframes ribbon-drift {
		from {
			transform: translate3d(-6%, 0, 0) rotate(var(--rot, 0deg));
		}
		to {
			transform: translate3d(7%, -3%, 0) rotate(calc(var(--rot, 0deg) + 5deg));
		}
	}

	/* ----------------------------------------------------------------- liquid */
	.liquid .wash {
		background:
			radial-gradient(ellipse 46% 38% at 72% 8%, rgb(255 253 246 / 0.9), transparent 64%),
			radial-gradient(ellipse 70% 55% at 70% 20%, rgb(213 234 240 / 0.95), transparent 66%),
			radial-gradient(ellipse 65% 55% at 20% 82%, rgb(232 213 240 / 0.85), transparent 68%),
			linear-gradient(165deg, #f7f9f4, #e6f0ef 55%, #e3e4f2);
	}

	.caustics {
		position: absolute;
		inset: -14%;
		z-index: 1;
		background: repeating-radial-gradient(
			ellipse at 32% 70%,
			transparent 0 22px,
			rgb(255 255 255 / 0.26) 25px,
			transparent 31px 52px
		);
		filter: blur(3px);
		mix-blend-mode: soft-light;
		animation: caustics-drift 20s ease-in-out infinite alternate;
	}

	@keyframes caustics-drift {
		from {
			transform: translate3d(-2%, 1%, 0) scale(1.02);
		}
		to {
			transform: translate3d(2%, -2%, 0) scale(1.07);
		}
	}

	.blob {
		position: absolute;
		opacity: 0.62;
		animation: blob-morph 22s ease-in-out infinite;
	}

	.b1 {
		width: 62%;
		height: 56%;
		left: -8%;
		top: -6%;
		background: radial-gradient(circle at 38% 34%, rgb(255 255 255 / 0.9), rgb(191 225 235 / 0.55) 52%, transparent 72%);
		border-radius: 42% 58% 60% 40% / 46% 40% 60% 54%;
		--dur: 24s;
		animation-duration: 24s;
	}

	.b2 {
		width: 58%;
		height: 52%;
		right: -12%;
		top: 34%;
		background: radial-gradient(circle at 60% 40%, rgb(255 255 255 / 0.85), rgb(214 197 240 / 0.55) 55%, transparent 74%);
		border-radius: 56% 44% 38% 62% / 52% 58% 42% 48%;
		animation-duration: 30s;
		animation-direction: reverse;
	}

	.b3 {
		width: 50%;
		height: 44%;
		left: 22%;
		bottom: -14%;
		background: radial-gradient(circle at 50% 40%, rgb(255 255 255 / 0.8), rgb(186 220 224 / 0.5) 58%, transparent 76%);
		border-radius: 46% 54% 62% 38% / 58% 42% 58% 42%;
		animation-duration: 26s;
	}

	@keyframes blob-morph {
		0%,
		100% {
			transform: translate3d(0, 0, 0) scale(1);
		}
		50% {
			transform: translate3d(4%, -4%, 0) scale(1.06);
		}
	}

	/* ------------------------------------------------------------------- wave */
	.wave .wash {
		background:
			radial-gradient(ellipse 42% 34% at 78% 6%, rgb(255 250 234 / 0.9), transparent 62%),
			radial-gradient(ellipse 75% 50% at 60% 12%, rgb(214 234 247 / 0.9), transparent 66%),
			linear-gradient(170deg, #f8f5ea, #e6eff3 62%, #d5e5ef);
	}

	.shimmer {
		position: absolute;
		left: -20%;
		right: -20%;
		bottom: 18%;
		height: 22%;
		z-index: 1;
		background: linear-gradient(
			100deg,
			transparent 20%,
			rgb(255 255 255 / 0.42) 44%,
			rgb(255 255 255 / 0.14) 52%,
			transparent 74%
		);
		filter: blur(7px);
		mix-blend-mode: screen;
		animation: shimmer-slide 11s ease-in-out infinite alternate;
	}

	@keyframes shimmer-slide {
		from {
			transform: translate3d(-6%, 1%, 0);
			opacity: 0.45;
		}
		to {
			transform: translate3d(6%, -2%, 0);
			opacity: 0.8;
		}
	}

	.wave {
		position: absolute;
		left: -40%;
		width: 180%;
		border-radius: 46%;
		animation: wave-roll 18s ease-in-out infinite;
	}

	.w1 {
		bottom: -26%;
		height: 62%;
		background: rgb(160 198 216 / 0.35);
		animation-duration: 20s;
	}

	.w2 {
		bottom: -36%;
		height: 60%;
		background: rgb(186 216 230 / 0.45);
		animation-duration: 26s;
		animation-direction: reverse;
	}

	.w3 {
		bottom: -46%;
		height: 58%;
		background: rgb(208 231 241 / 0.6);
		animation-duration: 32s;
	}

	@keyframes wave-roll {
		0%,
		100% {
			transform: translate3d(-3%, 0, 0) rotate(-1.4deg);
		}
		50% {
			transform: translate3d(3%, -2%, 0) rotate(1.4deg);
		}
	}

	/* ------------------------------------------------------------------- rain */
	.rain-vibe .wash,
	.rain .wash {
		background:
			radial-gradient(ellipse 50% 40% at 72% 4%, rgb(242 246 248 / 0.85), transparent 64%),
			radial-gradient(ellipse 70% 55% at 24% 16%, rgb(208 221 234 / 0.9), transparent 66%),
			linear-gradient(170deg, #f6f4ef, #e2e9ee 60%, #d7e2e9);
	}

	.mist {
		position: absolute;
		left: -10%;
		right: -10%;
		bottom: -12%;
		height: 58%;
		z-index: 1;
		background: linear-gradient(180deg, transparent, rgb(246 250 252 / 0.6));
		filter: blur(10px);
		animation: mist-breathe 14s ease-in-out infinite alternate;
	}

	@keyframes mist-breathe {
		from {
			transform: translate3d(-2%, 2%, 0);
			opacity: 0.6;
		}
		to {
			transform: translate3d(2%, -1%, 0);
			opacity: 0.9;
		}
	}

	.rain {
		position: absolute;
		left: -20%;
		top: -60%;
		width: 140%;
		height: 220%;
		opacity: 0.5;
		background-image: repeating-linear-gradient(
			104deg,
			transparent 0,
			transparent 22px,
			rgb(255 255 255 / 0.55) 22px,
			rgb(255 255 255 / 0.55) 23px
		);
		animation: rain-fall 1.6s linear infinite;
	}

	.r1 {
		animation-duration: 1.5s;
	}

	.r2 {
		left: -40%;
		opacity: 0.28;
		background-size: 100% 140%;
		animation-duration: 2.4s;
	}

	@keyframes rain-fall {
		from {
			transform: translate3d(0, 0, 0);
		}
		to {
			transform: translate3d(-6%, 8%, 0);
		}
	}

	/* ----------------------------------------------------------------- cloudy */
	.cloudy .wash {
		background:
			radial-gradient(ellipse 46% 36% at 76% 6%, rgb(255 250 234 / 0.9), transparent 62%),
			radial-gradient(ellipse 70% 55% at 30% 26%, rgb(244 242 238 / 0.95), transparent 68%),
			linear-gradient(170deg, #fdf9ef, #edf0ef 60%, #e3e9ee);
	}

	.cloud {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--w);
		height: var(--h);
		opacity: var(--op);
		border-radius: 999px;
		background: radial-gradient(ellipse at 40% 40%, #fffdf8, rgb(255 253 246 / 0.35) 62%, transparent 76%);
		animation: cloud-drift var(--dur) ease-in-out var(--delay) infinite alternate;
	}

	@keyframes cloud-drift {
		from {
			transform: translate3d(-4%, 0, 0) scale(1);
		}
		to {
			transform: translate3d(6%, -3%, 0) scale(1.05);
		}
	}

	/* ---------------------------------------------------------- reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.petal,
		.ribbon,
		.blob,
		.wave,
		.rain,
		.cloud,
		.sunlight,
		.bokeh span,
		.sheen,
		.caustics,
		.shimmer,
		.mist {
			animation: none;
		}

		.petal {
			opacity: 0.6;
		}

		.rain {
			opacity: 0.25;
		}
	}

	/* ------------------------------------------------------- lighten the load */
	@media (max-width: 640px) {
		.petal:nth-child(n + 7) {
			display: none;
		}

		.cloud:nth-child(n + 4) {
			display: none;
		}

		.bokeh span:nth-child(n + 5) {
			display: none;
		}

		.vignette {
			opacity: 0.7;
		}

		.ribbon {
			opacity: 0.42;
		}
	}
</style>
