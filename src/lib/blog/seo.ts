import type { BlogSummary } from './types';
import { JOURNAL_DESCRIPTION, JOURNAL_NAME, SITE_NAME, SITE_URL, absoluteUrl } from './site';

export const DEFAULT_OG_IMAGE = '/images/blog/language-of-flowers-og.png';

export function canonical(path: string): string {
	return absoluteUrl(path);
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: absoluteUrl(item.path)
		}))
	};
}

export function blogPostingSchema(post: BlogSummary) {
	const url = absoluteUrl(`/blog/${post.slug}`);
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.seoDescription,
		image: [absoluteUrl(post.socialImage)],
		datePublished: post.publishedAt,
		dateModified: post.publishedAt,
		author: {
			'@type': 'Organization',
			name: post.author
		},
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			logo: {
				'@type': 'ImageObject',
				url: absoluteUrl('/art/logo-mark.png')
			}
		},
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': url
		},
		articleSection: post.category.title,
		keywords: post.keywords.join(', '),
		wordCount: post.wordCount,
		inLanguage: 'en',
		url
	};
}

export function blogSchema(posts: BlogSummary[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Blog',
		name: JOURNAL_NAME,
		description: JOURNAL_DESCRIPTION,
		url: absoluteUrl('/blog'),
		inLanguage: 'en',
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			logo: {
				'@type': 'ImageObject',
				url: absoluteUrl('/art/logo-mark.png')
			}
		},
		blogPost: posts.map((post) => ({
			'@type': 'BlogPosting',
			headline: post.title,
			url: absoluteUrl(`/blog/${post.slug}`),
			datePublished: post.publishedAt,
			image: absoluteUrl(post.socialImage)
		}))
	};
}

export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

export { SITE_URL };
