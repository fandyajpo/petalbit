export type Bouquet = {
	id: string;
	sender: string;
	recipient: string;
	message: string;
	flowers: string[];
	/** Optional wrap style; defaults to the first bouquet paper when missing. */
	paper?: string;
	createdAt: string;
};

/** Every bouquet lives for exactly seven days. */
export const BOUQUET_TTL_SECONDS = 604_800;

export const fieldLimits = {
	sender: { min: 2, max: 32 },
	recipient: { min: 2, max: 32 },
	message: { min: 3, max: 280 }
} as const;
