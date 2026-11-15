import { SITE_URL } from '$lib/blog/site';
import { getPublishedPosts } from '$lib/server/blog';

export const prerender = true;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function GET() {
	const posts = getPublishedPosts();
	const fixed = ['/', '/create', '/tutorial', '/blog', '/blog/rss.xml'];
	const urls = [
		...fixed.map((path) => `\t<url><loc>${escapeXml(new URL(path, SITE_URL).href)}</loc></url>`),
		...posts.map(
			(post) =>
				`\t<url><loc>${escapeXml(new URL(`/blog/${post.slug}`, SITE_URL).href)}</loc><lastmod>${post.publishedAt}</lastmod></url>`
		)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
