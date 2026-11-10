<script lang="ts">
	import { onMount } from 'svelte';

	let hidden = $state(false);
	let leaving = $state(false);
	let timers: ReturnType<typeof setTimeout>[] = [];

	function finish() {
		for (const timer of timers) clearTimeout(timer);
		timers = [];
		leaving = true;
		timers.push(
			setTimeout(() => {
				hidden = true;
				try {
					sessionStorage.setItem('petalbit:intro', 'seen');
				} catch {
					/* ignore */
				}
			}, 420)
		);
	}

	onMount(() => {
		let seen = false;
		try {
			seen = sessionStorage.getItem('petalbit:intro') === 'seen';
		} catch {
			/* ignore */
		}

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (seen || reduce) {
			hidden = true;
			return;
		}

		timers.push(setTimeout(finish, 1750));
		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	});

	$effect(() => {
		if (hidden) {
			document.body.style.overflow = '';
			return;
		}
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if !hidden}
	<div class="intro" class:leaving role="status" aria-live="polite" aria-label="Memuat Petalbit">
		<div class="pixels" aria-hidden="true">
			{#each Array(16) as _, i}
				<span style="--i:{i}"></span>
			{/each}
		</div>

		<div class="bloom">
			<img src="/art/logo-mark.png" alt="" width="96" height="96" class="pixelated" />
		</div>

		<div class="word" aria-hidden="true">
			{#each [...'Petalbit'] as letter, i}
				<span style="--i:{i}">{letter}</span>
			{/each}
		</div>

		<p class="hint">Little pixels, lovely flowers.</p>

		<button class="skip" type="button" onclick={finish}>Lewati</button>
	</div>
{/if}

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') finish();
	}}
/>

<style>
	:global(html[data-intro='seen']) .intro {
		display: none;
	}

	.intro {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0;
		background:
			radial-gradient(circle at 50% 38%, #fbf6ec 0%, #f1e8da 55%, #e5d6c2 100%);
		transition:
			opacity 420ms ease,
			visibility 420ms ease;
	}

	.intro.leaving {
		opacity: 0;
		visibility: hidden;
	}

	.pixels {
		display: grid;
		grid-template-columns: repeat(8, 7px);
		gap: 6px;
		margin-bottom: 1.6rem;
		opacity: 0.85;
	}

	.pixels span {
		width: 7px;
		height: 7px;
		background: var(--color-blush);
		animation: pixel-in 900ms ease both;
		animation-delay: calc(var(--i) * 26ms);
	}

	.pixels span:nth-child(3n) {
		background: var(--color-rose-light);
	}

	.pixels span:nth-child(4n) {
		background: var(--color-sage);
		opacity: 0.55;
	}

	@keyframes pixel-in {
		0% {
			opacity: 0;
			transform: scale(0.4);
		}
		40% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0.25;
			transform: scale(0.7);
		}
	}

	.bloom {
		width: 92px;
		height: 92px;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background: var(--color-paper);
		box-shadow: 5px 5px 0 0 var(--color-blush);
		overflow: hidden;
		animation: bloom-pop 900ms cubic-bezier(0.18, 0.85, 0.3, 1.12) 260ms both;
	}

	.bloom img {
		width: 100%;
		height: 100%;
		display: block;
	}

	@keyframes bloom-pop {
		from {
			opacity: 0;
			transform: scale(0.72) translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.word {
		display: flex;
		margin-top: 1.4rem;
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 6vw, 2.5rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-ink);
	}

	.word span {
		opacity: 0;
		animation: letter-in 480ms ease forwards;
		animation-delay: calc(540ms + var(--i) * 45ms);
	}

	@keyframes letter-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.hint {
		margin-top: 0.55rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-ink-soft);
		opacity: 0;
		animation: letter-in 500ms ease forwards;
		animation-delay: 900ms;
	}

	.skip {
		position: absolute;
		right: 1.4rem;
		bottom: 1.4rem;
		background: none;
		border: none;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		cursor: pointer;
		padding: 0.5rem;
	}

	.skip:hover {
		color: var(--color-ink);
	}

	@media (prefers-reduced-motion: reduce) {
		.intro {
			display: none;
		}
	}
</style>
