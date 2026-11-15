import type { BlogCategory } from './categories';

export type TableOfContentsItem = {
	id: string;
	text: string;
	depth: 2 | 3;
};

export type BlogSummary = {
	slug: string;
	title: string;
	description: string;
	category: BlogCategory;
	publishedAt: string;
	displayDate: string;
	author: string;
	coverImage: string;
	coverSrcset: string;
	cardImage: string;
	socialImage: string;
	coverImageAlt: string;
	featured: boolean;
	keywords: string[];
	seoTitle: string;
	seoDescription: string;
	readingTime: number;
	wordCount: number;
};

export type BlogPost = BlogSummary & {
	html: string;
	toc: TableOfContentsItem[];
};
