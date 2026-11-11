/**
 * Flower catalog.
 *
 * Presentation only reads from this file, so new flowers can be added (or
 * replaced with the final commissioned artwork) without touching the UI.
 * Artwork lives in /static/art/flowers/{id}.png — swap the `image` path when
 * the production assets are ready.
 */
export type Flower = {
	id: string;
	name: string;
	latin: string;
	description: string;
	image: string;
	/** Short label shown on the card. */
	tone: string;
	/** How many times one bouquet may use this flower. */
	maxPerBouquet: number;
	/** Flip to false to show the flower as unavailable without deleting it. */
	available: boolean;
	/** Optional note for placeholder artwork. */
	placeholder?: boolean;
};

export const MAX_BOUQUET_FLOWERS = 7;

export const FLOWERS: Flower[] = [
	{
		id: 'mawar',
		name: 'Rose',
		latin: 'Rosa',
		description: 'Layered and warm. For when words are lowkey not enough.',
		image: '/art/flowers/mawar.png',
		tone: 'classic',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'peony',
		name: 'Peony',
		latin: 'Paeonia',
		description: 'Big, soft, and cozy. Like a hug that showed up right on time.',
		image: '/art/flowers/peony.png',
		tone: 'romantic',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'tulip',
		name: 'Tulip',
		latin: 'Tulipa',
		description: 'Clean and chill, perfect for a sweet, simple shoutout.',
		image: '/art/flowers/tulip.png',
		tone: 'soft',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'daisy',
		name: 'Daisy',
		latin: 'Leucanthemum',
		description: 'Bright white with a sunny core. Always serving good vibes.',
		image: '/art/flowers/daisy.png',
		tone: 'cheerful',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'matahari',
		name: 'Sunflower',
		latin: 'Helianthus',
		description: 'Big energy for someone who lights up the room, no cap.',
		image: '/art/flowers/matahari.png',
		tone: 'sunny',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'bakung',
		name: 'Lily',
		latin: 'Lilium',
		description: 'Elegant and graceful, a whole mood of hope and respect.',
		image: '/art/flowers/bakung.png',
		tone: 'elegant',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'anggrek',
		name: 'Orchid',
		latin: 'Phalaenopsis',
		description: 'Extra in the best way. For admiration that speaks for itself.',
		image: '/art/flowers/anggrek.png',
		tone: 'luxe',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'iris',
		name: 'Iris',
		latin: 'Iris',
		description: 'Bold and artsy, standing tall with main character energy.',
		image: '/art/flowers/iris.png',
		tone: 'bold',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'lavender',
		name: 'Lavender',
		latin: 'Lavandula',
		description: 'Calm and soothing, the vibe that just sticks with you.',
		image: '/art/flowers/lavender.png',
		tone: 'chill',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'eukaliptus',
		name: 'Eucalyptus',
		latin: 'Eucalyptus',
		description: 'Fresh silver greens that make the whole bouquet pop.',
		image: '/art/flowers/eukaliptus.png',
		tone: 'greenery',
		maxPerBouquet: 1,
		available: true
	}
];

export const FLOWER_IDS = FLOWERS.map((flower) => flower.id);

const BY_ID = new Map(FLOWERS.map((flower) => [flower.id, flower]));

export function getFlower(id: string): Flower | undefined {
	return BY_ID.get(id);
}

export function isFlowerId(id: string): boolean {
	return BY_ID.has(id);
}

/** Curated arrangements used when nothing has been picked yet. */
export const STARTER_BOUQUETS: { label: string; flowers: string[] }[] = [
	{ label: 'Romantic', flowers: ['mawar', 'peony', 'anggrek', 'tulip', 'eukaliptus'] },
	{ label: 'Sunny', flowers: ['matahari', 'daisy', 'mawar', 'eukaliptus'] },
	{ label: 'Soft', flowers: ['peony', 'bakung', 'iris', 'lavender'] }
];

export const DEFAULT_BOUQUET = ['mawar', 'peony', 'tulip', 'daisy', 'eukaliptus'];
