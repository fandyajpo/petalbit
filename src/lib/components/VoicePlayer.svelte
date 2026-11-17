<script lang="ts">
	/**
	 * Themed voice-note player. Replaces the native <audio controls> so the
	 * player matches Petalbit's warm-paper / ink / rose system.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { suppressSound, restoreSound, playSound } from '$lib/sound';

	type Props = {
		src: string;
		duration?: number;
		peaks?: number[];
		compact?: boolean;
		downloadName?: string;
	};
	let { src, duration = 0, peaks, compact = false, downloadName = 'petalbit-voice.mp3' }: Props = $props();

	let audio: HTMLAudioElement | undefined = $state();
	let playing = $state(false);
	let current = $state(0);
	let total = $state(0);
	let volume = $state(1);
	let muted = $state(false);
	let loading = $state(true);
	let errored = $state(false);
	let hoverTime = $state<number | null>(null);
	let hoverX = $state(0);
	let downloading = $state(false);
	let trackEl: HTMLElement | undefined = $state();
	let dragging = false;
	let seeking = false;

	const VOLUME_KEY = 'petalbit:voice-volume';

	$effect(() => {
		if (duration > 0 && total === 0) total = duration;
	});

	// Reload the media element whenever src changes so a re-recorded clip
	// replaces the previously cached audio instead of replaying the old one.
	$effect(() => {
		void src;
		if (audio) {
			current = 0;
			playing = false;
			loading = true;
			errored = false;
			audio.load();
		}
	});

	// Duck site sound effects while a voice note is playing.
	$effect(() => {
		if (playing) suppressSound();
		else restoreSound();
		return () => restoreSound();
	});

	function fmt(s: number): string {
		if (!Number.isFinite(s) || s < 0) return '0:00';
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${String(sec).padStart(2, '0')}`;
	}

	function toggle() {
		if (!audio || errored) return;
		if (audio.paused) void audio.play();
		else audio.pause();
	}

	function onTimeUpdate() {
		if (audio && !seeking) current = audio.currentTime;
	}

	function onLoadedMetadata() {
		if (audio && Number.isFinite(audio.duration) && audio.duration > 0) total = audio.duration;
		loading = false;
	}

	function onCanPlay() {
		loading = false;
	}

	function onWaiting() {
		loading = true;
	}

	function onPlaying() {
		loading = false;
	}

	function onError() {
		errored = true;
		loading = false;
		playing = false;
	}

	function onPlay() {
		playing = true;
		playSound('pluck');
		updateMediaSession();
	}

	function onPause() {
		playing = false;
		updateMediaSession();
	}

	function onEnded() {
		playing = false;
		current = 0;
		if (audio) audio.currentTime = 0;
		updateMediaSession();
	}

	function seekTo(clientX: number) {
		if (!audio || !total || !trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
		const t = ratio * total;
		audio.currentTime = t;
		current = t;
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		seeking = true;
		seekTo(e.clientX);
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		seekTo(e.clientX);
	}

	function onPointerUp() {
		dragging = false;
		seeking = false;
	}

	function onTrackMove(e: PointerEvent) {
		if (!trackEl || !total) return;
		const rect = trackEl.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		hoverTime = ratio * total;
		hoverX = e.clientX - rect.left;
	}

	function onTrackLeave() {
		hoverTime = null;
	}

	function onKey(e: KeyboardEvent) {
		if (!audio || !total) return;
		if (e.key === 'ArrowRight') {
			audio.currentTime = Math.min(total, audio.currentTime + 2);
			current = audio.currentTime;
			e.preventDefault();
		} else if (e.key === 'ArrowLeft') {
			audio.currentTime = Math.max(0, audio.currentTime - 2);
			current = audio.currentTime;
			e.preventDefault();
		} else if (e.key === ' ') {
			toggle();
			e.preventDefault();
		} else if (e.key === 'm' || e.key === 'M') {
			muted = !muted;
			e.preventDefault();
		}
	}

	function readVolumePreference() {
		try {
			const raw = localStorage.getItem(VOLUME_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as { volume?: unknown; muted?: unknown };
			if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) {
				volume = Math.min(1, Math.max(0, saved.volume));
			}
			if (typeof saved.muted === 'boolean') muted = saved.muted;
		} catch {
			/* ignore a blocked or corrupt preference */
		}
	}

	function saveVolumePreference() {
		try {
			localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted }));
		} catch {
			/* storage can be blocked in private modes */
		}
	}

	function onVolumeInput(e: Event) {
		const v = Number((e.target as HTMLInputElement).value);
		volume = v;
		if (audio) audio.volume = muted ? 0 : v;
		if (v > 0) muted = false;
		saveVolumePreference();
	}

	function toggleMute() {
		muted = !muted;
		if (audio) audio.volume = muted ? 0 : volume;
		saveVolumePreference();
	}

	$effect(() => {
		if (audio) audio.volume = muted ? 0 : volume;
	});

	async function download() {
		if (downloading) return;
		downloading = true;
		const a = document.createElement('a');
		try {
			// In-app browsers (and older iOS Safari) ignore the download attribute,
			// so hand the file to the browser instead of failing silently.
			if (typeof a.download === 'undefined') {
				window.open(src, '_blank', 'noopener');
				playSound('success');
				return;
			}
			const res = await fetch(src);
			if (!res.ok) throw new Error(`voice download failed: ${res.status}`);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			a.href = url;
			a.download = downloadName;
			a.rel = 'noopener';
			document.body.appendChild(a);
			a.click();
			a.remove();
			// Safari needs the object URL to outlive the click.
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			playSound('success');
		} catch {
			try {
				window.open(src, '_blank', 'noopener');
				playSound('success');
			} catch {
				playSound('error');
			}
		} finally {
			downloading = false;
		}
	}

	function updateMediaSession() {
		if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
		try {
			navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
			// Setting a zero duration throws, and there is nothing to show yet.
			if (total > 0) {
				navigator.mediaSession.setPositionState?.({
					duration: total,
					playbackRate: audio?.playbackRate ?? 1,
					position: Math.min(total, Math.max(0, current))
				});
			}
		} catch {
			/* ignore */
		}
	}

	onMount(() => {
		readVolumePreference();
		if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
			try {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: 'Voice note',
					artist: 'Petalbit',
					album: 'Bouquet',
					artwork: [{ src: '/art/logo-mark.png', sizes: '96x96', type: 'image/png' }]
				});
				navigator.mediaSession.setActionHandler('play', () => audio?.play());
				navigator.mediaSession.setActionHandler('pause', () => audio?.pause());
				navigator.mediaSession.setActionHandler('seekto', (details) => {
					if (audio && details.seekTime != null) {
						audio.currentTime = details.seekTime;
						current = details.seekTime;
					}
				});
			} catch {
				/* ignore */
			}
		}
	});

	onDestroy(() => {
		restoreSound();
		if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
			try {
				navigator.mediaSession.setActionHandler('play', null);
				navigator.mediaSession.setActionHandler('pause', null);
				navigator.mediaSession.setActionHandler('seekto', null);
			} catch {
				/* ignore */
			}
		}
	});

	$effect(() => {
		updateMediaSession();
	});

	const progress = $derived(total > 0 ? (current / total) * 100 : 0);

	// Normalise peaks to the available count; fall back to a flat line.
	const bars = $derived.by(() => {
		if (peaks && peaks.length > 0) return peaks;
		return Array.from({ length: 44 }, () => 0.35);
	});
</script>

<div class="player" class:compact role="group" aria-label="Voice note player">
	<audio
		bind:this={audio}
		{src}
		preload="metadata"
		ontimeupdate={onTimeUpdate}
		onloadedmetadata={onLoadedMetadata}
		oncanplay={onCanPlay}
		onwaiting={onWaiting}
		onplaying={onPlaying}
		onplay={onPlay}
		onpause={onPause}
		onended={onEnded}
		onerror={onError}
	></audio>

	<button
		class="play"
		type="button"
		aria-label={playing ? 'Pause voice note' : 'Play voice note'}
		onclick={toggle}
		disabled={errored}
	>
		{#if errored}
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
			</svg>
		{:else if playing}
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<rect x="3" y="2" width="3.5" height="12" rx="0.5" fill="currentColor" />
				<rect x="9.5" y="2" width="3.5" height="12" rx="0.5" fill="currentColor" />
			</svg>
		{:else}
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path d="M4 2.5 L13 8 L4 13.5 Z" fill="currentColor" />
			</svg>
		{/if}
		{#if playing}
			<span class="eq" aria-hidden="true">
				<span></span><span></span><span></span>
			</span>
		{/if}
	</button>

	<div class="track-wrap">
		<div
			class="track"
			bind:this={trackEl}
			role="slider"
			tabindex="0"
			aria-valuemin="0"
			aria-valuemax={Math.round(total)}
			aria-valuenow={Math.round(current)}
			aria-label="Playback position"
			onpointerdown={onPointerDown}
			onpointermove={(e) => { onPointerMove(e); onTrackMove(e); }}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onpointerleave={onTrackLeave}
			onkeydown={onKey}
		>
			<div class="wave" aria-hidden="true">
				{#each bars as peak, i (i)}
					<span class="bar" style={`height: ${Math.max(8, peak * 100)}%`}></span>
				{/each}
			</div>
			<div class="fill" style={`width: ${progress}%`}></div>
			<div class="knob" style={`left: ${progress}%`}></div>
			{#if hoverTime !== null}
				<div class="tooltip" style={`left: ${hoverX}px`}>{fmt(hoverTime)}</div>
			{/if}
			{#if loading && !errored}
				<div class="spinner" aria-hidden="true"></div>
			{/if}
		</div>
		<div class="times">
			<span class="time">{fmt(current)}</span>
			<span class="time">{fmt(total || duration)}</span>
		</div>
	</div>

	{#if !compact}
		<div class="side">
			<button
				class="vol"
				type="button"
				aria-label={muted ? 'Unmute' : 'Mute'}
				onclick={toggleMute}
			>
				{#if muted || volume === 0}
					<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
						<path d="M2 6h2.2L7.5 3v10L4.2 10H2V6Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
						<path d="M10 6.2 13.4 9.8M13.4 6.2 10 9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
						<path d="M2 6h2.2L7.5 3v10L4.2 10H2V6Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
						<path d="M9.8 5.4a3.4 3.4 0 0 1 0 5.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
				{/if}
			</button>
			<input
				class="vol-slider"
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={muted ? 0 : volume}
				aria-label="Volume"
				oninput={onVolumeInput}
			/>
			<button
				class="dl"
				type="button"
				aria-label="Download voice note"
				onclick={download}
				disabled={downloading || errored}
			>
				{#if downloading}
					<span class="spinner sm" aria-hidden="true"></span>
				{:else}
					<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
						<path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M3 13h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				{/if}
			</button>
		</div>
	{/if}

	{#if errored}
		<p class="err" role="alert">Could not load this voice note.</p>
	{/if}

	<div class="sr-only" aria-live="polite">
		{playing ? `Playing, ${fmt(current)} of ${fmt(total || duration)}` : `Paused at ${fmt(current)}`}
	</div>
</div>

<style>
	.player {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--color-ink);
		border-radius: var(--radius);
		background: var(--color-paper);
		box-shadow: 3px 3px 0 0 var(--color-ink);
	}

	.player.compact {
		gap: 0.6rem;
		padding: 0.55rem 0.7rem;
		box-shadow: 2px 2px 0 0 var(--color-ink);
	}

	.play {
		position: relative;
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border: 1px solid var(--color-rose-deep);
		border-radius: var(--radius);
		background: var(--color-rose);
		color: var(--color-on-accent);
		cursor: pointer;
		transition:
			transform 200ms var(--ease-out),
			box-shadow 200ms var(--ease-out),
			background-color 160ms ease;
	}

	.compact .play {
		width: 2rem;
		height: 2rem;
	}

	.play:hover:not(:disabled) {
		transform: translate(-1px, -1px);
		box-shadow: 2px 2px 0 0 var(--color-rose-deep);
		background: var(--color-rose-hover);
	}

	.play:active:not(:disabled) {
		transform: translate(1px, 1px);
		box-shadow: none;
	}

	.play:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.play:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.eq {
		position: absolute;
		bottom: 4px;
		right: 4px;
		display: flex;
		align-items: flex-end;
		gap: 1px;
		height: 8px;
	}

	.eq span {
		width: 2px;
		background: var(--color-on-accent);
		border-radius: 1px;
		animation: eq 0.9s ease-in-out infinite;
	}

	.eq span:nth-child(1) { animation-delay: 0s; height: 40%; }
	.eq span:nth-child(2) { animation-delay: 0.15s; height: 70%; }
	.eq span:nth-child(3) { animation-delay: 0.3s; height: 50%; }

	@keyframes eq {
		0%, 100% { transform: scaleY(0.4); }
		50% { transform: scaleY(1); }
	}

	.track-wrap {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.track {
		position: relative;
		height: 16px;
		border: 1px solid var(--color-ink);
		border-radius: 999px;
		background: var(--color-paper-warm);
		cursor: pointer;
		touch-action: none;
		overflow: hidden;
	}

	.wave {
		position: absolute;
		inset: 1px;
		display: flex;
		align-items: center;
		gap: 1px;
		pointer-events: none;
	}

	.bar {
		flex: 1 1 0;
		min-width: 1px;
		background: color-mix(in srgb, var(--color-ink) 28%, transparent);
		border-radius: 1px;
		transition: background-color 200ms ease;
	}

	.fill {
		position: absolute;
		inset: 1px auto 1px 1px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-rose) 55%, transparent);
		pointer-events: none;
		mix-blend-mode: multiply;
	}

	.knob {
		position: absolute;
		top: 50%;
		width: 12px;
		height: 12px;
		margin-left: -6px;
		transform: translateY(-50%);
		border: 1px solid var(--color-ink);
		border-radius: 999px;
		background: var(--color-paper);
		box-shadow: 1px 1px 0 0 var(--color-ink);
		pointer-events: none;
		transition: transform 160ms var(--ease-out);
	}

	.track:hover .knob {
		transform: translateY(-50%) scale(1.15);
	}

	.tooltip {
		position: absolute;
		top: -1.6rem;
		transform: translateX(-50%);
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--color-ink);
		border-radius: var(--radius);
		background: var(--color-ink);
		color: var(--color-paper);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		pointer-events: none;
		white-space: nowrap;
	}

	.spinner {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		width: 10px;
		height: 10px;
		margin-top: -5px;
		border: 1.5px solid var(--color-rule);
		border-top-color: var(--color-rose);
		border-radius: 999px;
		animation: spin 0.7s linear infinite;
	}

	.spinner.sm {
		position: static;
		margin: 0;
		width: 11px;
		height: 11px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.times {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.06em;
		color: var(--color-ink-soft);
	}

	.side {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.vol, .dl {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: transparent;
		color: var(--color-ink-soft);
		cursor: pointer;
		transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
	}

	.vol:hover, .dl:hover {
		border-color: var(--color-ink);
		color: var(--color-ink);
		background: var(--color-paper-warm);
	}

	.vol:focus-visible, .dl:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.vol-slider {
		width: 64px;
		accent-color: var(--color-rose);
	}

	.err {
		width: 100%;
		font-size: 0.72rem;
		color: var(--color-rose-deep);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.eq span { animation: none; }
		.spinner, .spinner.sm { animation: none; }
		.play, .knob { transition: none; }
	}
</style>
