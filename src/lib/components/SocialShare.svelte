<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		url: string;
		text: string;
	};

	let { url, text }: Props = $props();

	let canNative = $state(false);

	onMount(() => {
		canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	const encodedText = $derived(encodeURIComponent(text));
	const encodedUrl = $derived(encodeURIComponent(url));

	const links = $derived([
		{
			label: 'WhatsApp',
			href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
			paths: [
				'M4 19.5 5.1 16a8 8 0 1 1 3 3l-4.1.5Z',
				'M8.7 8.1c.3-.1.5 0 .7.3l.7 1.2c.1.2.1.4 0 .6l-.5.6c-.1.2-.1.4 0 .6.4.7 1.4 1.7 2.2 2.1.3.1.5.1.7-.1l.6-.6c.2-.2.3-.2.6-.1l1.3.7c.2.1.3.4.2.6-.2.7-.9 1.3-1.7 1.3-2.3 0-5.6-3.1-5.6-5.4 0-.7.4-1.4 1-1.8Z'
			]
		},
		{
			label: 'Telegram',
			href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
			paths: ['M21 4 3 11l5 2 2 5 3-3 4 3 4-14Z', 'm8 13 9-6-6 8']
		},
		{
			label: 'X',
			href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
			paths: ['M4 4h4l4.2 5.5L16.8 4H20l-6.2 7.1L20.5 20h-4l-4.6-6-5 6H4l6.6-7.7L4 4Z']
		},
		{
			label: 'Facebook',
			href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
			paths: ['M15 4h-2a3 3 0 0 0-3 3v3H7v3h3v7h3v-7h3l1-3h-4V7a1 1 0 0 1 1-1h2V4Z']
		},
		{
			label: 'Email',
			href: `mailto:?subject=${encodeURIComponent('A pixel bouquet for you')}&body=${encodedText}%0A%0A${encodedUrl}`,
			paths: ['M3 5h18v14H3z', 'm3 6 9 7 9-7']
		}
	]);

	async function nativeShare() {
		if (!canNative) return;
		try {
			await navigator.share({ title: 'A Petalbit bouquet', text, url });
		} catch {
			/* the sheet was dismissed */
		}
	}
</script>

<div class="share-actions">
	<span class="share-label">Share it</span>
	<div class="share-row">
		{#if canNative}
			<button type="button" class="share-btn" onclick={nativeShare} aria-label="Share bouquet" title="Share">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="M12 3v11M8 7l4-4 4 4M5 14v5h14v-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		{/if}

		{#each links as link (link.label)}
			<a
				class="share-btn"
				href={link.href}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`Share on ${link.label}`}
				title={`Share on ${link.label}`}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					{#each link.paths as d (d)}
						<path d={d} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					{/each}
				</svg>
			</a>
		{/each}
	</div>
</div>

<style>
	.share-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}

	.share-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.share-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.share-btn {
		display: inline-grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: var(--color-paper);
		color: var(--color-ink-soft);
		cursor: pointer;
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			color 180ms ease,
			transform 220ms var(--ease-spring);
	}

	.share-btn:hover {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
		transform: translateY(-1px);
	}

	.share-btn:focus-visible {
		outline: 2px solid var(--color-rose);
		outline-offset: 2px;
	}
</style>
