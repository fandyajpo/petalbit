<script lang="ts">
	import { onMount } from 'svelte';
	import { getSoundOn, playSound, setSoundOn, subscribeSound } from '$lib/sound';

	let on = $state(false);

	onMount(() => {
		on = getSoundOn();
		return subscribeSound((value) => (on = value));
	});

	function toggle() {
		const next = !on;
		setSoundOn(next);
		if (next) playSound('toggle');
	}
</script>

<button
	type="button"
	class="sound-toggle"
	class:on
	aria-pressed={on}
	aria-label={on ? 'Turn sound off' : 'Turn sound on'}
	title={on ? 'Sound on' : 'Sound off'}
	onclick={toggle}
>
	<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M2 6h2.2L7.5 3v10L4.2 10H2V6Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
		{#if on}
			<path d="M9.8 5.4a3.4 3.4 0 0 1 0 5.2M11.6 3.7a5.7 5.7 0 0 1 0 8.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		{:else}
			<path d="M10 6.2 13.4 9.8M13.4 6.2 10 9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		{/if}
	</svg>
	<span class="sr-only">{on ? 'Sound on' : 'Sound off'}</span>
</button>

<style>
	.sound-toggle {
		display: inline-grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-paper) 55%, transparent);
		color: var(--color-ink-faint);
		cursor: pointer;
		transition:
			background-color 200ms ease,
			border-color 200ms ease,
			color 200ms ease,
			transform 240ms var(--ease-spring);
	}

	.sound-toggle:hover {
		border-color: var(--color-ink);
		color: var(--color-ink);
	}

	.sound-toggle.on {
		background: var(--color-blush-soft);
		border-color: var(--color-rose-light);
		color: var(--color-rose-deep);
	}

	.sound-toggle:active {
		transform: scale(0.94);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
