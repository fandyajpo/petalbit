export type BouquetPaper = {
	id: string;
	name: string;
	description: string;
	paperImage: string;
	frontImage: string;
	/** Small picker image. Falls back to paperImage when absent. */
	swatchImage?: string;
	/** Ribbon artwork; falls back to the blush ribbon when absent. */
	ribbonImage?: string;
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
		swatchImage: '/art/thumbs/bouquet-paper.png',
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
		swatchImage: '/art/thumbs/bouquet-paper.png',
		ribbonImage: '/art/bouquet-ribbon-gold.png',
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
		swatchImage: '/art/thumbs/bouquet-paper.png',
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
		swatchImage: '/art/thumbs/bouquet-paper.png',
		ribbonImage: '/art/bouquet-ribbon-sage.png',
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
		swatchImage: '/art/thumbs/bouquet-paper.png',
		ribbon: false,
		layout: {
			paperScale: 1.08,
			paperY: 10,
			frontScale: 1.02,
			frontY: 12,
			hideFront: false,
			filter: 'sepia(0.45) saturate(1.15) hue-rotate(320deg) brightness(1.01)'
		}
	},
	{
		id: 'yellow',
		name: 'Yellow Paper',
		description: 'Warm butter-yellow wrap, like morning sun on paper.',
		paperImage: '/art/bouquet-paper-yellow.png',
		frontImage: '/art/bouquet-paper-front-yellow.png',
		swatchImage: '/art/thumbs/bouquet-paper-yellow.png',
		ribbonImage: '/art/bouquet-ribbon-gold.png',
		ribbon: true
	},
	{
		id: 'blue',
		name: 'Blue Paper',
		description: 'Soft sky-blue wrap for a calmer bouquet.',
		paperImage: '/art/bouquet-paper-blue.png',
		frontImage: '/art/bouquet-paper-front-blue.png',
		swatchImage: '/art/thumbs/bouquet-paper-blue.png',
		ribbonImage: '/art/bouquet-ribbon-cream.png',
		ribbon: true
	},
	{
		id: 'red-polka-dot',
		name: 'Red Polka Dot',
		description: 'Red dots on cream — playful, a little bit retro.',
		paperImage: '/art/bouquet-paper-red-polka-dot.png',
		frontImage: '/art/bouquet-paper-front-red-polka-dot.png',
		swatchImage: '/art/thumbs/bouquet-paper-red-polka-dot.png',
		ribbon: false
	},
	{
		id: 'black',
		name: 'Black Paper',
		description: 'Moody charcoal wrap, like ink on vellum.',
		paperImage: '/art/bouquet-paper-black.png',
		frontImage: '/art/bouquet-paper-front-black.png',
		swatchImage: '/art/thumbs/bouquet-paper-black.png',
		ribbonImage: '/art/bouquet-ribbon-gold.png',
		ribbon: true
	},
	{
		id: 'kraft',
		name: 'Kraft Paper',
		description: 'Rough recycled brown paper, tied by hand.',
		paperImage: '/art/bouquet-paper-kraft.png',
		frontImage: '/art/bouquet-paper-front-kraft.png',
		swatchImage: '/art/thumbs/bouquet-paper-kraft.png',
		ribbonImage: '/art/bouquet-ribbon-cream.png',
		ribbon: true
	},
	{
		id: 'pearl',
		name: 'Pearl Paper',
		description: 'Pale pearl paper with a soft, glossy sheen.',
		paperImage: '/art/bouquet-paper-pearl.png',
		frontImage: '/art/bouquet-paper-front-pearl.png',
		swatchImage: '/art/thumbs/bouquet-paper-pearl.png',
		ribbonImage: '/art/bouquet-ribbon-gold.png',
		ribbon: true
	},
	{
		id: 'striped',
		name: 'Striped Paper',
		description: 'Sage stripes on cream, wrapped neat as a ribbon box.',
		paperImage: '/art/bouquet-paper-striped.png',
		frontImage: '/art/bouquet-paper-front-striped.png',
		swatchImage: '/art/thumbs/bouquet-paper-striped.png',
		ribbonImage: '/art/bouquet-ribbon-sage.png',
		ribbon: true
	},
	{
		id: 'gingham',
		name: 'Gingham Paper',
		description: 'Picnic gingham in soft rose on cream.',
		paperImage: '/art/bouquet-paper-gingham.png',
		frontImage: '/art/bouquet-paper-front-gingham.png',
		swatchImage: '/art/thumbs/bouquet-paper-gingham.png',
		ribbonImage: '/art/bouquet-ribbon-cream.png',
		ribbon: true
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