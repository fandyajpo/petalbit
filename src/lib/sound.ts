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

type Note = { f: number; at: number; dur: number; gain?: number; type?: OscillatorType };

const SOUNDS: Record<string, Note[]> = {
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
	]
};

export function playSound(kind: keyof typeof SOUNDS | string) {
	if (!getSoundOn()) return;
	const ctx = audio();
	if (!ctx) return;
	const notes = SOUNDS[kind];
	if (!notes) return;

	const now = ctx.currentTime;
	for (const note of notes) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = note.type ?? 'sine';
		osc.frequency.value = note.f;
		const start = now + note.at;
		const peak = note.gain ?? 0.04;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(start);
		osc.stop(start + note.dur + 0.02);
	}
}
