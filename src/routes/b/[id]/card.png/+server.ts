import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cacheImage, getBouquet, getCachedImage } from '$lib/server/bouquet-store';
import { bouquetIdSchema } from '$lib/validation';
import { BOUQUET_TTL_SECONDS } from '$lib/types';
import { renderBouquetOg } from '$lib/server/og-image';
import { RATE_LIMITS, rateLimit, requestIp } from '$lib/server/rate-limit';

export const GET: RequestHandler = async ({ params, url, request }) => {
	const limited = rateLimit(
		`card:${requestIp(request)}`,
		RATE_LIMITS.card.limit,
		RATE_LIMITS.card.windowMs
	);
	if (!limited.allowed) {
		return new Response('Too many card downloads.', {
			status: 429,
			headers: { 'retry-after': String(limited.retryAfter) }
		});
	}

	const parsed = bouquetIdSchema.safeParse(params.id);
	if (!parsed.success) throw error(404, 'Bouquet not found');

	let bouquet;
	try {
		bouquet = await getBouquet(parsed.data);
	} catch (cause) {
		console.error('[petalbit] failed to read bouquet for card', cause);
		throw error(503, 'Bouquet unavailable');
	}
	if (!bouquet) throw error(404, 'Bouquet not found');

	// Same deterministic render as the og image, so it is cached the same way.
	const remaining = Math.max(
		60,
		Math.floor((Date.parse(bouquet.createdAt) + BOUQUET_TTL_SECONDS * 1000 - Date.now()) / 1000)
	);
	const cacheKey = `card:${bouquet.id}`;

	let png = await getCachedImage(cacheKey);
	if (!png) {
		try {
			png = await renderBouquetOg(bouquet, url.origin, { includeMessage: true });
		} catch (cause) {
			console.error('[petalbit] failed to render bouquet card', cause);
			throw error(500, 'Could not render this bouquet card');
		}
		void cacheImage(cacheKey, png, Math.min(remaining, 300));
	}

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'content-disposition': 'attachment; filename="petalbit-card.png"',
			'cache-control': 'private, max-age=300'
		}
	});
};
