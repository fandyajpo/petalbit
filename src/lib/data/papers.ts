export type BouquetPaper = {
	id: string;
	name: string;
	description: string;
	paperImage: string;
	frontImage: string;
	ribbon?: boolean;
	/** Visual treatment for wrap layers (layout/design). */
	layout?: {
		paperScale?: number;
		paperX?: number;
		paperY?: number;
		paperRotate?: number;
		frontScale?: number;
		frontX?: number;
		frontY?: number;
		frontRotate?: number;
		filter?: string;
		shadow?: string;
		hideFront?: boolean;
		ribbonScale?: number;
		ribbonY?: number;
	};
};

export const BOUQUET_PAPERS: BouquetPaper[] = [
	{
		id: 'classic',
		name: 'Classic Fold',
		description: 'The OG wrap. Clean, centered, timeless.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		// Soft cream — the original wrap colour.
		layout: { filter: 'sepia(0.18) saturate(1.02) brightness(1.02)' }
	},
	{
		id: 'envelope',
		name: 'Envelope',
		description: 'Neat front fold with a cozy tucked look.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		layout: {
			paperScale: 1.02,
			paperY: 2,
			frontScale: 1.08,
			frontY: 4,
			paperRotate: -1.5,
			frontRotate: -1.5,
			filter: 'sepia(0.45) saturate(1.05) hue-rotate(300deg) brightness(0.98)',
			shadow: 'drop-shadow(0 10px 18px rgb(40 24 18 / 0.12))'
		}
	},
	{
		id: 'wide-fan',
		name: 'Wide Fan',
		description: 'Opened up wide so the blooms go full spread.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: false,
		layout: {
			paperScale: 1.14,
			paperY: 6,
			frontScale: 1.12,
			frontY: 8,
			paperRotate: 0,
			filter: 'sepia(0.4) saturate(0.85) hue-rotate(80deg) brightness(1.02)'
		}
	},
	{
		id: 'tall-cone',
		name: 'Tall Cone',
		description: 'A taller, snug wrap for a sleek silhouette.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: true,
		layout: {
			paperScale: 0.94,
			paperY: -4,
			frontScale: 0.96,
			frontY: -2,
			ribbonScale: 0.92,
			ribbonY: -2,
			filter: 'sepia(0.45) saturate(0.95) hue-rotate(240deg) brightness(1.02)'
		}
	},
	{
		id: 'petal-pop',
		name: 'Petal Pop',
		description: 'Low, open wrap so the flowers steal the show.',
		paperImage: '/art/bouquet-paper.png',
		frontImage: '/art/bouquet-paper-front.png',
		ribbon: false,
		layout: {
			paperScale: 1.08,
			paperY: 10,
			frontScale: 1.02,
			frontY: 12,
			hideFront: false,
			filter: 'sepia(0.45) saturate(1.15) hue-rotate(320deg) brightness(1.01)'
		}
	}
];

export const DEFAULT_BOUQUET_PAPER = BOUQUET_PAPERS[0].id;
export const PAPER_IDS = BOUQUET_PAPERS.map((paper) => paper.id);

const BY_ID = new Map(BOUQUET_PAPERS.map((paper) => [paper.id, paper]));

// Backward compatibility for previously saved color variants.
const LEGACY_ALIASES: Record<string, string> = {
	blush: 'envelope',
	sage: 'wide-fan',
	lilac: 'tall-cone',
	// Side Drift was retired; keep old bouquets opening in a familiar wrap.
	'side-drift': 'classic'
};

export function getBouquetPaper(id?: string | null): BouquetPaper {
	if (id && BY_ID.has(id)) return BY_ID.get(id)!;
	if (id && LEGACY_ALIASES[id] && BY_ID.has(LEGACY_ALIASES[id])) {
		return BY_ID.get(LEGACY_ALIASES[id])!;
	}
	return BOUQUET_PAPERS[0];
}

export function isBouquetPaperId(id: string): boolean {
	return BY_ID.has(id) || id in LEGACY_ALIASES;
}
