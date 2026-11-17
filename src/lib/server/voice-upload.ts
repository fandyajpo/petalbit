import { readMp3Info } from '$lib/server/audio';
import { VOICE_MAX_BYTES, VOICE_MAX_SECONDS, VOICE_MIME } from '$lib/voice';

export type ValidatedVoice = {
	bytes: Uint8Array;
	duration: number;
	size: number;
};

export type VoiceCheck =
	| { ok: true; voice: ValidatedVoice }
	| { ok: false; status: number; message: string };

/**
 * Shared checks for an uploaded clip: type, size, magic bytes and the real
 * duration parsed from the MPEG frame header. Used before anything is pinned.
 */
export async function validateVoiceFile(file: File): Promise<VoiceCheck> {
	if (file.size === 0) {
		return { ok: false, status: 400, message: 'That voice note is empty.' };
	}
	if (file.size > VOICE_MAX_BYTES) {
		return { ok: false, status: 413, message: 'Voice notes can be at most 10 seconds.' };
	}
	if (file.type !== VOICE_MIME && file.type !== 'audio/mp3') {
		return { ok: false, status: 415, message: 'Voice notes must be MP3 audio.' };
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const info = readMp3Info(bytes);
	if (!info) {
		return { ok: false, status: 415, message: 'That file is not a readable MP3.' };
	}
	if (info.duration < 0.4) {
		return { ok: false, status: 400, message: 'That voice note is too short.' };
	}
	if (info.duration > VOICE_MAX_SECONDS + 0.6) {
		return { ok: false, status: 400, message: 'Voice notes can be at most 10 seconds.' };
	}

	return {
		ok: true,
		voice: {
			bytes,
			duration: Math.round(info.duration * 10) / 10,
			size: file.size
		}
	};
}
