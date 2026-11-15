const STORAGE_KEY = 'petalbit:sound';

let enabled = false;
let hydrated = false;
const listeners = new Set<(on: boolean) => void>();

let context: AudioContext | null = null;

function hydrate() {
	if (hydrated || typeof window === 'undefined') return;
	hydrated = true;
	try {
		enabled = window.localStorage.getItem(STORAGE_KEY) === 'on';
	} catch {
		enabled = false;
	}
}

export function getSoundOn(): boolean {
	hydrate();
	return enabled;
}

export function subscribeSound(listener: (on: boolean) => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setSoundOn(on: boolean) {
	hydrate();
	enabled = on;
	try {
		window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
	} catch {
		/* storage can be unavailable in private mode */
	}
	for (const listener of listeners) listener(on);
}

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	if (!context) context = new Ctor();
	if (context.state === 'suspended') void context.resume();
	return context;
}

type Tone = {
	f: number;
	at: number;
	dur: number;
	gain?: number;
	type?: OscillatorType;
	slideTo?: number;
};

type Noise = {
	noise: true;
	at: number;
	dur: number;
	gain?: number;
	freq?: number;
	sweepTo?: number;
	q?: number;
};

type Voice = Tone | Noise;

/**
 * A tiny hand-rolled palette. Everything is either a sine/triangle note or a
 * filtered noise burst, so the whole site ships zero audio files and every
 * effect stays under a few hundred milliseconds.
 */
const SOUNDS: Record<string, Voice[]> = {
	/** Default: every link and button gets this soft papery tick. */
	tap: [
		{ noise: true, at: 0, dur: 0.035, gain: 0.02, freq: 2600, q: 0.9 },
		{ f: 880, at: 0, dur: 0.055, gain: 0.014, type: 'triangle', slideTo: 660 }
	],
	press: [
		{ noise: true, at: 0, dur: 0.05, gain: 0.026, freq: 1800, sweepTo: 900, q: 1.1 },
		{ f: 520, at: 0, dur: 0.09, gain: 0.02, type: 'triangle', slideTo: 392 }
	],
	select: [
		{ f: 659.25, at: 0, dur: 0.12, gain: 0.03 },
		{ f: 987.77, at: 0.045, dur: 0.16, gain: 0.022, type: 'triangle' }
	],
	remove: [
		{ f: 587.33, at: 0, dur: 0.1, gain: 0.028 },
		{ f: 392, at: 0.05, dur: 0.16, gain: 0.022, type: 'triangle' }
	],
	pluck: [
		{ f: 740, at: 0, dur: 0.16, gain: 0.05 },
		{ f: 1108, at: 0.03, dur: 0.14, gain: 0.03, type: 'triangle' }
	],
	send: [
		{ f: 523.25, at: 0, dur: 0.22, gain: 0.05 },
		{ f: 659.25, at: 0.09, dur: 0.24, gain: 0.05 },
		{ f: 783.99, at: 0.18, dur: 0.34, gain: 0.055 },
		{ f: 1046.5, at: 0.29, dur: 0.38, gain: 0.035, type: 'triangle' }
	],
	open: [
		{ f: 392, at: 0, dur: 0.3, gain: 0.045 },
		{ f: 523.25, at: 0.12, dur: 0.34, gain: 0.045 },
		{ f: 659.25, at: 0.24, dur: 0.4, gain: 0.04 }
	],
	toggle: [
		{ f: 880, at: 0, dur: 0.12, gain: 0.035 },
		{ f: 1320, at: 0.06, dur: 0.16, gain: 0.025, type: 'triangle' }
	],
	/** Paper rustle for resets, downloads and anything that moves a card. */
	paper: [
		{ noise: true, at: 0, dur: 0.18, gain: 0.035, freq: 1500, sweepTo: 700, q: 0.7 },
		{ noise: true, at: 0.06, dur: 0.12, gain: 0.02, freq: 2400, sweepTo: 1200, q: 0.8 }
	],
	/** Page change: a breath, not a jingle. */
	page: [
		{ noise: true, at: 0, dur: 0.16, gain: 0.022, freq: 900, sweepTo: 1800, q: 0.6 },
		{ f: 587.33, at: 0.02, dur: 0.18, gain: 0.02, type: 'triangle' },
		{ f: 880, at: 0.09, dur: 0.22, gain: 0.016, type: 'triangle' }
	],
	pop: [
		{ f: 1046.5, at: 0, dur: 0.08, gain: 0.03, slideTo: 1568 }
	],
	success: [
		{ f: 659.25, at: 0, dur: 0.14, gain: 0.035 },
		{ f: 880, at: 0.06, dur: 0.16, gain: 0.03 },
		{ f: 1174.66, at: 0.12, dur: 0.28, gain: 0.026, type: 'triangle' }
	],
	error: [
		{ f: 233.08, at: 0, dur: 0.16, gain: 0.032, type: 'triangle' },
		{ f: 174.61, at: 0.08, dur: 0.24, gain: 0.028, type: 'triangle' }
	],
	sparkle: [
		{ f: 1318.51, at: 0, dur: 0.1, gain: 0.022, type: 'triangle' },
		{ f: 1760, at: 0.05, dur: 0.1, gain: 0.018, type: 'triangle' },
		{ f: 2093, at: 0.1, dur: 0.12, gain: 0.014, type: 'triangle' },
		{ f: 2637.02, at: 0.15, dur: 0.2, gain: 0.01, type: 'sine' }
	],
	/** Keystrokes. Deliberately almost inaudible. */
	key: [
		{ noise: true, at: 0, dur: 0.014, gain: 0.012, freq: 3200, q: 1.4 },
		{ f: 1600, at: 0, dur: 0.03, gain: 0.006, type: 'triangle' }
	]
};

let noiseBuffer: AudioBuffer | null = null;

function getNoise(ctx: AudioContext): AudioBuffer {
	if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
	const length = Math.floor(ctx.sampleRate * 0.5);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
	noiseBuffer = buffer;
	return buffer;
}

export function playSound(kind: keyof typeof SOUNDS | string) {
	if (!getSoundOn()) return;
	const ctx = audio();
	if (!ctx) return;
	const voices = SOUNDS[kind];
	if (!voices) return;

	const now = ctx.currentTime;
	for (const voice of voices) {
		if ('noise' in voice) {
			const source = ctx.createBufferSource();
			source.buffer = getNoise(ctx);
			const filter = ctx.createBiquadFilter();
			filter.type = 'bandpass';
			filter.Q.value = voice.q ?? 0.8;
			const start = now + voice.at;
			const freq = voice.freq ?? 1400;
			filter.frequency.setValueAtTime(freq, start);
			if (voice.sweepTo) filter.frequency.exponentialRampToValueAtTime(voice.sweepTo, start + voice.dur);

			const gain = ctx.createGain();
			const peak = voice.gain ?? 0.03;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.dur);

			source.connect(filter);
			filter.connect(gain);
			gain.connect(ctx.destination);
			source.start(start);
			source.stop(start + voice.dur + 0.02);
			continue;
		}

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = voice.type ?? 'sine';
		const start = now + voice.at;
		osc.frequency.setValueAtTime(voice.f, start);
		if (voice.slideTo) {
			osc.frequency.exponentialRampToValueAtTime(voice.slideTo, start + voice.dur);
		}
		const peak = voice.gain ?? 0.04;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(start);
		osc.stop(start + voice.dur + 0.02);
	}
}
