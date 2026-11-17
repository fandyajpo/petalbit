export type StemLayer = 'auto' | 'front' | 'back';

export type VoiceNote = {
	/** Pinata/IPFS content id. */
	cid: string;
	url: string;
	/** Length in seconds, at most 10. */
	duration: number;
	/** Normalised waveform peaks (0..1), for the themed player scrubber. */
	peaks?: number[];
};

export type Bouquet = {
	id: string;
	sender: string;
	recipient: string;
	message: string;
	flowers: string[];
	/** Optional per-stem depth overrides, parallel to `flowers`. */
	layers?: StemLayer[];
	/** Optional wrap style; defaults to the first bouquet paper when missing. */
	paper?: string;
	/** Optional animated backdrop; defaults to the first background when missing. */
	background?: string;
	/** Optional audio note, pinned to IPFS and capped at 10 seconds. */
	voice?: VoiceNote;
	createdAt: string;
};

/** Every bouquet lives for exactly seven days. */
export const BOUQUET_TTL_SECONDS = 604_800;

export const fieldLimits = {
	sender: { min: 2, max: 32 },
	recipient: { min: 2, max: 32 },
	message: { min: 3, max: 500 }
} as const;
