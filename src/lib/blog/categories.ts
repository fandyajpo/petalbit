export type BlogCategoryId =
	| 'flower-meanings'
	| 'romantic-expressions'
	| 'digital-gifting'
	| 'pixel-art';

export type BlogCategory = {
	id: BlogCategoryId;
	title: string;
	description: string;
};

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
	{
		id: 'flower-meanings',
		title: 'Flower Meanings',
		description:
			'Old symbols, regional differences, and the small botanical stories people have told for centuries.'
	},
	{
		id: 'romantic-expressions',
		title: 'Romantic Expressions',
		description:
			'Notes on saying the tender thing, missing someone well, and making affection feel specific.'
	},
	{
		id: 'digital-gifting',
		title: 'Digital Gifting',
		description:
			'What it means to send a flower across a screen, and why a small gesture can travel a long way.'
	},
	{
		id: 'pixel-art',
		title: 'Pixel Art & Creativity',
		description:
			'Tiny squares, limited palettes, and the surprising amount of feeling a few pixels can hold.'
	}
];

const byId = new Map(BLOG_CATEGORIES.map((category) => [category.id, category]));
const byTitle = new Map(
	BLOG_CATEGORIES.map((category) => [category.title.toLowerCase(), category])
);

export function getCategory(id: string): BlogCategory | undefined {
	return byId.get(id as BlogCategoryId);
}

export function resolveCategory(value: string): BlogCategory | undefined {
	return byId.get(value as BlogCategoryId) ?? byTitle.get(value.trim().toLowerCase());
}
