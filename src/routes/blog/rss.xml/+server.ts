import { SITE_URL, JOURNAL_DESCRIPTION, JOURNAL_NAME } from '$lib/blog/site';
import { getPublishedArticles } from '$lib/server/blog';

export const prerender = true;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function cdata(value: string): string {
	return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function absolutizeLinks(html: string): string {
	return html.replace(/(href|src)="\/(?!\/)/g, `$1="${SITE_URL}/`);
}

function pubDate(date: string): string {
	return new Date(`${date}T00:00:00Z`).toUTCString();
}

export function GET() {
	const posts = getPublishedArticles();
	const feedUrl = `${SITE_URL}/blog/rss.xml`;
	const latest = posts[0]?.publishedAt ?? '2026-11-14';

	const items = posts
		.map((post) => {
			const url = `${SITE_URL}/blog/${post.slug}`;
			const image = `${SITE_URL}${post.socialImage}`;
			const content = `<p><img src="${escapeXml(image)}" alt="${escapeXml(post.coverImageAlt)}" width="1200" height="630" /></p>${absolutizeLinks(post.html)}`;

			return `\t\t<item>
\t\t\t<title>${escapeXml(post.title)}</title>
\t\t\t<link>${escapeXml(url)}</link>
\t\t\t<guid isPermaLink="true">${escapeXml(url)}</guid>
\t\t\t<pubDate>${pubDate(post.publishedAt)}</pubDate>
\t\t\t<category>${escapeXml(post.category.title)}</category>
\t\t\t<dc:creator>${escapeXml(post.author)}</dc:creator>
\t\t\t<description>${escapeXml(post.description)}</description>
\t\t\t<content:encoded>${cdata(content)}</content:encoded>
\t\t</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
\t<channel>
\t\t<title>${escapeXml(JOURNAL_NAME)}</title>
\t\t<link>${SITE_URL}/blog</link>
\t\t<description>${escapeXml(JOURNAL_DESCRIPTION)}</description>
\t\t<language>en</language>
\t\t<lastBuildDate>${pubDate(latest)}</lastBuildDate>
\t\t<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
\t</channel>
</rss>
`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
