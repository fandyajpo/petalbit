export type BouquetPaper = {
	id: string;
	name: string;
	description: string;
	paperImage: string;
	frontImage: string;
	ribbon?: boolean;
	/** Optional visual treatment applied to the wrap layers. */
	filter?: string;
};

export const BOUQUET_PAPERS: BouquetPaper[] = [
	{
		id: 'classic',
		name: 'Classic',
		description: 'Warm kraft wrap, soft and timeless.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true
	},
	{
		id: 'blush',
		name: 'Blush',
		description: 'A rosy tint for extra sweet vibes.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		filter: 'hue-rotate(-18deg) saturate(1.08) brightness(1.03)'
	},
	{
		id: 'sage',
		name: 'Sage',
		description: 'A calm green touch, fresh and chill.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		filter: 'hue-rotate(70deg) saturate(0.9) brightness(1.02)'
	},
	{
		id: 'lilac',
		name: 'Lilac',
		description: 'Soft purple mood, dreamy and cute.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		filter: 'hue-rotate(210deg) saturate(1.05) brightness(1.03)'
	}
];

export const DEFAULT_BOUQUET_PAPER = BOUQUET_PAPERS[0].id;
export const PAPER_IDS = BOUQUET_PAPERS.map((paper) => paper.id);

const BY_ID = new Map(BOUQUET_PAPERS.map((paper) => [paper.id, paper]));

export function getBouquetPaper(id?: string | null): BouquetPaper {
	if (id && BY_ID.has(id)) return BY_ID.get(id)!;
	return BOUQUET_PAPERS[0];
}

export function isBouquetPaperId(id: string): boolean {
	return BY_ID.has(id);
}
