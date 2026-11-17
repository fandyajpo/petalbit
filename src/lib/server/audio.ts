/**
 * Minimal MP3 header reader. The client says how long its clip is, but the
 * server should not trust that, so duration is derived from the CBR frame
 * header. Anything that is not Layer III returns null.
 */

const BITRATES_MPEG1_LAYER3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_MPEG2_LAYER3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = {
	3: [44100, 48000, 32000],
	2: [22050, 24000, 16000],
	0: [11025, 12000, 8000]
};

export type Mp3Info = { duration: number; bitrate: number; sampleRate: number };

export function readMp3Info(bytes: Uint8Array): Mp3Info | null {
	if (bytes.length < 8) return null;

	let offset = 0;
	if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
		const size =
			((bytes[6] & 0x7f) << 21) |
			((bytes[7] & 0x7f) << 14) |
			((bytes[8] & 0x7f) << 7) |
			(bytes[9] & 0x7f);
		offset = 10 + size + (bytes[5] & 0x10 ? 10 : 0);
	}

	let frameStart = -1;
	const scanEnd = Math.min(bytes.length - 4, offset + 8192);
	for (let i = offset; i < scanEnd; i += 1) {
		if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
			frameStart = i;
			break;
		}
	}
	if (frameStart < 0) return null;

	const header1 = bytes[frameStart + 1];
	const header2 = bytes[frameStart + 2];
	const versionBits = (header1 >> 3) & 0x03;
	const layerBits = (header1 >> 1) & 0x03;
	if (versionBits === 1 || layerBits !== 1) return null;

	const bitrateIndex = (header2 >> 4) & 0x0f;
	const sampleIndex = (header2 >> 2) & 0x03;
	if (bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return null;

	const bitrate = (versionBits === 3 ? BITRATES_MPEG1_LAYER3 : BITRATES_MPEG2_LAYER3)[bitrateIndex];
	const sampleRate = SAMPLE_RATES[versionBits]?.[sampleIndex];
	if (!bitrate || !sampleRate) return null;

	const audioBytes = bytes.length - frameStart;
	return { duration: (audioBytes * 8) / (bitrate * 1000), bitrate, sampleRate };
}