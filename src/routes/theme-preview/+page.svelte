<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getCurrentTimeTheme,
		timeThemeConfig,
		type TimeThemeId
	} from '$lib/theme/time-theme';
	import { useTimeTheme } from '$lib/theme/time-theme-context';
	import {
		isThemeOverrideStorageEvent,
		readThemeOverride,
		writeThemeOverride,
		THEME_OVERRIDE_EVENT
	} from '$lib/theme/dev-theme-override';

	const themeContext = useTimeTheme();
	let clockId = $state<TimeThemeId | null>(null);
	let pinnedId = $state<TimeThemeId | null>(null);

	const activeId = $derived(pinnedId ?? clockId);
	const pinnedTheme = $derived(
		pinnedId ? (timeThemeConfig.find((theme) => theme.id === pinnedId) ?? null) : null
	);

	function refreshPin() {
		pinnedId = readThemeOverride()?.id ?? null;
		clockId = getCurrentTimeTheme().id;
	}

	function onStorage(event: StorageEvent) {
		if (isThemeOverrideStorageEvent(event)) refreshPin();
	}

	onMount(() => {
		refreshPin();

		// Keep the control in sync if another tab changes the shared pin.
		window.addEventListener(THEME_OVERRIDE_EVENT, refreshPin);
		window.addEventListener('storage', onStorage);
		return () => {
			window.removeEventListener(THEME_OVERRIDE_EVENT, refreshPin);
			window.removeEventListener('storage', onStorage);
		};
	});

	function handlePinChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value === 'auto') {
			writeThemeOverride(null);
			pinnedId = null;
			return;
		}
		const id = value as TimeThemeId;
		writeThemeOverride(id);
		pinnedId = id;
	}

	function clearPin() {
		writeThemeOverride(null);
		pinnedId = null;
	}

	function clock(minutes: number): string {
		const hours = Math.floor(minutes / 60) % 24;
		const mins = minutes % 60;
		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}

	function rangeFor(index: number): string {
		const start = timeThemeConfig[index];
		const end = timeThemeConfig[(index + 1) % timeThemeConfig.length];
		return `${clock(start.start)}–${clock(end.start)}`;
	}

	const swatches = [
		{ label: 'Page', variable: '--color-bone' },
		{ label: 'Paper', variable: '--color-paper' },
		{ label: 'Ink', variable: '--color-ink' },
		{ label: 'Rose', variable: '--color-rose' },
		{ label: 'Blush', variable: '--color-blush' },
		{ label: 'Sage', variable: '--color-sage' },
		{ label: 'Gold', variable: '--color-gold' },
		{ label: 'Inverse', variable: '--color-inverse-surface' }
	];

	const statuses = [
		{ label: 'Saved', variable: '--color-success-deep' },
		{ label: 'Expiring', variable: '--color-warning-deep' },
		{ label: 'Failed', variable: '--color-error-deep' },
		{ label: 'Info', variable: '--color-info-deep' }
	] as const;
</script>

<svelte:head>
	<title>Time theme preview · Petalbit</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="theme-preview">
	<header class="preview-head">
		<p class="eyebrow">Developer tool</p>
		<h1>Ten phases, one page.</h1>
		<p class="preview-sub">
			Every palette the site can use, rendered over the same components. The cards override only
			their own tokens; the control below can pin one phase across the entire site.
		</p>
		<p class="preview-context">
			<span>Local timezone: {themeContext.timezone}</span>
			<span>Active now: {activeId ?? 'checking…'}</span>
			<span>{pinnedTheme ? `Pinned: ${pinnedTheme.label}` : 'Following the clock'}</span>
			<span class="preview-route">/theme-preview · dev only</span>
		</p>
	</header>

	<section class="pin-bar" aria-labelledby="pin-title">
		<div class="pin-copy">
			<p class="eyebrow">Pin a phase</p>
			<h2 id="pin-title" aria-live="polite">
				{pinnedTheme ? `Forced: ${pinnedTheme.label}` : 'Following your clock'}
			</h2>
			<p>
				The pin applies to the whole site in this browser and survives navigation, reloads, and
				new tabs. It never changes your system clock.
			</p>
		</div>

		<div class="pin-controls">
			<div class="pin-field">
				<label for="theme-pin">Theme</label>
				<select id="theme-pin" value={pinnedId ?? 'auto'} onchange={handlePinChange}>
					<option value="auto">Auto — follow the clock</option>
					{#each timeThemeConfig as theme (theme.id)}
						<option value={theme.id}>{theme.label}</option>
					{/each}
				</select>
			</div>
			<button type="button" class="pin-button" onclick={clearPin} disabled={!pinnedId}>
				Unpin
			</button>
			<a class="pin-link" href="/">Open site</a>
		</div>
	</section>

	<div class="preview-grid">
		{#each timeThemeConfig as theme, index (theme.id)}
			<article
				class="theme-card"
				data-time-theme={theme.id}
				data-time-scheme={theme.scheme}
				aria-labelledby={`theme-${theme.id}`}
			>
				<header class="theme-head">
					<div>
						<h2 id={`theme-${theme.id}`}>{theme.label}</h2>
						<p class="theme-range">{rangeFor(index)}</p>
					</div>
					<div class="theme-flags">
						{#if activeId === theme.id}
							<span class="active-flag">Active</span>
						{/if}
						<span class="scheme-flag">{theme.scheme}</span>
					</div>
				</header>

				<div class="canvas">
					<div class="chrome">
						<span class="chrome-brand">✿ Petalbit</span>
						<span class="chrome-nav">Home&nbsp;&nbsp;Tutorial</span>
					</div>

					<div class="hero">
						<p class="eyebrow">A small hello</p>
						<h3>For someone <em>lovely.</em></h3>
						<p class="lede">A little bouquet, wrapped in pixels and sent with care.</p>
						<div class="demo-row" aria-hidden="true">
							<span class="btn btn-primary demo-btn">Start creating</span>
							<span class="btn demo-btn">Tutorial</span>
						</div>
					</div>

					<div class="sheet">
						<p class="sheet-label">Note</p>
						<p class="note">Hope this week blooms bright for you.</p>
						<div class="tags">
							<span class="tag">6 stems</span>
							<span class="tag">7 days</span>
						</div>
						<ul class="statuses">
							{#each statuses as status (status.label)}
								<li style={`color: var(${status.variable})`}>
									<span aria-hidden="true">●</span>{status.label}
								</li>
							{/each}
						</ul>
					</div>
				</div>

				<div class="state-strip" role="group" aria-label="Button states">
					<span class="state-label">States</span>
					<div class="demo-row" aria-hidden="true">
						<span class="btn btn-primary demo-btn">Default</span>
						<span class="state-hover">Hover</span>
						<span class="btn demo-btn state-disabled">Disabled</span>
						<span class="btn demo-btn state-focus">Focus</span>
					</div>
				</div>

				<div class="swatches" role="group" aria-label="Core palette">
					{#each swatches as swatch (swatch.variable)}
						<div class="swatch">
							<span
								class="swatch-color"
								style={`background: var(${swatch.variable})`}
								title={`${swatch.label}: ${swatch.variable}`}
							></span>
							<span class="swatch-label">{swatch.label}</span>
						</div>
					{/each}
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	.theme-preview {
		width: 100%;
		max-width: 1440px;
		margin-inline: auto;
		padding: clamp(1.2rem, 3vw, 2.4rem) clamp(1rem, 3vw, 2rem) 4rem;
	}

	.preview-head {
		display: grid;
		gap: 0.55rem;
		max-width: 58rem;
		margin-bottom: clamp(1.2rem, 3vw, 2rem);
	}

	.preview-head h1 {
		font-size: clamp(2rem, 4.5vw, 3.2rem);
		letter-spacing: -0.04em;
	}

	.preview-sub {
		max-width: 66ch;
		font-size: 0.9rem;
		line-height: 1.7;
		color: var(--color-ink-soft);
	}

	.preview-context {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.1rem;
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.preview-route {
		color: var(--color-rose-deep);
	}

	.pin-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem 1.4rem;
		margin-bottom: 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 10px;
		background: var(--color-paper);
		box-shadow: var(--shadow-soft);
		padding: 0.9rem 1rem;
	}

	.pin-copy {
		display: grid;
		gap: 0.28rem;
		max-width: 58ch;
	}

	.pin-copy h2 {
		font-size: clamp(1.15rem, 2vw, 1.4rem);
		letter-spacing: -0.025em;
	}

	.pin-copy > p:last-child {
		font-size: 0.76rem;
		line-height: 1.6;
		color: var(--color-ink-soft);
	}

	.pin-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.45rem;
	}

	.pin-field {
		display: grid;
		gap: 0.25rem;
	}

	.pin-field label {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.pin-field select {
		min-width: 220px;
		max-width: 100%;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper-warm);
		color: var(--color-ink);
		padding: 0.52rem 2rem 0.5rem 0.65rem;
		font-family: var(--font-sans);
		font-size: 0.78rem;
		cursor: pointer;
	}

	.pin-field select:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.pin-button,
	.pin-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.15rem;
		border: 1px solid var(--color-ink);
		border-radius: var(--radius);
		padding: 0.52rem 0.72rem;
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			color 180ms ease;
	}

	.pin-button {
		background: transparent;
		color: var(--color-ink);
	}

	.pin-button:hover:not(:disabled) {
		background: var(--color-paper-warm);
	}

	.pin-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pin-link {
		border-color: var(--color-rose-deep);
		background: var(--color-rose);
		color: var(--color-on-accent);
	}

	.pin-link:hover {
		background: var(--color-rose-hover);
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
		gap: 0.9rem;
		align-items: start;
	}

	.theme-card {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--color-rule);
		border-radius: 10px;
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: var(--shadow-soft);
	}

	.theme-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.7rem 0.75rem 0.6rem;
		border-bottom: 1px solid var(--color-rule);
	}

	.theme-head h2 {
		font-size: 1.02rem;
		letter-spacing: -0.02em;
	}

	.theme-range {
		margin-top: 0.15rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.08em;
		color: var(--color-ink-faint);
		font-variant-numeric: tabular-nums;
	}

	.theme-flags {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.active-flag,
	.scheme-flag {
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		padding: 0.1rem 0.34rem;
		font-family: var(--font-mono);
		font-size: 0.46rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.active-flag {
		border-color: var(--color-rose-deep);
		background: var(--color-rose);
		color: var(--color-on-accent);
	}

	.scheme-flag {
		color: var(--color-ink-faint);
	}

	.canvas {
		padding: 0.65rem;
		background-color: var(--color-bone);
		background-image: var(--theme-bg-image);
		background-size:
			3px 3px,
			100% 100%,
			100% 100%;
	}

	.chrome {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-rule);
		font-family: var(--font-mono);
		font-size: 0.44rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.chrome-brand {
		color: var(--color-ink);
	}

	.hero {
		padding: 0.75rem 0 0.7rem;
	}

	.hero .eyebrow {
		font-size: 0.48rem;
	}

	.hero h3 {
		margin-top: 0.35rem;
		font-size: clamp(1.35rem, 2.3vw, 1.7rem);
		letter-spacing: -0.035em;
	}

	.hero h3 em {
		font-style: italic;
		color: var(--color-rose);
	}

	.lede {
		margin-top: 0.4rem;
		max-width: 34ch;
		font-size: 0.68rem;
		line-height: 1.55;
		color: var(--color-ink-soft);
	}

	.demo-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.hero .demo-row {
		margin-top: 0.6rem;
	}

	.demo-btn {
		padding: 0.42rem 0.6rem 0.4rem;
		font-size: 0.6rem;
	}

	.sheet {
		border: 1px solid var(--color-rule);
		border-radius: 6px;
		background: var(--color-paper);
		padding: 0.55rem 0.6rem;
	}

	.sheet-label {
		font-family: var(--font-mono);
		font-size: 0.44rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.note {
		margin-top: 0.18rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--color-ink);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.45rem;
	}

	.tags :global(.tag) {
		font-size: 0.44rem;
	}

	.statuses {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.22rem 0.4rem;
		margin: 0.55rem 0 0;
		padding: 0.5rem 0 0;
		border-top: 1px dashed var(--color-rule);
	}

	.statuses li {
		display: flex;
		align-items: center;
		gap: 0.28rem;
		font-family: var(--font-mono);
		font-size: 0.44rem;
		letter-spacing: 0.04em;
	}

	.statuses li span {
		font-size: 0.4rem;
	}

	.state-strip {
		display: grid;
		gap: 0.35rem;
		padding: 0.6rem 0.65rem;
		border-top: 1px solid var(--color-rule);
		background: var(--color-paper-warm);
	}

	.state-label {
		font-family: var(--font-mono);
		font-size: 0.44rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.state-hover,
	.state-focus,
	.state-disabled {
		border-radius: var(--radius);
		font-size: 0.58rem;
		font-weight: 600;
		line-height: 1;
		padding: 0.42rem 0.6rem 0.4rem;
	}

	.state-hover {
		border: 1px solid var(--color-rose-deep);
		background: var(--color-rose-hover);
		color: var(--color-on-accent);
		box-shadow: 3px 3px 0 0 var(--color-rose-deep);
		transform: translate(-2px, -2px);
	}

	.state-focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}

	.state-disabled {
		opacity: 0.45;
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 0.22rem;
		padding: 0.55rem 0.65rem 0.65rem;
		border-top: 1px solid var(--color-rule);
	}

	.swatch {
		display: grid;
		gap: 0.18rem;
		min-width: 0;
	}

	.swatch-color {
		display: block;
		height: 20px;
		border: 1px solid var(--color-rule);
		border-radius: 3px;
	}

	.swatch-label {
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.4rem;
		letter-spacing: 0.04em;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-ink-faint);
	}

	@media (max-width: 640px) {
		.pin-controls {
			width: 100%;
		}

		.pin-field {
			flex: 1 1 100%;
		}

		.pin-field select {
			width: 100%;
		}

		.pin-button,
		.pin-link {
			flex: 1 1 auto;
		}
	}

	@media (max-width: 420px) {
		.swatches {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
