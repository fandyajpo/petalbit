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

	const clouds = [
		{ x: 4, y: 16, w: 44, h: 30, dur: 38, delay: -6, op: 0.9 },
		{ x: 46, y: 6, w: 52, h: 26, dur: 46, delay: -18, op: 0.7 },
		{ x: 64, y: 42, w: 40, h: 24, dur: 34, delay: -12, op: 0.8 },
		{ x: -6, y: 54, w: 58, h: 30, dur: 52, delay: -24, op: 0.62 },
		{ x: 26, y: 70, w: 46, h: 22, dur: 42, delay: -3, op: 0.72 }
	];
</script>

<div class="scene-bg {bg.kind} {klass}" class:compact aria-hidden="true">
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
		<div class="ribbon r1"></div>
		<div class="ribbon r2"></div>
		<div class="ribbon r3"></div>
		<div class="ribbon r4"></div>
	{/if}

	{#if bg.kind === 'liquid'}
		<div class="wash"></div>
		<div class="blob b1"></div>
		<div class="blob b2"></div>
		<div class="blob b3"></div>
	{/if}

	{#if bg.kind === 'wave'}
		<div class="wash"></div>
		<div class="wave w1"></div>
		<div class="wave w2"></div>
		<div class="wave w3"></div>
	{/if}

	{#if bg.kind === 'rain'}
		<div class="wash"></div>
		<div class="rain r1"></div>
		<div class="rain r2"></div>
	{/if}

	{#if bg.kind === 'cloudy'}
		<div class="wash"></div>
		{#each clouds as cloud, i (i)}
			<div
				class="cloud"
				style="--x:{cloud.x}%; --y:{cloud.y}%; --w:{cloud.w}%; --h:{cloud.h}%; --dur:{cloud.dur}s; --delay:{cloud.delay}s; --op:{cloud.op};"
			></div>
		{/each}
	{/if}
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

	/* ---------------------------------------------------------------- flowery */
	.flowery .wash {
		background:
			radial-gradient(ellipse 70% 55% at 22% 18%, rgb(247 222 224 / 0.9), transparent 65%),
			radial-gradient(ellipse 60% 60% at 82% 78%, rgb(236 207 202 / 0.75), transparent 68%),
			linear-gradient(165deg, #fff6ee, #f9e9e4 55%, #f3dcd8);
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
			radial-gradient(ellipse 65% 50% at 18% 72%, rgb(226 214 241 / 0.9), transparent 66%),
			radial-gradient(ellipse 55% 45% at 86% 22%, rgb(246 219 212 / 0.9), transparent 64%),
			linear-gradient(160deg, #fbf2ea, #f0e4ef 60%, #e9e0f1);
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
			radial-gradient(ellipse 70% 55% at 70% 20%, rgb(213 234 240 / 0.95), transparent 66%),
			radial-gradient(ellipse 65% 55% at 20% 82%, rgb(232 213 240 / 0.85), transparent 68%),
			linear-gradient(165deg, #f5f8f3, #e8f1f0 55%, #e7e8f5);
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
			radial-gradient(ellipse 75% 50% at 60% 12%, rgb(214 234 247 / 0.9), transparent 66%),
			linear-gradient(170deg, #f6f4ea, #e7f0f3 62%, #dbe9f1);
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
			radial-gradient(ellipse 70% 55% at 24% 16%, rgb(208 221 234 / 0.9), transparent 66%),
			linear-gradient(170deg, #f4f3ee, #e4eaee 60%, #dde5ea);
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
			radial-gradient(ellipse 70% 55% at 30% 26%, rgb(244 242 238 / 0.95), transparent 68%),
			linear-gradient(170deg, #fbf7ee, #eef0ef 60%, #e7ebf0);
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
		.cloud {
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

		.ribbon {
			opacity: 0.42;
		}
	}
</style>
