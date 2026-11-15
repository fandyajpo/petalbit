import { marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
	BLOG_CATEGORIES,
	resolveCategory,
	type BlogCategory,
	type BlogCategoryId
} from '$lib/blog/categories';
import type { BlogPost, BlogSummary, TableOfContentsItem } from '$lib/blog/types';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

const frontmatterSchema = z.object({
	title: z.string().trim().min(8).max(120),
	slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	description: z.string().trim().min(50).max(220),
	category: z.string().trim().min(1),
	publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	author: z.string().trim().min(2).max(80).default('Petalbit Editorial'),
	coverImage: z.string().startsWith('/images/blog/').endsWith('.webp'),
	coverImageAlt: z.string().trim().min(12).max(180),
	featured: z.boolean().default(false),
	draft: z.boolean().default(false),
	keywords: z.array(z.string().trim().min(2)).min(3).max(12),
	seoTitle: z.string().trim().min(12).max(70),
	seoDescription: z.string().trim().min(80).max(170),
	related: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(5).default([]),
	readingTime: z.number().int().positive().max(30).optional()
});

type ParsedFrontmatter = z.infer<typeof frontmatterSchema>;

type ParsedArticle = BlogPost & {
	draft: boolean;
	related: string[];
};

const rawFiles = import.meta.glob('/content/blog/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

marked.setOptions({
	gfm: true,
	breaks: false
});

function decodeEntities(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function headingId(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function addHeadingAnchors(html: string): { html: string; toc: TableOfContentsItem[] } {
	const toc: TableOfContentsItem[] = [];
	const seen = new Map<string, number>();

	const withIds = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, rawDepth, inner) => {
		const depth = Number(rawDepth) as 2 | 3;
		const text = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
		const base = headingId(text) || `section-${toc.length + 1}`;
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		const id = count === 0 ? base : `${base}-${count + 1}`;
		toc.push({ id, text, depth });
		return `<h${depth} id="${id}">${inner}<a class="heading-anchor" href="#${id}" aria-label="Link to ${escapeAttribute(text)}">#</a></h${depth}>`;
	});

	return { html: withIds, toc };
}

function countWords(markdown: string): number {
	const text = markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[#>*_`~-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (!text) return 0;
	return text.split(' ').length;
}

function formatDate(isoDate: string): string {
	return new Intl.DateTimeFormat('en', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${isoDate}T00:00:00Z`));
}

function validateDate(value: string): boolean {
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseArticle(file: string, raw: string): ParsedArticle {
	const match = raw.match(FRONTMATTER);
	if (!match) {
		throw new Error(`[blog] ${file} is missing YAML frontmatter.`);
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(match[1]);
	} catch (error) {
		throw new Error(`[blog] ${file} has invalid YAML: ${(error as Error).message}`);
	}

	const result = frontmatterSchema.safeParse(parsed);
	if (!result.success) {
		const issues = result.error.issues
			.map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
			.join('; ');
		throw new Error(`[blog] ${file} has invalid frontmatter: ${issues}`);
	}

	const data: ParsedFrontmatter = result.data;
	const category = resolveCategory(data.category);
	if (!category) {
		throw new Error(
			`[blog] ${file} uses unknown category "${data.category}". Use one of: ${BLOG_CATEGORIES.map((item) => item.title).join(', ')}.`
		);
	}

	if (!validateDate(data.publishedAt)) {
		throw new Error(`[blog] ${file} has an invalid publishedAt date.`);
	}

	const filenameSlug = file.split('/').pop()?.replace(/\.md$/, '');
	if (filenameSlug !== data.slug) {
		throw new Error(`[blog] ${file} slug "${data.slug}" must match its filename.`);
	}

	const body = match[2].trim();
	const coverStem = data.coverImage.replace(/\.webp$/, '');
	const coverSrcset = [
		`${coverStem}-400.webp 400w`,
		`${coverStem}-600.webp 600w`,
		`${coverStem}-900.webp 900w`,
		`${data.coverImage} 1200w`
	].join(', ');
	const wordCount = countWords(body);
	const readingTime = data.readingTime ?? Math.max(1, Math.ceil(wordCount / 225));
	const rendered = marked.parse(body) as string;
	const { html, toc } = addHeadingAnchors(rendered);

	return {
		slug: data.slug,
		title: data.title,
		description: data.description,
		category,
		publishedAt: data.publishedAt,
		displayDate: formatDate(data.publishedAt),
		author: data.author,
		coverImage: data.coverImage,
		coverSrcset,
		cardImage: `${coverStem}-600.webp`,
		socialImage: `${coverStem}-og.png`,
		coverImageAlt: data.coverImageAlt,
		featured: data.featured,
		keywords: data.keywords,
		seoTitle: data.seoTitle,
		seoDescription: data.seoDescription,
		readingTime,
		wordCount,
		html,
		toc,
		draft: data.draft,
		related: data.related
	};
}

const articles = Object.entries(rawFiles)
	.map(([file, raw]) => parseArticle(file, raw))
	.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const slugSet = new Set<string>();
for (const article of articles) {
	if (slugSet.has(article.slug)) {
		throw new Error(`[blog] Duplicate slug "${article.slug}".`);
	}
	slugSet.add(article.slug);
}

const published = articles.filter((article) => !article.draft);

function toSummary(article: ParsedArticle): BlogSummary {
	const { html: _html, toc: _toc, draft: _draft, related: _related, ...summary } = article;
	return summary;
}

export function getPublishedPosts(): BlogSummary[] {
	return published.map(toSummary);
}

export function getFeaturedPost(posts: BlogSummary[] = getPublishedPosts()): BlogSummary | undefined {
	return posts.find((post) => post.featured) ?? posts[0];
}

function toPost(article: ParsedArticle): BlogPost {
	const { draft: _draft, related: _related, ...post } = article;
	return post;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
	const article = published.find((item) => item.slug === slug);
	return article ? toPost(article) : undefined;
}

export function getPublishedArticles(): BlogPost[] {
	return published.map(toPost);
}

export function getCategoryCounts(): Record<BlogCategoryId, number> {
	const counts = Object.fromEntries(BLOG_CATEGORIES.map((category) => [category.id, 0])) as Record<
		BlogCategoryId,
		number
	>;
	for (const post of published) counts[post.category.id] += 1;
	return counts;
}

export function getCategoriesWithCounts(): Array<BlogCategory & { count: number }> {
	const counts = getCategoryCounts();
	return BLOG_CATEGORIES.map((category) => ({ ...category, count: counts[category.id] }));
}

export function filterPostsByCategory(
	categoryId: BlogCategoryId | null,
	posts: BlogSummary[] = getPublishedPosts()
): BlogSummary[] {
	if (!categoryId) return posts;
	return posts.filter((post) => post.category.id === categoryId);
}

export function getRelatedPosts(slug: string, limit = 3): BlogSummary[] {
	const article = published.find((post) => post.slug === slug);
	if (!article) return [];

	const scores = new Map<string, number>();
	for (const candidate of published) {
		if (candidate.slug === slug) continue;
		let score = 0;
		if (article.related.includes(candidate.slug)) score += 10;
		if (candidate.related.includes(slug)) score += 4;
		if (candidate.category.id === article.category.id) score += 5;

		const keywordMatches = candidate.keywords.filter((keyword) =>
			article.keywords.some((item) => item.toLowerCase() === keyword.toLowerCase())
		).length;
		score += keywordMatches * 1.5;
		scores.set(candidate.slug, score);
	}

	return published
		.filter((post) => post.slug !== slug)
		.sort((a, b) => {
			const score = (scores.get(b.slug) ?? 0) - (scores.get(a.slug) ?? 0);
			return score !== 0 ? score : b.publishedAt.localeCompare(a.publishedAt);
		})
		.slice(0, limit)
		.map(toSummary);
}
