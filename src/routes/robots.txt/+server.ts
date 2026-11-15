import { SITE_URL } from '$lib/blog/site';

export const prerender = true;

export function GET() {
	const body = `User-agent: *\nAllow: /\nDisallow: /b/\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
