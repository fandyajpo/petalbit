<script lang="ts">
	type Props = { value: string; label?: string; compact?: boolean };
	let { value, label = 'Tautan buket', compact = false }: Props = $props();

	let copied = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				const area = document.createElement('textarea');
				area.value = value;
				area.setAttribute('readonly', '');
				area.style.position = 'fixed';
				area.style.opacity = '0';
				document.body.appendChild(area);
				area.select();
				document.execCommand('copy');
				area.remove();
			}
			copied = true;
			failed = false;
		} catch {
			failed = true;
			copied = false;
		}

		clearTimeout(timer);
		timer = setTimeout(() => {
			copied = false;
			failed = false;
		}, 2400);
	}
</script>

<div class="copy" class:compact>
	{#if !compact}
		<label class="label" for="share-link">{label}</label>
	{/if}
	<div class="row">
		<input id="share-link" class="link" type="text" readonly value={value} />
		<button class="btn btn-primary btn-sm" type="button" onclick={copy}>
			{#if copied}
				Tersalin!
			{:else}
				Salin
			{/if}
		</button>
	</div>
	{#if failed}
		<p class="status" role="status">Tidak bisa menyalin otomatis — salin tautan di atas ya.</p>
	{:else if copied}
		<p class="status ok" role="status">Tautan siap dibagikan. Tinggal tempel di chat.</p>
	{/if}
</div>

<style>
	.copy {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.row {
		display: flex;
		gap: 0.6rem;
		align-items: stretch;
	}

	.link {
		flex: 1;
		min-width: 0;
		border: 2px solid rgb(43 31 34 / 0.14);
		border-radius: 3px;
		background: var(--color-paper);
		padding: 0.62rem 0.8rem;
		font-size: 0.82rem;
		color: var(--color-ink-soft);
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
	}

	.link:focus {
		outline: none;
		border-color: var(--color-rose);
	}

	.status {
		font-size: 0.76rem;
		color: var(--color-rose-deep);
	}

	.status.ok {
		color: var(--color-sage-deep);
	}

	.compact .row {
		gap: 0.5rem;
	}

	@media (max-width: 480px) {
		.row {
			flex-direction: column;
		}
	}
</style>
