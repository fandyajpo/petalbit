<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		VOICE_MAX_SECONDS,
		encodeVoiceNote,
		formatClipDuration,
		pickRecorderMime,
		supportsRecording,
		type VoiceClip
	} from '$lib/voice';
	import { playSound } from '$lib/sound';
	import VoicePlayer from '$lib/components/VoicePlayer.svelte';

	type Props = {
		clip?: VoiceClip | null;
		disabled?: boolean;
		onchange?: (clip: VoiceClip | null) => void;
	};

	let { clip = null, disabled = false, onchange }: Props = $props();

	type Status = 'checking' | 'idle' | 'requesting' | 'recording' | 'encoding' | 'unavailable';

	let status = $state<Status>('checking');
	let message = $state('');
	let elapsed = $state(0);
	let previewUrl = $state('');
	let cleanupScheduled = $state(true);

	let stream: MediaStream | null = null;
	let recorder: MediaRecorder | null = null;
	let chunks: Blob[] = [];
	let timer: ReturnType<typeof setInterval> | undefined;
	let startedAt = 0;
	let alive = true;

	const view = $derived(
		status === 'recording' ? 'recording' : clip ? 'ready' : status === 'unavailable' ? 'unavailable' : 'idle'
	);
	const progress = $derived(Math.min(100, (elapsed / VOICE_MAX_SECONDS) * 100));

	$effect(() => {
		const current = clip;
		if (!current) return;
		const url = URL.createObjectURL(current.blob);
		previewUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	onMount(() => {
		if (!supportsRecording()) {
			status = 'unavailable';
			message = 'This browser cannot record audio. Try Chrome, Safari or Firefox on a recent version.';
			return;
		}

		fetch('/api/voice')
			.then((response) => response.json())
			.then((data) => {
				if (!alive) return;
				cleanupScheduled = data?.cleanup !== false;
				if (data?.enabled === false) {
					status = 'unavailable';
					message = 'Voice notes are not set up on this server yet. Add PINATA_JWT to enable them.';
				} else {
					status = 'idle';
				}
			})
			.catch(() => {
				if (alive) status = 'idle';
			});

		return () => {
			alive = false;
		};
	});

	onDestroy(() => {
		alive = false;
		clearInterval(timer);
		if (recorder && recorder.state !== 'inactive') recorder.stop();
		releaseStream();
	});

	function releaseStream() {
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
	}

	async function start() {
		if (disabled || view === 'recording') return;
		message = '';
		status = 'requesting';

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true }
			});
		} catch {
			status = 'idle';
			message = 'Mic access was blocked. Allow the microphone in your browser and try again.';
			playSound('error');
			return;
		}

		try {
			const mimeType = pickRecorderMime();
			try {
				recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
			} catch {
				// Some Safari versions advertise a codec they then refuse to record.
				recorder = new MediaRecorder(stream);
			}
		} catch {
			releaseStream();
			status = 'idle';
			message = 'Could not start the recorder in this browser.';
			playSound('error');
			return;
		}

		chunks = [];
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		};
		recorder.onstop = () => void finish();
		recorder.start(200);

		startedAt = performance.now();
		elapsed = 0;
		status = 'recording';
		playSound('pluck');

		timer = setInterval(() => {
			elapsed = Math.min(VOICE_MAX_SECONDS, (performance.now() - startedAt) / 1000);
			if (elapsed >= VOICE_MAX_SECONDS) stop();
		}, 100);
	}

	function stop() {
		if (!recorder || recorder.state === 'inactive') return;
		clearInterval(timer);
		elapsed = Math.min(VOICE_MAX_SECONDS, (performance.now() - startedAt) / 1000);
		status = 'encoding';
		recorder.stop();
		releaseStream();
	}

	async function finish() {
		const type = chunks[0]?.type || 'audio/webm';
		const recorded = new Blob(chunks, { type });
		chunks = [];
		if (!alive) return;

		if (recorded.size < 800) {
			status = 'idle';
			message = 'That clip was too short — hold the button a bit longer.';
			return;
		}

		try {
			const encoded = await encodeVoiceNote(recorded);
			if (!alive) return;
			if (encoded.blob.size > 400_000) {
				status = 'idle';
				message = 'That clip came out too big. Try a shorter one.';
				return;
			}
			onchange?.(encoded);
			status = 'idle';
			playSound('success');
		} catch (error) {
			if (!alive) return;
			status = 'idle';
			message = error instanceof Error ? error.message : 'Could not turn that into an mp3.';
			playSound('error');
		}
	}

	function remove() {
		onchange?.(null);
		message = '';
		elapsed = 0;
		status = 'idle';
		playSound('remove');
	}
</script>

<div class="voice" class:has-clip={Boolean(clip)}>
	<div class="voice-head">
		<span class="voice-title">Voice note</span>
		<span class="voice-optional">optional</span>
		<span class="voice-limit">10s · mp3 128 kbps</span>
	</div>

	{#if view === 'unavailable'}
		<p class="voice-hint">{message}</p>
	{:else if view === 'ready' && clip}
		<div class="voice-ready">
			<VoicePlayer src={previewUrl} duration={clip?.duration ?? 0} peaks={clip?.peaks} />
			<div class="voice-meta">
				<span class="voice-time">{formatClipDuration(clip.duration)}</span>
				<div class="voice-bars" aria-hidden="true">
					{#each clip.peaks as peak, index (index)}
						<span style={`height:${Math.round(peak * 100)}%`}></span>
					{/each}
				</div>
			</div>
			<div class="voice-actions">
				<button type="button" class="mini" onclick={start} {disabled}>Re-record</button>
				<button type="button" class="mini ghost" onclick={remove} {disabled}>Remove</button>
			</div>
		</div>
	{:else if view === 'recording'}
		<div class="voice-live">
			<span class="rec-dot" aria-hidden="true"></span>
			<span class="voice-clock" aria-live="polite">{elapsed.toFixed(1)}s / {VOICE_MAX_SECONDS}s</span>
			<div class="voice-meter" aria-hidden="true"><span style={`width:${progress}%`}></span></div>
			<button type="button" class="record stop" onclick={stop}>Stop &amp; use</button>
		</div>
	{:else}
		<div class="voice-idle">
			<button
				type="button"
				class="record"
				onclick={start}
				disabled={disabled || status === 'encoding' || status === 'requesting' || status === 'checking'}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.7" />
					<path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
				</svg>
				{status === 'encoding'
					? 'Making the mp3…'
					: status === 'requesting'
						? 'Asking for the mic…'
						: status === 'checking'
							? 'Checking the mic…'
							: 'Record a voice note'}
			</button>
			<p class="voice-hint">Say it out loud. It gets saved with the bouquet and the link.</p>
		</div>
	{/if}

	{#if message && status !== 'unavailable'}
		<p class="voice-error" role="alert">{message}</p>
	{/if}
	{#if clip}
		<p class="voice-fine">
			{cleanupScheduled
				? 'Pinned to IPFS while the bouquet lives — removed when it expires.'
				: 'Local test clip: it stays pinned until you remove it from Pinata yourself.'}
		</p>
	{/if}
</div>

<style>
	.voice {
		border: 1px dashed var(--color-rule);
		border-radius: 3px;
		padding: 0.85rem 0.95rem;
		background: color-mix(in srgb, var(--color-paper) 70%, transparent);
	}

	.voice.has-clip {
		border-style: solid;
		border-color: var(--color-rose-light);
		background: color-mix(in srgb, var(--color-blush-soft) 35%, var(--color-paper));
	}

	.voice-head {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		margin-bottom: 0.6rem;
	}

	.voice-title {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink);
	}

	.voice-optional {
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
		background: var(--color-blush-soft);
		border-radius: 999px;
		padding: 0.12rem 0.4rem;
	}

	.voice-limit {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.voice-idle {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.record {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 2px solid var(--color-ink);
		background: var(--color-paper);
		color: var(--color-ink);
		border-radius: 3px;
		padding: 0.45rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background-color 180ms ease,
			color 180ms ease,
			transform 200ms var(--ease-spring);
	}

	.record:hover:not(:disabled) {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.record:active:not(:disabled) {
		transform: scale(0.97);
	}

	.record:disabled {
		opacity: 0.55;
		cursor: progress;
	}

	.record.stop {
		border-color: var(--color-rose-deep);
		color: var(--color-rose-deep);
		background: var(--color-blush-soft);
	}

	.record:focus-visible,
	.mini:focus-visible {
		outline: 2px solid var(--color-rose);
		outline-offset: 2px;
	}

	.voice-hint {
		font-size: 0.74rem;
		color: var(--color-ink-faint);
		max-width: 34ch;
	}

	.voice-live {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.rec-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--color-rose-deep);
		animation: pulse 1s infinite ease-in-out;
	}

	.voice-clock {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		color: var(--color-ink);
		min-width: 6.5ch;
	}

	.voice-meter {
		flex: 1;
		min-width: 90px;
		height: 5px;
		border-radius: 999px;
		background: var(--color-rule);
		overflow: hidden;
	}

	.voice-meter span {
		display: block;
		height: 100%;
		background: var(--color-rose-deep);
		transition: width 100ms linear;
	}

	.voice-ready {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}


	.voice-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.voice-time {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		color: var(--color-ink-soft);
	}

	.voice-bars {
		display: flex;
		align-items: center;
		gap: 2px;
		height: 18px;
		flex: 1;
	}

	.voice-bars span {
		width: 2px;
		background: var(--color-rose-deep);
		border-radius: 1px;
		opacity: 0.75;
	}

	.voice-actions {
		display: flex;
		gap: 0.4rem;
	}

	.mini {
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		color: var(--color-ink-soft);
		border-radius: 3px;
		padding: 0.3rem 0.55rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.mini:hover:not(:disabled) {
		border-color: var(--color-ink);
		color: var(--color-ink);
	}

	.mini.ghost {
		border-color: transparent;
		background: transparent;
		color: var(--color-ink-faint);
	}

	.mini.ghost:hover:not(:disabled) {
		color: var(--color-rose-deep);
	}

	.voice-error {
		margin-top: 0.5rem;
		font-size: 0.74rem;
		color: var(--color-rose-deep);
	}

	.voice-fine {
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.06em;
		color: var(--color-ink-faint);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.35;
			transform: scale(0.82);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rec-dot {
			animation: none;
		}
	}
</style>
