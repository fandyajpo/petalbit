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
		name: 'Mawar',
		latin: 'Rosa',
		description: 'Berlapis dan hangat. Untuk pesan yang tidak perlu banyak kata.',
		image: '/art/flowers/mawar.png',
		tone: 'klasik',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'peony',
		name: 'Peony',
		latin: 'Paeonia',
		description: 'Rimbun dan lembut, seperti pelukan yang datang tepat waktu.',
		image: '/art/flowers/peony.png',
		tone: 'romantis',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'tulip',
		name: 'Tulip',
		latin: 'Tulipa',
		description: 'Ramping dan tenang, cocok untuk ucapan yang manis dan sederhana.',
		image: '/art/flowers/tulip.png',
		tone: 'lembut',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'daisy',
		name: 'Daisy',
		latin: 'Leucanthemum',
		description: 'Putih bersih dengan mata keemasan. Selalu terlihat ceria.',
		image: '/art/flowers/daisy.png',
		tone: 'ceria',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'matahari',
		name: 'Matahari',
		latin: 'Helianthus',
		description: 'Besar dan penuh energi, untuk seseorang yang selalu menerangi.',
		image: '/art/flowers/matahari.png',
		tone: 'hangat',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'bakung',
		name: 'Bakung',
		latin: 'Lilium',
		description: 'Elegan dengan wangi lembut, simbol harapan dan rasa hormat.',
		image: '/art/flowers/bakung.png',
		tone: 'elegan',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'anggrek',
		name: 'Anggrek',
		latin: 'Phalaenopsis',
		description: 'Mewah tanpa berlebihan. Untuk rasa kagum yang tak perlu dijelaskan.',
		image: '/art/flowers/anggrek.png',
		tone: 'mewah',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'iris',
		name: 'Iris',
		latin: 'Iris',
		description: 'Tegak dan berani, dengan tiga kelopak yang menunduk pelan.',
		image: '/art/flowers/iris.png',
		tone: 'anggun',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'lavender',
		name: 'Lavender',
		latin: 'Lavandula',
		description: 'Tenang dan menenangkan, wanginya menempel lama di ingatan.',
		image: '/art/flowers/lavender.png',
		tone: 'tenang',
		maxPerBouquet: 1,
		available: true
	},
	{
		id: 'eukaliptus',
		name: 'Eukaliptus',
		latin: 'Eucalyptus',
		description: 'Dedaunan perak yang membuat buket terasa lebih hidup.',
		image: '/art/flowers/eukaliptus.png',
		tone: 'dedaunan',
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
	{ label: 'Romantis', flowers: ['mawar', 'peony', 'anggrek', 'tulip', 'eukaliptus'] },
	{ label: 'Hangat', flowers: ['matahari', 'daisy', 'mawar', 'eukaliptus'] },
	{ label: 'Lembut', flowers: ['peony', 'bakung', 'iris', 'lavender'] }
];

export const DEFAULT_BOUQUET = ['mawar', 'peony', 'tulip', 'daisy', 'eukaliptus'];
