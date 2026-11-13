<script lang="ts">
	import Bouquet from '$lib/components/Bouquet.svelte';
	import BouquetBackground from '$lib/components/BouquetBackground.svelte';
	import { getFlower } from '$lib/data/flowers';

	let { step, active }: { step: number; active: boolean } = $props();

	const demoFlowers = ['mawar', 'peony', 'tulip', 'daisy', 'lavender'];
	const example = {
		to: 'Maya',
		from: 'Alex',
		message: 'Saw these and thought of you. Hope your week blooms a little brighter.'
	};

	let picked = $state<string[]>([]);
	let to = $state('');
	let from = $state('');
	let message = $state('');

	$effect(() => {
		if (!active) return;
		let cancelled = false;
		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		if (step === 1) {
			picked = [];
			void (async () => {
				for (const id of demoFlowers) {
					if (cancelled) return;
					await sleep(360);
					if (cancelled) return;
					picked = [...picked, id];
				}
			})();
		}

		if (step === 2) {
			to = '';
			from = '';
			message = '';
			void (async () => {
				for (let i = 0; i < example.to.length; i += 1) {
					if (cancelled) return;
					to = example.to.slice(0, i + 1);
					await sleep(110);
				}
				await sleep(150);
				for (let i = 0; i < example.from.length; i += 1) {
					if (cancelled) return;
					from = example.from.slice(0, i + 1);
					await sleep(110);
				}
				await sleep(180);
				for (let i = 0; i < example.message.length; i += 1) {
					if (cancelled) return;
					message = example.message.slice(0, i + 1);
					await sleep(26);
				}
			})();
		}

		return () => {
			cancelled = true;
		};
	});

	const typingNote = $derived(active && step === 2 && message.length < example.message.length);
</script>

{#if step === 1}
	<div class="mini flowers-mini" class:live={active}>
		<div class="mini-top">
			<span class="mini-label">Pick flowers</span>
			<span class="mini-count">{picked.length}/7</span>
		</div>
		<div class="tile-row">
			{#each demoFlowers as id (id)}
				{@const flower = getFlower(id)}
				{#if flower}
					<div class="mini-tile" class:on={picked.includes(id)}>
						<img src={flower.image} alt="" width="450" height="696" loading="lazy" />
						<span>{flower.name}</span>
					</div>
				{/if}
			{/each}
		</div>
		<p class="mini-foot">{picked.length === 5 ? 'Ready for a wrap' : 'Tap to add a stem'}</p>
	</div>
{:else if step === 2}
	<div class="mini note-mini" class:live={active}>
		<div class="mini-top">
			<span class="mini-label">Write the note</span>
			<span class="mini-count">3–500</span>
		</div>
		<p class="mini-line"><span>To</span><strong>{to || '—'}</strong></p>
		<p class="mini-line"><span>From</span><strong>{from || '—'}</strong></p>
		<p class="mini-message">
			{message || 'A little note for them to keep.'}{#if typingNote}<span class="caret"></span>{/if}
		</p>
	</div>
{:else}
	<div class="mini send-mini" class:live={active}>
		<div class="mini-bouquet">
			<BouquetBackground background="liquid" />
			<Bouquet flowers={demoFlowers} paper="petal-pop" greenery={false} />
		</div>
		<div class="send-copy">
			<span class="send-ready">Link ready</span>
			<p>One link, seven days.</p>
			<code>petalbit.vercel.app/b/••••</code>
		</div>
	</div>
{/if}

<style>
	.mini {
		display: grid;
		gap: 0.35rem;
		align-content: start;
		height: 100%;
		border-radius: 8px;
		background: var(--color-paper);
		padding: 0.4rem 0.45rem;
		overflow: hidden;
	}

	.mini-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.mini-label {
		font-family: var(--font-mono);
		font-size: 0.44rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
	}

	.mini-count {
		font-family: var(--font-mono);
		font-size: 0.44rem;
		color: var(--color-ink-faint);
	}

	.tile-row {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.2rem;
	}

	.mini-tile {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.05rem;
		border: 1px solid var(--color-rule-soft);
		border-radius: 6px;
		background: var(--color-paper-warm);
		padding: 0.12rem 0.08rem 0.16rem;
		transition:
			border-color 280ms ease,
			background-color 280ms ease,
			transform 280ms var(--ease-spring);
	}

	.mini-tile.on {
		border-color: var(--color-rose-deep);
		background: var(--color-blush-soft);
		transform: translateY(-1px);
	}

	.mini-tile img {
		height: 32px;
		width: auto;
		display: block;
	}

	.mini-tile > span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-display);
		font-size: 0.48rem;
		color: var(--color-ink-soft);
	}

	.mini-foot {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.62rem;
		color: var(--color-ink-faint);
	}

	.note-mini {
		align-content: start;
	}

	.mini-line {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		font-family: var(--font-display);
		font-size: 0.72rem;
		color: var(--color-ink);
	}

	.mini-line span {
		font-family: var(--font-mono);
		font-size: 0.4rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.mini-message {
		min-height: 3.2em;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.66rem;
		line-height: 1.45;
		color: var(--color-ink-soft);
		overflow-wrap: anywhere;
	}

	.caret {
		display: inline-block;
		width: 1px;
		height: 0.9em;
		margin-left: 1px;
		vertical-align: -0.1em;
		background: var(--color-rose-deep);
		animation: blink 1s steps(2, start) infinite;
	}

	@keyframes blink {
		to {
			visibility: hidden;
		}
	}

	.send-mini {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		align-items: center;
		gap: 0.45rem;
	}

	.mini-bouquet {
		position: relative;
		isolation: isolate;
		width: 100%;
		max-width: 150px;
		margin-inline: auto;
		aspect-ratio: 1 / 1.02;
		overflow: hidden;
	}

	.send-copy {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	.send-ready {
		justify-self: start;
		border-radius: 999px;
		background: var(--color-sage);
		color: #fff;
		padding: 0.12rem 0.38rem;
		font-family: var(--font-mono);
		font-size: 0.4rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		opacity: 0;
		transform: scale(0.8);
	}

	.live .send-ready {
		opacity: 1;
		transform: none;
		transition:
			opacity 400ms ease,
			transform 420ms var(--ease-spring);
	}

	.send-copy p {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.66rem;
		line-height: 1.35;
		color: var(--color-ink-soft);
	}

	.send-copy code {
		font-family: var(--font-mono);
		font-size: 0.4rem;
		color: var(--color-rose-deep);
		overflow-wrap: anywhere;
	}

	@media (prefers-reduced-motion: reduce) {
		.mini-tile,
		.send-ready {
			transition: none;
		}

		.caret {
			animation: none;
		}
	}
</style>
