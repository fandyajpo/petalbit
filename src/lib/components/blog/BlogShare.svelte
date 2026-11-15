<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		url: string;
		title: string;
	};

	let { url, title }: Props = $props();

	let canNative = $state(false);
	let status = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		canNative = typeof navigator.share === 'function';
	});

	function announce(message: string) {
		status = message;
		clearTimeout(timer);
		timer = setTimeout(() => (status = ''), 3200);
	}

	async function copyLink() {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(url);
			} else {
				const area = document.createElement('textarea');
				area.value = url;
				area.setAttribute('readonly', '');
				area.style.position = 'fixed';
				area.style.opacity = '0';
				document.body.appendChild(area);
				area.select();
				document.execCommand('copy');
				area.remove();
			}
			announce('Link copied. Go send it to someone.');
		} catch {
			announce('Could not copy automatically. You can copy the address from your browser.');
		}
	}

	async function share() {
		if (canNative) {
			try {
				await navigator.share({ title, url });
				announce('Shared.');
				return;
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return;
			}
		}
		await copyLink();
	}
</script>

<div class="share">
	<button class="btn btn-sm" type="button" onclick={share}>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M12 3v11M8 7l4-4 4 4M5 14v5h14v-5"
				stroke="currentColor"
				stroke-width="1.7"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		{canNative ? 'Share this story' : 'Copy story link'}
	</button>
	{#if canNative}
		<button class="btn btn-sm copy" type="button" onclick={copyLink}>Copy link</button>
	{/if}
	<p class="status" role="status" aria-live="polite">{status}</p>
</div>

<style>
	.share {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem;
	}

	.btn {
		background: var(--color-paper);
	}

	.copy {
		border-color: var(--color-rule);
		color: var(--color-ink-soft);
	}

	.status {
		flex-basis: 100%;
		min-height: 1.1rem;
		font-size: 0.7rem;
		line-height: 1.5;
		color: var(--color-sage-deep);
	}
</style>
