export type BouquetBackground = {
	id: string;
	name: string;
	description: string;
	kind: 'flowery' | 'warp' | 'liquid' | 'wave' | 'rain' | 'cloudy';
};

export const BOUQUET_BACKGROUNDS: BouquetBackground[] = [
	{
		id: 'flowery',
		name: 'Flowery',
		description: 'Floating petals and soft bloom vibes.',
		kind: 'flowery'
	},
	{
		id: 'warp',
		name: 'Warp',
		description: 'Dreamy ribbons drifting in the back.',
		kind: 'warp'
	},
	{
		id: 'liquid',
		name: 'Liquid Water',
		description: 'Slow liquid blobs, super chill.',
		kind: 'liquid'
	},
	{
		id: 'wave',
		name: 'Water Wave',
		description: 'Gentle waves rolling behind the bouquet.',
		kind: 'wave'
	},
	{
		id: 'rain',
		name: 'Rain Vibe',
		description: 'Soft pixel rain with cozy mood.',
		kind: 'rain'
	},
	{
		id: 'cloudy',
		name: 'Cloudy',
		description: 'Puffy clouds floating by, lowkey calm.',
		kind: 'cloudy'
	}
];

export const DEFAULT_BOUQUET_BACKGROUND = BOUQUET_BACKGROUNDS[0].id;
export const BACKGROUND_IDS = BOUQUET_BACKGROUNDS.map((bg) => bg.id);

const BY_ID = new Map(BOUQUET_BACKGROUNDS.map((bg) => [bg.id, bg]));

export function getBouquetBackground(id?: string | null): BouquetBackground {
	if (id && BY_ID.has(id)) return BY_ID.get(id)!;
	return BOUQUET_BACKGROUNDS[0];
}

export function isBouquetBackgroundId(id: string): boolean {
	return BY_ID.has(id);
}
