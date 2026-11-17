/**
 * Voice notes: a single optional 10-second clip, encoded to MP3 in the browser
 * so what leaves the device is already the final 128 kbps file.
 */

export const VOICE_MAX_SECONDS = 10;
export const VOICE_BITRATE_KBPS = 128;
/** 10s at 128 kbps is ~160 kB; leave room for MP3 framing overhead. */
export const VOICE_MAX_BYTES = 400_000;
export const VOICE_MIME = 'audio/mpeg';

export type VoiceClip = {
	blob: Blob;
	duration: number;
	/** 44 normalised peaks, for the little waveform in the recorder. */
	peaks: number[];
};

export function formatClipDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	return `0:${String(total).padStart(2, '0')}`;
}

export function supportsRecording(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof MediaRecorder !== 'undefined' &&
		typeof navigator !== 'undefined' &&
		typeof navigator.mediaDevices?.getUserMedia === 'function'
	);
}

/** Safari records mp4/aac, Chrome and Firefox prefer webm/opus. */
export function pickRecorderMime(): string | undefined {
	if (typeof MediaRecorder === 'undefined') return undefined;
	const candidates = [
		'audio/webm;codecs=opus',
		'audio/webm',
		'audio/mp4',
		'audio/mp4;codecs=mp4a.40.2',
		'audio/ogg;codecs=opus'
	];
	return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

function webkitAudioContext(): typeof AudioContext | undefined {
	return (
		window.AudioContext ??
		(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
	);
}

/**
 * Decode whatever the browser recorded, trim it to 10 seconds, mix to mono and
 * encode CBR 128 kbps MP3 with lamejs. The encoder is imported lazily so the
 * 31 kB gzip payload only loads once someone actually records.
 */
/** Copy encoder output into a plain ArrayBuffer the Blob constructor accepts. */
function toBuffer(bytes: Int8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer as ArrayBuffer;
}

export async function encodeVoiceNote(recording: Blob): Promise<VoiceClip> {
	const AudioCtor = webkitAudioContext();
	if (!AudioCtor) throw new Error('This browser cannot process audio.');

	const ctx = new AudioCtor();
	let buffer: AudioBuffer;
	try {
		buffer = await ctx.decodeAudioData(await recording.arrayBuffer());
	} finally {
		void ctx.close();
	}

	const sampleRate = buffer.sampleRate;
	const length = Math.min(buffer.length, Math.floor(sampleRate * VOICE_MAX_SECONDS));
	if (length < sampleRate * 0.4) throw new Error('That recording was too short.');

	const mono = new Float32Array(length);
	const channels = Math.min(buffer.numberOfChannels, 2);
	for (let c = 0; c < channels; c += 1) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < length; i += 1) mono[i] += data[i] / channels;
	}

	const pcm = new Int16Array(length);
	for (let i = 0; i < length; i += 1) {
		const sample = Math.max(-1, Math.min(1, mono[i]));
		pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
	}

	const barCount = 44;
	const block = Math.max(1, Math.floor(length / barCount));
	const peaks: number[] = [];
	for (let b = 0; b < barCount; b += 1) {
		let peak = 0;
		const start = b * block;
		const end = Math.min(length, start + block);
		for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(mono[i]));
		peaks.push(Math.max(0.12, Math.min(1, peak)));
	}

	const { Mp3Encoder } = await import('@_mehrad/lamejs');
	const encoder = new Mp3Encoder(1, sampleRate, VOICE_BITRATE_KBPS);
	const chunks: ArrayBuffer[] = [];
	const blockSize = 1152;
	for (let i = 0; i < length; i += blockSize) {
		const encoded = encoder.encodeBuffer(pcm.subarray(i, Math.min(i + blockSize, length)));
		if (encoded.length > 0) chunks.push(toBuffer(encoded));
	}
	const tail = encoder.flush();
	if (tail.length > 0) chunks.push(toBuffer(tail));

	return {
		blob: new Blob(chunks, { type: VOICE_MIME }),
		duration: length / sampleRate,
		peaks
	};
}
